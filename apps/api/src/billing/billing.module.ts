import { Module } from "@nestjs/common";

import { AccountModule } from "../account/account.module";
import { InternalAuthModule } from "../internal-auth/internal-auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";

@Module({
  imports: [PrismaModule, AccountModule, InternalAuthModule],
  controllers: [BillingController],
  providers: [BillingService],
})
export class BillingModule {}
