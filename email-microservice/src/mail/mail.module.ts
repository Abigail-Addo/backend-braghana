import { Module } from '@nestjs/common';
import { MailMicroserviceController } from './mail.controller';

@Module({
  controllers: [MailMicroserviceController],
})
export class MailModule {}
