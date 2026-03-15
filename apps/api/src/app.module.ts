import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { HealthController } from "./health.controller";
import { PrismaService } from "./prisma.service";
import { StatusController } from "./status.controller";
import { StatusService } from "./status.service";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [HealthController, StatusController],
  providers: [PrismaService, StatusService]
})
export class AppModule {}
