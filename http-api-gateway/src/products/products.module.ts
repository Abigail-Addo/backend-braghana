import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { NatsClientModule } from 'src/nats/nats-client.module';
import { CloudinaryService } from 'src/file-upload/cloudinary.service';

@Module({
  imports: [NatsClientModule],
  controllers: [ProductsController],
  providers: [CloudinaryService],
  exports: [CloudinaryService],
})
export class ProductsModule {}
