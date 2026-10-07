import { Module } from '@nestjs/common';
import { BcryptService } from './hashing/bcrypt.service';
import { HashingService } from './hashing/hashing.service';
import { AuthenticationUserMicroserviceController } from './authentication/authentication.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import jwtConfig from './config/jwt.config';
import { ConfigModule } from '@nestjs/config';
import { NatsClientModule } from 'src/nats/nats-client.module';
import { TwilioModule } from './twilio/twilio.module';

@Module({
  imports: [
    PrismaModule,
    NatsClientModule,
    JwtModule.registerAsync(jwtConfig.asProvider()),
    ConfigModule.forFeature(jwtConfig),
    TwilioModule,
  ],

  providers: [
    {
      provide: HashingService,
      useClass: BcryptService,
    },
  ],
  controllers: [AuthenticationUserMicroserviceController],
})
export class IamModule {}
