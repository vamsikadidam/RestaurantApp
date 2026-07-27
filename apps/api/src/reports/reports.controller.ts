import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRoleType } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { RestaurantScopeGuard } from '../common/guards/restaurant-scope.guard';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@Controller('restaurants/:restaurantId/reports')
@UseGuards(RolesGuard, RestaurantScopeGuard)
@Roles(UserRoleType.RESTAURANT_ADMIN, UserRoleType.RESTAURANT_EMPLOYEE)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Sales summary for a date range: revenue, order counts, daily breakdown',
  })
  getSalesSummary(
    @Param('restaurantId') restaurantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('restaurantLocationId') restaurantLocationId?: string,
  ) {
    return this.reportsService.getSalesSummary(restaurantId, from, to, restaurantLocationId);
  }
}
