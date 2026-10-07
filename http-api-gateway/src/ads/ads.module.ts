import { Module } from '@nestjs/common';
import { AdsController } from './ads.controller';
import { NatsClientModule } from 'src/nats/nats-client.module';
import { CloudinaryService } from 'src/file-upload/cloudinary.service';

@Module({
  imports: [NatsClientModule],
  providers: [CloudinaryService],
  exports: [CloudinaryService],
  controllers: [AdsController],
})
export class AdsModule {}
