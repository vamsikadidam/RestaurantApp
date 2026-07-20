import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { MenuService } from './menu.service';

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
}
