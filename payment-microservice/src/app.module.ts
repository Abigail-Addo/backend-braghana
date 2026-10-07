import { Module } from '@nestjs/common';
import { PaymentModule } from './payment/payment.module';
import { ConfigModule } from '@nestjs/config';
import { IamModule } from './iam/iam.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PaymentModule,
    IamModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
