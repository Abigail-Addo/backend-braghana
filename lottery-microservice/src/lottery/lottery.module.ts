import { Module } from '@nestjs/common';
import { LotteryMicroserviceController } from './lottery.controller';
import { NatsClientModule } from 'src/nats/nats-client.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import jwtConfig from 'src/iam/config/jwt.config';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { AuthenticationGuard } from 'src/iam/authentication/guards/authentication/authentication.guard';
import { AccessTokenGuard } from 'src/iam/authentication/guards/access-token/access-token.guard';

@Module({
  imports: [
    PrismaModule,
    NatsClientModule,
    ScheduleModule,
    JwtModule.registerAsync(jwtConfig.asProvider()),
    ConfigModule.forFeature(jwtConfig),
  ],
  controllers: [LotteryMicroserviceController],

  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthenticationGuard,
    },
    AccessTokenGuard,
  ],
})
export class LotteryModule {}
