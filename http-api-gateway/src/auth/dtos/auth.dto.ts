import { PartialType } from '@nestjs/mapped-types';
import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class CreateUserDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  fullname: string;

  @IsNotEmpty()
  @IsString()
  phone: string;
}

export class LoginDto {
  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsNotEmpty()
  @IsString()
  otp: string;
}

export class RefreshTokenDto {
  @IsNotEmpty()
  refreshToken: string;
}

export class LoginUserDto {
  @IsNotEmpty()
  @IsString()
  @Length(6, 6)
  otp: string;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {}
