import { Module } from '@nestjs/common';
import { AdsMicroserviceController } from './ads.controller';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from 'src/prisma/prisma.module';
import { NatsClientModule } from 'src/nats/nats-client.module';
import jwtConfig from 'src/iam/config/jwt.config';
import { APP_GUARD } from '@nestjs/core';
import { AuthenticationGuard } from 'src/iam/authentication/guards/authentication/authentication.guard';
import { AccessTokenGuard } from 'src/iam/authentication/guards/access-token/access-token.guard';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    PrismaModule,
    NatsClientModule,
    JwtModule.registerAsync(jwtConfig.asProvider()),
    ConfigModule.forFeature(jwtConfig),
  ],
  controllers: [AdsMicroserviceController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthenticationGuard,
    },
    AccessTokenGuard,
  ],
})
export class AdsModule {}
