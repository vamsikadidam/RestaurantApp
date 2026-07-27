import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestUser } from '../common/types/authenticated-request';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { CreateCartDto } from './dto/create-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@ApiTags('cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post()
  @ApiOperation({ summary: 'Get or create the active cart for a restaurant location' })
  createOrGet(@CurrentUser() user: RequestUser, @Body() dto: CreateCartDto) {
    return this.cartService.getOrCreateActiveCart(user.userId, dto);
  }

  @Get(':cartId')
  @ApiOperation({ summary: 'Get the current cart with authoritative, freshly-computed pricing' })
  get(@CurrentUser() user: RequestUser, @Param('cartId') cartId: string) {
    return this.cartService.getCart(cartId, user.userId);
  }

  @Patch(':cartId')
  @ApiOperation({ summary: 'Update fulfillment type, delivery address, or promo code on the cart' })
  update(
    @CurrentUser() user: RequestUser,
    @Param('cartId') cartId: string,
    @Body() dto: UpdateCartDto,
  ) {
    return this.cartService.updateCart(cartId, user.userId, dto);
  }

  @Post(':cartId/items')
  @ApiOperation({ summary: 'Add an item (with modifiers) to the cart' })
  addItem(
    @CurrentUser() user: RequestUser,
    @Param('cartId') cartId: string,
    @Body() dto: AddCartItemDto,
  ) {
    return this.cartService.addItem(cartId, user.userId, dto);
  }

  @Patch(':cartId/items/:itemId')
  @ApiOperation({ summary: 'Update quantity or special instructions for a cart item' })
  updateItem(
    @CurrentUser() user: RequestUser,
    @Param('cartId') cartId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(cartId, user.userId, itemId, dto);
  }

  @Delete(':cartId/items/:itemId')
  @ApiOperation({ summary: 'Remove an item from the cart' })
  removeItem(
    @CurrentUser() user: RequestUser,
    @Param('cartId') cartId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.cartService.removeItem(cartId, user.userId, itemId);
  }

  @Delete(':cartId/items')
  @ApiOperation({ summary: 'Remove every item from the cart' })
  clearItems(@CurrentUser() user: RequestUser, @Param('cartId') cartId: string) {
    return this.cartService.clearItems(cartId, user.userId);
  }
}
