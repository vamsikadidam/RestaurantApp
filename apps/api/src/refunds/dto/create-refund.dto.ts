import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class CreateRefundDto {
  @ApiProperty({
    required: false,
    description: "Defaults to the order's most recent successful payment",
  })
  @IsOptional()
  @IsString()
  paymentId?: string;

  @ApiProperty({
    required: false,
    description: 'Defaults to a full refund of the remaining charged amount',
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  amountCents?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  reason?: string;
}
