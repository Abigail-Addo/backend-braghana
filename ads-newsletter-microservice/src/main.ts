import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';

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

  app.useGlobalPipes(new ValidationPipe());
  await app.listen();
  console.log('Ads microservice has started listening to nats server...');
}
bootstrap();
