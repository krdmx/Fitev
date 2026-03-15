import type { ApiStatusResponse } from "@repo/contracts";
import { Controller, Get } from "@nestjs/common";

import { StatusService } from "./status.service";

@Controller("api/v1/status")
export class StatusController {
  constructor(private readonly statusService: StatusService) {}

  @Get()
  async getStatus(): Promise<ApiStatusResponse> {
    return this.statusService.getStatus();
  }
}
