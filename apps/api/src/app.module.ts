import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AccountModule } from "./account/account.module";
import { ApplicationsModule } from "./applications/applications.module";
import { BillingModule } from "./billing/billing.module";
import { HealthModule } from "./health/health.module";
import { PdfModule } from "./pdf/pdf.module";
import { StatusModule } from "./status/status.module";
import { WhitelistModule } from "./whitelist/whitelist.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AccountModule,
    ApplicationsModule,
    BillingModule,
    HealthModule,
    PdfModule,
    StatusModule,
    WhitelistModule,
  ],
})
export class AppModule {}
