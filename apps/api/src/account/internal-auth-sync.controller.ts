import type {
  SyncGoogleUserRequest,
  SyncGoogleUserResponse,
} from "@repo/contracts";
import { Body, Controller, Post, UseGuards } from "@nestjs/common";

import { InternalSecretGuard } from "../internal-auth/internal-secret.guard";
import { AccountService } from "./account.service";

@Controller("api/v1/internal/auth")
@UseGuards(InternalSecretGuard)
export class InternalAuthSyncController {
  constructor(private readonly accountService: AccountService) {}

  @Post("sync")
  async syncGoogleUser(
    @Body() body: SyncGoogleUserRequest
  ): Promise<SyncGoogleUserResponse> {
    return this.accountService.syncGoogleUser(body);
  }
}
