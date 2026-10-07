import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'NATS_SERVER',
        transport: Transport.NATS,
        options: {
          servers: ['nats://localhost:4222'], // nats://nats ==> docker nats://localhost:4222
        },
      },
    ]),
  ],
  exports: [
    ClientsModule.register([
      {
        name: 'NATS_SERVER',
        transport: Transport.NATS,
        options: {
          servers: ['nats://localhost:4222'], // nats://nats ==> docker
        },
      },
    ]),
  ],
})
export class NatsClientModule {}
