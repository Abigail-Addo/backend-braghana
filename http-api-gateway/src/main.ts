import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
    }),
  );
  const PORT = process.env.PORT ?? 3000;
  await app.listen(PORT, () => {
    console.log(
      `API Gateway with NATS listening c on port: ${PORT} \nurl:  http://localhost:${PORT}`,
    );
  });
}
bootstrap();
