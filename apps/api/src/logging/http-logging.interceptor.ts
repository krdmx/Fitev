import type { CallHandler, ExecutionContext, NestInterceptor } from "@nestjs/common";

import {
  HttpException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { catchError, type Observable, throwError } from "rxjs";

import {
  buildRequestAddress,
  getRequestPath,
  logHttpExchange,
  shouldSkipInboundRequestLogging,
} from "./http-log.util";

type HttpRequestLike = {
  method?: string;
  body?: unknown;
  query?: unknown;
  originalUrl?: string;
  url?: string;
  protocol?: string;
  get?: (name: string) => string | undefined;
};

type HttpResponseLike = {
  statusCode: number;
  statusMessage?: string;
  once(event: "finish", listener: () => void): unknown;
};

type HttpErrorResponse = {
  message?: string | string[];
  error?: string;
};

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HttpLogger");

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<HttpRequestLike>();
    const response = context.switchToHttp().getResponse<HttpResponseLike>();
    const method = request.method?.toUpperCase() ?? "UNKNOWN";
    const path = getRequestPath(request);

    if (shouldSkipInboundRequestLogging(method, path)) {
      return next.handle();
    }

    const address = buildRequestAddress(request);
    const startedAt = Date.now();
    let errorMessage: string | undefined;

    response.once("finish", () => {
      logHttpExchange({
        logger: this.logger,
        kind: "Inbound Request",
        method,
        address,
        query: request.query,
        body: request.body,
        statusCode: response.statusCode,
        statusText: response.statusMessage,
        durationMs: Date.now() - startedAt,
        error: errorMessage,
      });
    });

    return next.handle().pipe(
      catchError((error: unknown) => {
        errorMessage = this.getErrorMessage(error);
        return throwError(() => error);
      })
    );
  }

  private getErrorMessage(error: unknown): string | undefined {
    if (error instanceof HttpException) {
      const response = error.getResponse();

      if (typeof response === "string" && response.trim()) {
        return response.trim();
      }

      if (this.isHttpErrorResponse(response)) {
        const detailedMessage = this.normalizeErrorMessage(response.message);

        if (detailedMessage) {
          return detailedMessage;
        }

        if (response.error?.trim()) {
          return response.error.trim();
        }
      }

      if (error.message.trim()) {
        return error.message.trim();
      }
    }

    if (error instanceof Error && error.message.trim()) {
      return error.message.trim();
    }

    if (typeof error === "string" && error.trim()) {
      return error.trim();
    }

    return undefined;
  }

  private normalizeErrorMessage(
    message: string | string[] | undefined
  ): string | undefined {
    if (Array.isArray(message)) {
      const normalized = message
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

      if (normalized.length > 0) {
        return normalized.join(", ");
      }

      return undefined;
    }

    if (typeof message === "string" && message.trim()) {
      return message.trim();
    }

    return undefined;
  }

  private isHttpErrorResponse(value: unknown): value is HttpErrorResponse {
    return typeof value === "object" && value !== null;
  }
}
