import { ApiProperty } from '@nestjs/swagger';
import { PaymentProviderMode } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty()
  @IsString()
  orderId!: string;

  @ApiProperty({ enum: PaymentProviderMode, default: PaymentProviderMode.CLOVER_ECOMMERCE })
  @IsEnum(PaymentProviderMode)
  provider: PaymentProviderMode = PaymentProviderMode.CLOVER_ECOMMERCE;

  @ApiProperty({
    required: false,
    description:
      'Single-use clv_... token from the Ecommerce tokenization host. Required for CLOVER_ECOMMERCE.',
  })
  @IsOptional()
  @IsString()
  sourceToken?: string;

  @ApiProperty({
    required: false,
    description: 'Physical device serial number. Required for CLOVER_TERMINAL.',
  })
  @IsOptional()
  @IsString()
  terminalDeviceId?: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  idempotencyKey!: string;
}
