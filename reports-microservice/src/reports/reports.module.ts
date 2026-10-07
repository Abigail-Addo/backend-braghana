import { Module } from '@nestjs/common';
import { ReportsMicroserviceController } from './reports.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { NatsClientModule } from 'src/nats/nats-client.module';

@Module({
  imports: [PrismaModule, NatsClientModule],
  controllers: [ReportsMicroserviceController],
})
export class ReportsModule {}
