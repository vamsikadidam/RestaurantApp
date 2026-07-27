import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class AccountDeletionDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Confirms account ownership before permanently anonymizing the account',
  })
  @IsString()
  @MinLength(1)
  password!: string;
}
