import type { QuotaExceededErrorResponse } from "@repo/contracts";
import { HttpException, HttpStatus } from "@nestjs/common";

export class QuotaExceededException extends HttpException {
  constructor(payload: QuotaExceededErrorResponse) {
    super(payload, HttpStatus.TOO_MANY_REQUESTS);
  }
}
