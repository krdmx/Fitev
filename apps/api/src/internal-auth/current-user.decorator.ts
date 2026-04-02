import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

export type InternalRequestUser = {
  userId: string;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): InternalRequestUser => {
    const request = context.switchToHttp().getRequest<{
      user?: InternalRequestUser;
    }>();

    return request.user ?? { userId: "" };
  }
);
