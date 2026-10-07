import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { IamModule } from './iam/iam.module';
import { LotteryModule } from './lottery/lottery.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    IamModule,
    ScheduleModule.forRoot(),
    LotteryModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

//todo: add scheduled tasks
// todo: add http api gateway methods
