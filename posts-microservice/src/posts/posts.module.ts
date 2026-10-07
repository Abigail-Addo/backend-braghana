import { Module } from '@nestjs/common';
import { PostsMicroserviceController } from './posts.controller';
import { NatsClientModule } from 'src/nats/nats-client.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import jwtConfig from 'src/iam/config/jwt.config';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthenticationGuard } from 'src/iam/authentication/guards/authentication/authentication.guard';
import { AccessTokenGuard } from 'src/iam/authentication/guards/access-token/access-token.guard';

@Module({
  imports: [
    PrismaModule,
    NatsClientModule,
    JwtModule.registerAsync(jwtConfig.asProvider()),
    ConfigModule.forFeature(jwtConfig),
  ],
  controllers: [PostsMicroserviceController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthenticationGuard,
    },
    AccessTokenGuard,
  ],
})
export class PostsModule {}
