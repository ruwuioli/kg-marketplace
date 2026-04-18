import { Test } from '@nestjs/testing'
import { describe, it, expect, beforeEach } from 'vitest'

import { HealthController } from './health.controller'

describe('HealthController', () => {
  let controller: HealthController

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile()

    controller = moduleRef.get(HealthController)
  })

  it('returns ok status with timestamp and uptime', () => {
    const result = controller.check()
    expect(result).toMatchObject({
      status: 'ok',
      timestamp: expect.any(String),
      uptime: expect.any(Number),
    })
    expect(() => new Date(result.timestamp)).not.toThrow()
    expect(result.uptime).toBeGreaterThanOrEqual(0)
  })
})
