import { describe, it, expect } from 'vitest'
import { lastValueFrom, of } from 'rxjs'

import { ResponseEnvelopeInterceptor } from './response-envelope.interceptor'

describe('ResponseEnvelopeInterceptor', () => {
  const interceptor = new ResponseEnvelopeInterceptor()

  it('wraps a plain value in { data }', async () => {
    const next = { handle: () => of({ id: '1', name: 'foo' }) }
    const result = await lastValueFrom(interceptor.intercept({} as any, next))
    expect(result).toEqual({ data: { id: '1', name: 'foo' } })
  })

  it('wraps a primitive result in { data }', async () => {
    const next = { handle: () => of(42) }
    const result = await lastValueFrom(interceptor.intercept({} as any, next))
    expect(result).toEqual({ data: 42 })
  })

  it('passes through null', async () => {
    const next = { handle: () => of(null) }
    const result = await lastValueFrom(interceptor.intercept({} as any, next))
    expect(result).toEqual({ data: null })
  })
})
