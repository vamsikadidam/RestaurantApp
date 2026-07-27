import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CartItemModifierDto } from './cart-item-modifier.dto';

export class AddCartItemDto {
  @ApiProperty()
  @IsString()
  menuItemId!: string;

  @ApiProperty({ default: 1, minimum: 1, maximum: 50 })
  @IsInt()
  @Min(1)
  @Max(50)
  quantity: number = 1;

  @ApiProperty({ type: [CartItemModifierDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemModifierDto)
  modifiers: CartItemModifierDto[] = [];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  specialInstructions?: string;
}
