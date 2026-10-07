import { Module } from '@nestjs/common';
import { ReportsModule } from './reports/reports.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ReportsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
