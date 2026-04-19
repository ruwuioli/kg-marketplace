import type { ErrorCodeValue } from '@kgm/types'
import { HttpException, HttpStatus } from '@nestjs/common'

export class ApiException extends HttpException {
  readonly code: ErrorCodeValue
  readonly details?: unknown

  constructor(
    code: ErrorCodeValue,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: unknown,
  ) {
    super({ code, message, details }, status)
    this.code = code
    this.details = details
  }
}
