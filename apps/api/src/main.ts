import "reflect-metadata";

import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.BACKEND_PORT ?? 3001);
  const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://app.localhost";

  app.enableCors({
    origin: frontendOrigin.split(",").map((value) => value.trim()),
    credentials: false
  });

  await app.listen(port, "0.0.0.0");

  Logger.log(`API listening on port ${port}`, "Bootstrap");
}

void bootstrap();
