import { Module } from '@nestjs/common';
import { LotteryController } from './lottery.controller';
import { NatsClientModule } from 'src/nats/nats-client.module';

@Module({
  imports: [NatsClientModule],
  controllers: [LotteryController],
})
export class LotteryModule {}
