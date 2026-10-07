import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendMailDto {
  @IsString()
  @IsNotEmpty()
  to: string;

  @IsString()
  @IsNotEmpty()
  from: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  text: string;

  @IsString()
  @IsNotEmpty()
  html: string;

  htmlReplacement: { string: string };
}
