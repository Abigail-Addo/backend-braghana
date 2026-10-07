import { Module } from '@nestjs/common';
import { UsersMicroserviceController } from './users.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { APP_GUARD } from '@nestjs/core';
import { AccessTokenGuard } from 'src/iam/authentication/guards/access-token/access-token.guard';
import { JwtModule } from '@nestjs/jwt';
import jwtConfig from 'src/iam/config/jwt.config';
import { ConfigModule } from '@nestjs/config';
import { AuthenticationGuard } from 'src/iam/authentication/guards/authentication/authentication.guard';
import { NatsClientModule } from 'src/nats/nats-client.module';
import { BcryptService } from 'src/iam/hashing/bcrypt.service';
import { HashingService } from 'src/iam/hashing/hashing.service';

@Module({
  imports: [
    PrismaModule,
    NatsClientModule,
    JwtModule.registerAsync(jwtConfig.asProvider()),
    ConfigModule.forFeature(jwtConfig),
  ],

  controllers: [UsersMicroserviceController],
  providers: [
    {
      provide: HashingService,
      useClass: BcryptService,
    },
    {
      provide: APP_GUARD,
      useClass: AuthenticationGuard,
    },
    AccessTokenGuard,
  ],
})
export class UsersModule {}
