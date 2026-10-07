import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { NatsClientModule } from 'src/nats/nats-client.module';
import { CloudinaryService } from 'src/file-upload/cloudinary.service';

@Module({
  imports: [NatsClientModule],
  controllers: [EventsController],
  providers: [CloudinaryService],
  exports: [CloudinaryService],
})
export class EventsModule {}
