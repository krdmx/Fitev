import {
  CanActivate,
  Injectable,
  UnauthorizedException,
  type ExecutionContext,
} from "@nestjs/common";

import type { InternalRequestUser } from "./current-user.decorator";
import { InternalSecretGuard } from "./internal-secret.guard";

const USER_ID_HEADER = "x-user-id";

@Injectable()
export class InternalUserGuard implements CanActivate {
  constructor(private readonly internalSecretGuard: InternalSecretGuard) {}

  canActivate(context: ExecutionContext): boolean {
    this.internalSecretGuard.canActivate(context);

    const request = context.switchToHttp().getRequest<{
      headers?: Record<string, string | string[] | undefined>;
      user?: InternalRequestUser;
    }>();
    const userIdHeader = request.headers?.[USER_ID_HEADER];
    const userId = Array.isArray(userIdHeader) ? userIdHeader[0] : userIdHeader;
    const normalizedUserId = userId?.trim();

    if (!normalizedUserId) {
      throw new UnauthorizedException("Missing internal user identifier.");
    }

    request.user = {
      userId: normalizedUserId,
    };

    return true;
  }
}
