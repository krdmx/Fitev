import { Module } from "@nestjs/common";

import { InternalSecretGuard } from "./internal-secret.guard";
import { InternalUserGuard } from "./internal-user.guard";

@Module({
  providers: [InternalSecretGuard, InternalUserGuard],
  exports: [InternalSecretGuard, InternalUserGuard],
})
export class InternalAuthModule {}
