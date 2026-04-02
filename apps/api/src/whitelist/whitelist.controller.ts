import type {
  JoinWhitelistRequest,
  JoinWhitelistResponse,
} from "@repo/contracts";
import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";

import { WhitelistService } from "./whitelist.service";

@Controller("api/v1/whitelist")
export class WhitelistController {
  constructor(private readonly whitelistService: WhitelistService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async joinWhitelist(
    @Body() body: JoinWhitelistRequest
  ): Promise<JoinWhitelistResponse> {
    return this.whitelistService.joinWhitelist(body);
  }
}
