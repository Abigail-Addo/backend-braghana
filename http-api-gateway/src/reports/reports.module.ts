import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { NatsClientModule } from 'src/nats/nats-client.module';

@Module({
  imports: [NatsClientModule],
  controllers: [ReportsController],
})
export class ReportsModule {}
