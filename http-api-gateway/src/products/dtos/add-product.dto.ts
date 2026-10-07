import { PartialType } from '@nestjs/mapped-types';
import { IsNotEmpty, IsString } from 'class-validator';

export class AddProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNotEmpty()
  price: string;

  @IsNotEmpty()
  vendorPhone: string;

  @IsNotEmpty()
  quantity: string;
}

// updateProduct dto with partial
export class UpdateProductDto extends PartialType(AddProductDto) {}
