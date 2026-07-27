import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateLocationSettingsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  pickupEnabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  deliveryEnabled?: boolean;

  @ApiProperty({ required: false, description: 'Delivery radius in meters' })
  @IsOptional()
  @IsInt()
  @Min(0)
  deliveryRadiusMeters?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  minimumOrderAmountCents?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  deliveryFeeCents?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  serviceFeeCents?: number;

  @ApiProperty({
    required: false,
    description: 'Percentage-based service fee, in basis points (100 = 1%)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  serviceFeeBasisPoints?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(180)
  defaultPrepTimeMinutes?: number;

  @ApiProperty({
    required: false,
    type: [Number],
    description: 'Tip preset percentages in basis points, e.g. [1000, 1500, 2000]',
  })
  @IsOptional()
  @IsInt({ each: true })
  @Min(0, { each: true })
  tipPresetsBasisPoints?: number[];

  @ApiProperty({
    required: false,
    description: 'Temporarily takes the location off pickup/delivery entirely',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
