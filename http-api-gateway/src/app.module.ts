import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PostModule } from './posts/post.module';
import { ConfigModule } from '@nestjs/config';
import { EventsModule } from './events/events.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { ReportsModule } from './reports/reports.module';
import { AdsModule } from './ads/ads.module';
import { NewsSubsModule } from './news-subs/news-subs.module';
import { LotteryModule } from './lottery/lottery.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AuthModule,
    PostModule,
    EventsModule,
    UsersModule,
    ProductsModule,
    ReportsModule,
    AdsModule,
    NewsSubsModule,
    LotteryModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
