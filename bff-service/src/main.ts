import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // BFF service will be called from a front-end app hosted on a different origin (EBS).
  // So the CORS should be enabled.
  app.enableCors();

  app.use((req, res, next) => {
    console.log(`[BFF Bootstrap] Original url: ${req.originalUrl}`);
    next();
  });

  await app.listen(process.env.PORT || 4000);
}

bootstrap();
