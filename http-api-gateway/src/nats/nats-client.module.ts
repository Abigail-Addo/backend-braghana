import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'NATS_SERVER',
        transport: Transport.NATS,
        options: {
          //'nats://localhost:4222'  ===> run this locally on your computer "nats://nats" ==>docker container
          servers: ['nats://localhost:4222'],
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
          //'nats://localhost:4222' ===> run this locally on your computer "nats://nats" ==>docker container
          servers: ['nats://localhost:4222'],
        },
      },
    ]),
  ],
})
export class NatsClientModule {}
