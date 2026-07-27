import { ApiProperty } from '@nestjs/swagger';
import { FulfillmentType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateCartDto {
  @ApiProperty()
  @IsString()
  restaurantLocationId!: string;

  @ApiProperty({ enum: FulfillmentType, required: false })
  @IsOptional()
  @IsEnum(FulfillmentType)
  fulfillmentType?: FulfillmentType;
}
