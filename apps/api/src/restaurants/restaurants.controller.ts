import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { RestaurantsService } from './restaurants.service';

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
}
