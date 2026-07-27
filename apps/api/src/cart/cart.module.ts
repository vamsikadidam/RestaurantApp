import { Module } from '@nestjs/common';
import { RestaurantsModule } from '../restaurants/restaurants.module';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';

@Module({
  imports: [RestaurantsModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
