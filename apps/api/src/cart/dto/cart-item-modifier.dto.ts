import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Max, Min } from 'class-validator';

export class CartItemModifierDto {
  @ApiProperty()
  @IsString()
  modifierOptionId!: string;

  @ApiProperty({ default: 1, minimum: 1, maximum: 20 })
  @IsInt()
  @Min(1)
  @Max(20)
  quantity: number = 1;
}
