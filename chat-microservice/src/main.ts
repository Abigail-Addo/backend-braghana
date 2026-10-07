import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  // Start NATS microservice
  const microservice =
    await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
      transport: Transport.NATS,
      options: {
        servers: ['nats://localhost:4222'],
      },
    });

  microservice.listen();

  console.log('Chat NATS microservice running...');

  // Start WebSocket server
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(3005); // WebSocket will also initialize on port 4000 if configured
  console.log('WebSocket Gateway and HTTP server running...');
}
bootstrap();

// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module';

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);
//   app.enableCors({ origin: '*' });

//   await app.listen(process.env.PORT ?? 3005);
// }
// bootstrap();
