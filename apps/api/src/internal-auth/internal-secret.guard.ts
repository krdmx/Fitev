import {
  CanActivate,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
  type ExecutionContext,
} from "@nestjs/common";

const INTERNAL_SECRET_HEADER = "x-internal-app-secret";

@Injectable()
export class InternalSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers?: Record<string, string | string[] | undefined>;
    }>();
    const expectedSecret = process.env.INTERNAL_API_SHARED_SECRET?.trim();

    if (!expectedSecret) {
      throw new ServiceUnavailableException(
        "Internal API shared secret is not configured."
      );
    }

    const headerValue = request.headers?.[INTERNAL_SECRET_HEADER];
    const providedSecret = Array.isArray(headerValue)
      ? headerValue[0]
      : headerValue;

    if (providedSecret?.trim() !== expectedSecret) {
      throw new UnauthorizedException("Invalid internal API secret.");
    }

    return true;
  }
}
