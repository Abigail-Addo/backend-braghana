import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { PrismaModule } from 'src/prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { NatsClientModule } from 'src/nats/nats-client.module';
import jwtConfig from 'src/iam/config/jwt.config';
import { AccessTokenGuard } from 'src/iam/authentication/guards/access-token/access-token.guard';
import { AuthenticationGuard } from 'src/iam/authentication/guards/authentication/authentication.guard';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    PrismaModule,
    ConfigModule.forRoot(),
    ConfigModule.forFeature(jwtConfig),
    NatsClientModule,
    JwtModule.registerAsync(jwtConfig.asProvider()),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthenticationGuard,
    },
    AccessTokenGuard,
    ChatService,
    ChatGateway,
  ],
  controllers: [],
})
export class ChatModule {}
