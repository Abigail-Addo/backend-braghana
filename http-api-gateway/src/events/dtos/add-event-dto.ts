import { PartialType } from '@nestjs/mapped-types';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

enum Category {
  'Free' = 'Free',
  'Paid' = 'Paid',
  'All' = 'All',
}

export class AddEventDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  @IsOptional()
  category: Category;

  @IsString()
  location: string;

  @IsNotEmpty()
  price: number;

  @IsString()
  eventDate: Date;

  @IsString()
  eventTime: string;
}

export class UpdateEventDto extends PartialType(AddEventDto) {}
