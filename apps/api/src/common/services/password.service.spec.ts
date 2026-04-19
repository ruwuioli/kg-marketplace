import { describe, it, expect } from 'vitest'

import type { Env } from '../../config/env'

import { PasswordService } from './password.service'

// Cost 4 is bcrypt's minimum; keeps the suite under 500ms.
const env = { BCRYPT_COST: 4 } as Env
const service = new PasswordService(env)

describe('PasswordService', () => {
  it('hash produces a different string than the input', async () => {
    const hash = await service.hash('pa$$word123')
    expect(hash).not.toBe('pa$$word123')
    expect(hash.startsWith('$2')).toBe(true)
  })

  it('compare returns true for matching password', async () => {
    const hash = await service.hash('pa$$word123')
    await expect(service.compare('pa$$word123', hash)).resolves.toBe(true)
  })

  it('compare returns false for wrong password', async () => {
    const hash = await service.hash('pa$$word123')
    await expect(service.compare('wrong-pw', hash)).resolves.toBe(false)
  })
})
