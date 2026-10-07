import { Module } from '@nestjs/common';
import { PostController } from './post.controller';
import { NatsClientModule } from 'src/nats/nats-client.module';
import { CloudinaryService } from 'src/file-upload/cloudinary.service';

@Module({
  imports: [NatsClientModule],
  controllers: [PostController],
  providers: [CloudinaryService],
  exports: [CloudinaryService],
})
export class PostModule {}
