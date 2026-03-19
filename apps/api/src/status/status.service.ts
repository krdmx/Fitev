import type { ApiStatusResponse, DatabaseStatus } from "@repo/contracts";
import { Injectable } from "@nestjs/common";
import { Prisma } from "../generated/prisma";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class StatusService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus(): Promise<ApiStatusResponse> {
    const database = await this.checkDatabase();

    return {
      service: "pep-api",
      environment:
        process.env.APP_MODE ?? process.env.NODE_ENV ?? "development",
      database,
      status: database === "up" ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      version: "0.1.0",
    };
  }

  private async checkDatabase(): Promise<DatabaseStatus> {
    try {
      await this.prisma.$queryRaw(Prisma.sql`SELECT 1`);
      return "up";
    } catch {
      return "down";
    }
  }
}
