import "reflect-metadata";

import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";
import { HttpLoggingInterceptor } from "./logging/http-logging.interceptor";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.BACKEND_PORT ?? 3001);
  const allowedOrigins = [
    "http://localhost:3000",
    "http://app.localhost",
    "https://localhost:3000",
    "https://app.localhost",
  ];

  app.enableCors({
    origin: allowedOrigins,
    credentials: false,
  });
  app.useGlobalInterceptors(new HttpLoggingInterceptor());

  await app.listen(port, "0.0.0.0");

  Logger.log(`API listening on port ${port}`, "Bootstrap");
}

void bootstrap();
