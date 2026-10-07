import { Module } from '@nestjs/common';
import { NewsSubsController } from './news-subs.controller';
import { NatsClientModule } from 'src/nats/nats-client.module';
import { CloudinaryService } from 'src/file-upload/cloudinary.service';

@Module({
  imports: [NatsClientModule],
  providers: [CloudinaryService],
  exports: [CloudinaryService],
  controllers: [NewsSubsController],
})
export class NewsSubsModule {}
