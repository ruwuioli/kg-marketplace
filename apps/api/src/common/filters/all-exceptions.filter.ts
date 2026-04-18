import type { ErrorCodeValue } from '@kgm/types'
import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common'
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common'
import type { Request, Response } from 'express'

import { ApiException } from '../errors/api.exception'

type ErrorBody = { code: ErrorCodeValue; message: string; details?: unknown }

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    const { status, body } = this.buildError(exception)

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${status} ${body.code}: ${body.message}`,
        exception instanceof Error ? exception.stack : undefined,
      )
    }

    response.status(status).json({ error: body })
  }

  private buildError(exception: unknown): { status: number; body: ErrorBody } {
    if (exception instanceof ApiException) {
      return {
        status: exception.getStatus(),
        body: { code: exception.code, message: exception.message, details: exception.details },
      }
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const response = exception.getResponse()
      const message =
        typeof response === 'string'
          ? response
          : ((response as { message?: string | string[] }).message ?? exception.message)
      return {
        status,
        body: {
          code: status === HttpStatus.BAD_REQUEST ? 'VALIDATION_FAILED' : 'INTERNAL_ERROR',
          message: Array.isArray(message) ? message.join(', ') : message,
        },
      }
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    }
  }
}
