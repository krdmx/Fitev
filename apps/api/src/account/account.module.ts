import { Module } from "@nestjs/common";

import { InternalAuthModule } from "../internal-auth/internal-auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { AccountController } from "./account.controller";
import { AccountService } from "./account.service";
import { InternalAuthSyncController } from "./internal-auth-sync.controller";

@Module({
  imports: [PrismaModule, InternalAuthModule],
  controllers: [AccountController, InternalAuthSyncController],
  providers: [AccountService],
  exports: [AccountService],
})
export class AccountModule {}
