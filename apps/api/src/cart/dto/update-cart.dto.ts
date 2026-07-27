import { ApiProperty } from '@nestjs/swagger';
import { FulfillmentType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCartDto {
  @ApiProperty({ enum: FulfillmentType, required: false })
  @IsOptional()
  @IsEnum(FulfillmentType)
  fulfillmentType?: FulfillmentType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  deliveryAddressId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  promoCode?: string | null;
}
