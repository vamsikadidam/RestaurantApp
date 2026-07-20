import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class TriggerSyncDto {
  @ApiProperty()
  @IsString()
  restaurantId!: string;

  @ApiProperty()
  @IsString()
  restaurantLocationId!: string;
}
