import { Body, Controller, Get, Param, Patch, Put, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRoleType } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { RestaurantScopeGuard } from '../common/guards/restaurant-scope.guard';
import { RequestUser } from '../common/types/authenticated-request';
import { RestaurantsService } from './restaurants.service';
import { UpdateLocationSettingsDto } from './dto/update-location-settings.dto';
import { UpdateHoursDto } from './dto/update-hours.dto';

@ApiTags('restaurants')
@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Public()
  @Get(':restaurantId')
  @ApiOperation({ summary: 'Get restaurant details (public - no login required)' })
  getRestaurant(@Param('restaurantId') restaurantId: string) {
    return this.restaurantsService.getRestaurant(restaurantId);
  }

  @Public()
  @Get(':restaurantId/hours')
  @ApiOperation({ summary: 'Get posted hours for a restaurant location' })
  getHours(@Param('restaurantId') restaurantId: string, @Query('locationId') locationId?: string) {
    return this.restaurantsService.getHours(restaurantId, locationId);
  }

  @Public()
  @Get(':restaurantId/availability')
  @ApiOperation({ summary: 'Check whether a restaurant is currently open for pickup/delivery' })
  getAvailability(
    @Param('restaurantId') restaurantId: string,
    @Query('locationId') locationId?: string,
  ) {
    return this.restaurantsService.getAvailability(restaurantId, locationId);
  }

  @Get(':restaurantId/locations/:locationId/settings')
  @ApiOperation({
    summary: 'Get business settings (fees, delivery radius, hours) for a location - admin/employee',
  })
  @UseGuards(RolesGuard, RestaurantScopeGuard)
  @Roles(UserRoleType.RESTAURANT_ADMIN, UserRoleType.RESTAURANT_EMPLOYEE)
  getLocationSettings(
    @Param('restaurantId') restaurantId: string,
    @Param('locationId') locationId: string,
  ) {
    return this.restaurantsService.getLocationSettings(restaurantId, locationId);
  }

  @Patch(':restaurantId/locations/:locationId/settings')
  @ApiOperation({ summary: 'Update business settings for a location (admin only)' })
  @UseGuards(RolesGuard, RestaurantScopeGuard)
  @Roles(UserRoleType.RESTAURANT_ADMIN)
  updateLocationSettings(
    @Param('restaurantId') restaurantId: string,
    @Param('locationId') locationId: string,
    @Body() dto: UpdateLocationSettingsDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.restaurantsService.updateLocationSettings(
      restaurantId,
      locationId,
      dto,
      user.userId,
    );
  }

  @Put(':restaurantId/locations/:locationId/hours')
  @ApiOperation({ summary: 'Replace the posted weekly hours for a location (admin only)' })
  @UseGuards(RolesGuard, RestaurantScopeGuard)
  @Roles(UserRoleType.RESTAURANT_ADMIN)
  updateHours(
    @Param('restaurantId') restaurantId: string,
    @Param('locationId') locationId: string,
    @Body() dto: UpdateHoursDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.restaurantsService.updateHours(restaurantId, locationId, dto, user.userId);
  }
}
