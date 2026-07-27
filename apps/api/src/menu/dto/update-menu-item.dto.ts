import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class UpdateMenuItemDto {
  @ApiProperty({
    description:
      'Used only for RestaurantScopeGuard authorization (route has no restaurantId param)',
  })
  @IsString()
  restaurantId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @IsPositive()
  priceCents?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ required: false, description: 'Whether the item shows up on the menu at all' })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiProperty({
    required: false,
    description: '86 the item for today without deactivating it long-term',
  })
  @IsOptional()
  @IsBoolean()
  isSoldOutOverride?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}
