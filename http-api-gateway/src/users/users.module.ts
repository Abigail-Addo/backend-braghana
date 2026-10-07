import { Module } from '@nestjs/common';
import { NatsClientModule } from 'src/nats/nats-client.module';
import { UsersController } from './users.controller';
import { CloudinaryService } from 'src/file-upload/cloudinary.service';

@Module({
  imports: [NatsClientModule],
  controllers: [UsersController],
  providers: [CloudinaryService],
  exports: [CloudinaryService],
})
export class UsersModule {}
