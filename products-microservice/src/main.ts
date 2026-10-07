import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.createMicroservice(
    <MicroserviceOptions>AppModule,
    {
      transport: Transport.NATS,
      options: {
        servers: ['nats://localhost:4222'], // nats://nats ==> docker
      },
    },
  );

  await app.listen();
  console.log('Products microservice started listening to nats server...');
}
bootstrap();
