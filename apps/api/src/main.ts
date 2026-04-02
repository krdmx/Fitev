import "reflect-metadata";

import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";
import { validateQuotaConfiguration } from "./config/quota-config";
import { HttpLoggingInterceptor } from "./logging/http-logging.interceptor";

async function bootstrap() {
  validateQuotaConfiguration();

  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });
  const port = Number(process.env.BACKEND_PORT ?? 3001);
  const allowedOrigins = [
    "http://localhost",
    "http://localhost:3000",
    "http://land.localhost",
    "https://localhost",
    "https://localhost:3000",
    "https://land.localhost",
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
