import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { ApplicationsModule } from "./applications/applications.module";
import { HealthModule } from "./health/health.module";
import { PdfModule } from "./pdf/pdf.module";
import { StatusModule } from "./status/status.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ApplicationsModule,
    HealthModule,
    PdfModule,
    StatusModule,
  ],
})
export class AppModule {}
