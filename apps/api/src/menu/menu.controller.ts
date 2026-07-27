import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRoleType } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { RestaurantScopeGuard } from '../common/guards/restaurant-scope.guard';
import { RequestUser } from '../common/types/authenticated-request';
import { MenuService } from './menu.service';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

@ApiTags('menu')
@Controller()
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Public()
  @Get('restaurants/:restaurantId/menu')
  @ApiOperation({ summary: 'Get the full menu (categories + items) for a restaurant' })
  getMenu(@Param('restaurantId') restaurantId: string) {
    return this.menuService.getMenu(restaurantId);
  }

  @Public()
  @Get('restaurants/:restaurantId/categories')
  @ApiOperation({ summary: 'Get menu categories for a restaurant' })
  getCategories(@Param('restaurantId') restaurantId: string) {
    return this.menuService.getCategories(restaurantId);
  }

  @Public()
  @Get('menu-items/:itemId')
  @ApiOperation({ summary: 'Get full details (incl. modifiers) for a single menu item' })
  getItem(@Param('itemId') itemId: string) {
    return this.menuService.getItem(itemId);
  }

  @Public()
  @Get('restaurants/:restaurantId/menu/search')
  @ApiOperation({ summary: 'Search menu items by name/description' })
  search(@Param('restaurantId') restaurantId: string, @Query('q') query: string) {
    return this.menuService.search(restaurantId, query);
  }

  @Get('restaurants/:restaurantId/admin/menu-items')
  @ApiOperation({
    summary: 'List all menu items (incl. hidden/sold-out) for admin/employee menu management',
  })
  @UseGuards(RolesGuard, RestaurantScopeGuard)
  @Roles(UserRoleType.RESTAURANT_ADMIN, UserRoleType.RESTAURANT_EMPLOYEE)
  listAdminMenuItems(@Param('restaurantId') restaurantId: string) {
    return this.menuService.listAdminMenuItems(restaurantId);
  }

  @Patch('menu-items/:itemId')
  @ApiOperation({
    summary: 'Update a menu item (price, availability, sold-out, featured) - admin/employee',
  })
  @UseGuards(RolesGuard, RestaurantScopeGuard)
  @Roles(UserRoleType.RESTAURANT_ADMIN, UserRoleType.RESTAURANT_EMPLOYEE)
  updateMenuItem(
    @Param('itemId') itemId: string,
    @Body() dto: UpdateMenuItemDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.menuService.updateMenuItem(itemId, dto, user.userId);
  }
}
