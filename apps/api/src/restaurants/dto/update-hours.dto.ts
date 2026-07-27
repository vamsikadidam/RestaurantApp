import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsInt, Max, Min, ValidateNested } from 'class-validator';

export class DayHoursDto {
  @ApiProperty({ description: '0 = Sunday .. 6 = Saturday' })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @ApiProperty({ description: 'Minutes from local midnight' })
  @IsInt()
  @Min(0)
  @Max(1440)
  opensAtMinutes!: number;

  @ApiProperty({ description: 'Minutes from local midnight' })
  @IsInt()
  @Min(0)
  @Max(1440)
  closesAtMinutes!: number;

  @ApiProperty()
  @IsBoolean()
  isClosed!: boolean;
}

export class UpdateHoursDto {
  @ApiProperty({
    type: [DayHoursDto],
    description: 'Full replacement of the week (one entry per open interval)',
  })
  @IsArray()
  @ArrayMaxSize(21) // up to 3 split shifts per day
  @ValidateNested({ each: true })
  @Type(() => DayHoursDto)
  hours!: DayHoursDto[];
}
