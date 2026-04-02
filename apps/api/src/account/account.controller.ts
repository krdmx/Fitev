import type { GetAccountResponse } from "@repo/contracts";
import { Controller, Get, UseGuards } from "@nestjs/common";

import { AccountService } from "./account.service";
import { CurrentUser, type InternalRequestUser } from "../internal-auth/current-user.decorator";
import { InternalUserGuard } from "../internal-auth/internal-user.guard";

@Controller("api/v1/account")
@UseGuards(InternalUserGuard)
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get()
  async getAccount(
    @CurrentUser() user: InternalRequestUser
  ): Promise<GetAccountResponse> {
    return this.accountService.getAccount(user.userId);
  }
}
