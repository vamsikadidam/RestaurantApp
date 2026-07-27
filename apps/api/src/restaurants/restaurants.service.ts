import { Injectable, NotFoundException } from '@nestjs/common';
import { FulfillmentType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { resolveLocalTime } from '../common/utils/timezone.util';
import { UpdateLocationSettingsDto } from './dto/update-location-settings.dto';
import { UpdateHoursDto } from './dto/update-hours.dto';

export interface AvailabilityResult {
  isOpenNow: boolean;
  pickupAvailable: boolean;
  deliveryAvailable: boolean;
  reason?: string;
}

@Injectable()
export class RestaurantsService {
  constructor(private readonly prisma: PrismaService) {}

  async getRestaurant(restaurantId: string) {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: { id: restaurantId, deletedAt: null },
      include: {
        locations: {
          where: { deletedAt: null },
          orderBy: { isPrimary: 'desc' },
        },
      },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    return restaurant;
  }

  async getHours(restaurantId: string, locationId?: string) {
    const location = await this.resolveLocation(restaurantId, locationId);

    const hours = await this.prisma.restaurantHours.findMany({
      where: { restaurantLocationId: location.id },
      orderBy: { dayOfWeek: 'asc' },
    });

    return { locationId: location.id, hours };
  }

  async getAvailability(restaurantId: string, locationId?: string): Promise<AvailabilityResult> {
    const location = await this.resolveLocation(restaurantId, locationId);

    if (!location.isActive) {
      return {
        isOpenNow: false,
        pickupAvailable: false,
        deliveryAvailable: false,
        reason: 'This restaurant location is temporarily unavailable.',
      };
    }

    const hours = await this.prisma.restaurantHours.findMany({
      where: { restaurantLocationId: location.id },
    });

    const { dayOfWeek, minutesSinceMidnight } = resolveLocalTime(new Date(), location.timezone);
    const todaysHours = hours.filter((h) => h.dayOfWeek === dayOfWeek && !h.isClosed);

    const isOpenNow = todaysHours.some(
      (h) => minutesSinceMidnight >= h.opensAtMinutes && minutesSinceMidnight < h.closesAtMinutes,
    );

    if (!isOpenNow) {
      return {
        isOpenNow: false,
        pickupAvailable: false,
        deliveryAvailable: false,
        reason: 'This restaurant is currently closed. Please check the posted hours.',
      };
    }

    return {
      isOpenNow: true,
      pickupAvailable: location.pickupEnabled,
      deliveryAvailable: location.deliveryEnabled,
    };
  }

  async validateFulfillmentAvailable(
    restaurantId: string,
    fulfillmentType: FulfillmentType,
    locationId?: string,
  ): Promise<void> {
    const availability = await this.getAvailability(restaurantId, locationId);
    if (!availability.isOpenNow) {
      throw new NotFoundException(availability.reason ?? 'This restaurant is currently closed.');
    }
    if (fulfillmentType === FulfillmentType.PICKUP && !availability.pickupAvailable) {
      throw new NotFoundException('Pickup is not available for this restaurant right now.');
    }
    if (fulfillmentType === FulfillmentType.DELIVERY && !availability.deliveryAvailable) {
      throw new NotFoundException('Delivery is not available for this restaurant right now.');
    }
  }

  /** Admin/employee view of a location's settings, including hours - see Phase 6 admin portal. */
  async getLocationSettings(restaurantId: string, locationId: string) {
    const location = await this.prisma.restaurantLocation.findFirst({
      where: { id: locationId, restaurantId, deletedAt: null },
      include: { hours: { orderBy: { dayOfWeek: 'asc' } } },
    });
    if (!location) {
      throw new NotFoundException('Restaurant location not found');
    }
    return location;
  }

  async updateLocationSettings(
    restaurantId: string,
    locationId: string,
    dto: UpdateLocationSettingsDto,
    actorUserId: string,
  ) {
    const location = await this.prisma.restaurantLocation.findFirst({
      where: { id: locationId, restaurantId, deletedAt: null },
    });
    if (!location) {
      throw new NotFoundException('Restaurant location not found');
    }

    const updated = await this.prisma.restaurantLocation.update({
      where: { id: locationId },
      data: dto,
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId,
        actorRole: 'RESTAURANT_ADMIN',
        action: 'UPDATE_LOCATION_SETTINGS',
        entityType: 'RestaurantLocation',
        entityId: locationId,
        previousValue: JSON.parse(JSON.stringify(location)),
        newValue: JSON.parse(JSON.stringify(updated)),
      },
    });

    return updated;
  }

  async updateHours(
    restaurantId: string,
    locationId: string,
    dto: UpdateHoursDto,
    actorUserId: string,
  ) {
    const location = await this.prisma.restaurantLocation.findFirst({
      where: { id: locationId, restaurantId, deletedAt: null },
      include: { hours: true },
    });
    if (!location) {
      throw new NotFoundException('Restaurant location not found');
    }

    const updatedHours = await this.prisma.$transaction(async (tx) => {
      await tx.restaurantHours.deleteMany({ where: { restaurantLocationId: locationId } });
      if (dto.hours.length > 0) {
        await tx.restaurantHours.createMany({
          data: dto.hours.map((h) => ({
            restaurantLocationId: locationId,
            dayOfWeek: h.dayOfWeek,
            opensAtMinutes: h.opensAtMinutes,
            closesAtMinutes: h.closesAtMinutes,
            isClosed: h.isClosed,
          })),
        });
      }
      return tx.restaurantHours.findMany({
        where: { restaurantLocationId: locationId },
        orderBy: { dayOfWeek: 'asc' },
      });
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId,
        actorRole: 'RESTAURANT_ADMIN',
        action: 'UPDATE_HOURS',
        entityType: 'RestaurantLocation',
        entityId: locationId,
        previousValue: JSON.parse(JSON.stringify(location.hours)),
        newValue: JSON.parse(JSON.stringify(updatedHours)),
      },
    });

    return updatedHours;
  }

  private async resolveLocation(restaurantId: string, locationId?: string) {
    const location = locationId
      ? await this.prisma.restaurantLocation.findFirst({
          where: { id: locationId, restaurantId, deletedAt: null },
        })
      : await this.prisma.restaurantLocation.findFirst({
          where: { restaurantId, deletedAt: null },
          orderBy: { isPrimary: 'desc' },
        });

    if (!location) {
      throw new NotFoundException('Restaurant location not found');
    }

    return location;
  }
}
