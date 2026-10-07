import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Request,
  UnauthorizedException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { AddProductDto, UpdateProductDto } from './dtos/add-product.dto';
import { ClientProxy } from '@nestjs/microservices';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from 'src/file-upload/cloudinary.service';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly cloudinaryService: CloudinaryService,
    @Inject('NATS_SERVER') private readonly natsClient: ClientProxy,
  ) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 20 * 1024 * 1024 },
      fileFilter: (req, file, callback) => {
        const allowedMimeTypes = ['image/jpeg', 'image/png'];

        if (!allowedMimeTypes.includes(file.mimetype)) {
          return callback(
            new BadRequestException('Only image and video files are allowed'),
            false,
          );
        }
        if (file.mimetype.startsWith('image/') && file.size > 1 * 1024 * 1024) {
          return callback(
            new BadRequestException('Images must not exceed 1 MB'),
            false,
          );
        }

        callback(null, true);
      },
    }),
  )
  async addProduct(
    @UploadedFile() file: Express.Multer.File,
    @Request() request: any,
    @Body() data: AddProductDto,
  ) {
    const requestHeaders = request.headers;

    if (!requestHeaders.authorization) {
      const error = new UnauthorizedException();
      return {
        statusCode: error.getStatus(),
        error: error.message,
      };
    }

    if (!file) {
      return this.natsClient.send(
        { cmd: 'add_product' },
        { data, headers: requestHeaders },
      );
    }
    const result = await this.cloudinaryService.uploadFile(file);

    return this.natsClient.send(
      { cmd: 'add_product' },
      {
        data: {
          ...data,
          url: result.secure_url,
          public_id: result.public_id,
        },
        headers: requestHeaders,
      },
    );
  }

  @Get()
  getProducts(@Request() request: any) {
    const requestHeaders = request.headers;
    return this.natsClient.send(
      { cmd: 'get_all_products' },
      { headers: requestHeaders },
    );
  }

  @Get('user')
  getUserProducts(@Request() request: any) {
    const requestHeaders = request.headers;
    return this.natsClient.send(
      { cmd: 'get_user_products' },
      { headers: requestHeaders },
    );
  }

  @Get(':id')
  getProductById(@Request() request: any, @Param('id') id: string) {
    const requestHeaders = request.headers;
    return this.natsClient.send(
      { cmd: 'get_a_product' },
      { headers: requestHeaders, params: { id } },
    );
  }

  @Put(':id')
  updateProduct(
    @Request() request: any,
    @Body() data: UpdateProductDto,
    @Param('id') id: string,
  ) {
    const requestHeaders = request.headers;
    return this.natsClient.send(
      { cmd: 'update_product' },
      { headers: requestHeaders, params: { id }, data },
    );
  }

  @Delete(':id')
  deleteProduct(@Request() request: any, @Param('id') id: string) {
    const requestHeaders = request.headers;
    return this.natsClient.send(
      { cmd: 'delete_product' },
      { headers: requestHeaders, params: { id } },
    );
  }
}
