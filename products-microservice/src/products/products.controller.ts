import {
  Controller,
  Inject,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ClientProxy, MessagePattern, Payload } from '@nestjs/microservices';
import { Auth } from 'src/iam/authentication/decorator/auth.decorator';
import { AuthType } from 'src/iam/authentication/enums/auth-type.enum';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller()
export class ProductsMicroserviceController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('NATS_SERVER') private readonly natsClient: ClientProxy,
  ) {}

  @MessagePattern({ cmd: 'add_product' })
  addProduct(@Payload() request: any) {
    const userId = request.user.sub;
    const { data } = request;

    const quantity = parseInt(data.quantity);
    if (quantity < 0) {
      throw new Error('Quantity cannot be less than 0');
    }

    const price = parseFloat(data.price);
    if (price < 0) {
      throw new Error('Price cannot be less than 0');
    }

    const product = this.prisma.product.create({
      data: {
        name: data.name,
        description: data.description,
        price,
        vendorPhone: data.vendorPhone,
        quantity,
        productImg: data.url,
        public_id: data.public_id,
        userId: userId,
      },
    });
    return product;
  }

  @Auth(AuthType.None)
  @MessagePattern({ cmd: 'get_all_products' })
  async getAllProducts() {
    const products = await this.prisma.product.findMany();

    if (products.length === 0) {
      return { message: 'No products found', data: products };
    }

    return products;
  }

  @Auth(AuthType.None)
  @MessagePattern({ cmd: 'get_a_product' })
  async getProductById(@Payload() request: any) {
    const productId = request.params.id;

    const product = await this.prisma.product.findUnique({
      where: {
        productId,
      },
    });

    if (!product) {
      return { message: 'Product not found', data: {} };
    }
    return product;
  }

  @MessagePattern({ cmd: 'get_user_products' })
  async getUserProducts(@Payload() request: any) {
    const userId = request.user.sub;
    const products = await this.prisma.product.findMany({
      where: { userId },
    });

    if (products.length === 0) {
      return { message: 'No products found.', data: [] };
    }
    return products;
  }

  @MessagePattern({ cmd: 'update_product' })
  async updateProduct(@Payload() request: any) {
    const productId = request.params.id;
    const userId = request.user.sub;

    const product = await this.prisma.product.findUnique({
      where: { productId, userId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.userId !== userId) {
      throw new UnauthorizedException(
        'Unauthorized. You cannot update this product',
      );
    }

    const fields = ['name', 'price', 'quantity', 'description'];
    const updateObj: any = {};

    fields.forEach((field) => {
      if (request.data[field] !== undefined) {
        updateObj[field] = request.data[field] ?? product[field];
      }
    });

    const updatedProduct = await this.prisma.product.update({
      where: { productId, userId },
      data: {
        ...updateObj,
        updatedAt: new Date(),
      },
    });

    return { message: 'Product updated successfully', data: updatedProduct };
  }

  @MessagePattern({ cmd: 'delete_product' })
  async deleteProduct(@Payload() request: any) {
    const userId = request.user.sub;
    const productId = request.params.id;
    const product = await this.prisma.product.findUnique({
      where: {
        productId,
        userId,
      },
    });

    if (!product) {
      return { message: 'Product not found', data: {} };
    }
    if (product.userId !== userId) {
      throw new Error('Unauthorized. you cannot delete this product');
    }
    await this.prisma.product.delete({
      where: {
        productId,
        userId,
      },
    });
    return { message: 'Product deleted successfully' };
  }
}
