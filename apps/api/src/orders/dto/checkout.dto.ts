import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CheckoutDto {
  @ApiProperty()
  @IsString()
  cartId!: string;

  @ApiProperty({
    description:
      'Client-generated UUID. Retrying a checkout request with the same key always returns the same order instead of creating a duplicate.',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  idempotencyKey!: string;

  @ApiProperty({ required: false, minimum: 0, maximum: 100_000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000)
  tipCents?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  specialInstructions?: string;
}
