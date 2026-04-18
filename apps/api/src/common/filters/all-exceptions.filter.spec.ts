import { BadRequestException, HttpStatus } from '@nestjs/common'
import { describe, it, expect, vi } from 'vitest'

import { ApiException } from '../errors/api.exception'

import { AllExceptionsFilter } from './all-exceptions.filter'

function makeHost(): { host: any; status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> } {
  const json = vi.fn()
  const status = vi.fn().mockReturnValue({ json })
  const response = { status }
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({ url: '/api/v1/test', method: 'GET' }),
    }),
  }
  return { host, status, json }
}

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter()

  it('formats ApiException with code, message, and details', () => {
    const { host, status, json } = makeHost()
    const exc = new ApiException('EMAIL_ALREADY_EXISTS', 'email taken', HttpStatus.CONFLICT, {
      field: 'email',
    })
    filter.catch(exc, host)
    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT)
    expect(json).toHaveBeenCalledWith({
      error: { code: 'EMAIL_ALREADY_EXISTS', message: 'email taken', details: { field: 'email' } },
    })
  })

  it('maps built-in HttpException to VALIDATION_FAILED when 400', () => {
    const { host, status, json } = makeHost()
    filter.catch(new BadRequestException('bad input'), host)
    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST)
    expect(json).toHaveBeenCalledWith({
      error: { code: 'VALIDATION_FAILED', message: 'bad input' },
    })
  })

  it('maps unknown errors to INTERNAL_ERROR with 500', () => {
    const { host, status, json } = makeHost()
    filter.catch(new Error('boom'), host)
    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR)
    expect(json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    })
  })
})
