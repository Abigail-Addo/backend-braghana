import { Module } from '@nestjs/common';
import { NatsClientModule } from 'src/nats/nats-client.module';
import { AuthController } from './auth.controller';

@Module({
  imports: [NatsClientModule],
  controllers: [AuthController],
})
export class AuthModule {}
