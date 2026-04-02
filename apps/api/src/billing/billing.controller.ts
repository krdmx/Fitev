import type { CreateBillingSessionResponse } from "@repo/contracts";
import {
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";

import { CurrentUser, type InternalRequestUser } from "../internal-auth/current-user.decorator";
import { InternalUserGuard } from "../internal-auth/internal-user.guard";
import { BillingService } from "./billing.service";

@Controller("api/v1/billing")
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post("checkout-session")
  @UseGuards(InternalUserGuard)
  async createCheckoutSession(
    @CurrentUser() user: InternalRequestUser
  ): Promise<CreateBillingSessionResponse> {
    return this.billingService.createCheckoutSession(user.userId);
  }

  @Post("portal-session")
  @UseGuards(InternalUserGuard)
  async createPortalSession(
    @CurrentUser() user: InternalRequestUser
  ): Promise<CreateBillingSessionResponse> {
    return this.billingService.createPortalSession(user.userId);
  }

  @Post("stripe-webhook")
  @HttpCode(200)
  async handleStripeWebhook(
    @Req() request: { rawBody?: Buffer },
    @Headers("stripe-signature") signature: string | undefined
  ): Promise<{ received: true }> {
    await this.billingService.handleWebhook(
      request.rawBody ?? Buffer.alloc(0),
      signature
    );

    return { received: true };
  }
}
