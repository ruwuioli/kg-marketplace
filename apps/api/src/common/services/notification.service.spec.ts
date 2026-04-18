import { describe, it, expect, vi, beforeEach } from 'vitest'

import { NotificationService } from './notification.service'

describe('NotificationService', () => {
  let logSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('sends SMS via console stub with phone and code', async () => {
    const svc = new NotificationService()
    await svc.sendSmsOtp('+996700111222', '123456')
    expect(logSpy).toHaveBeenCalledWith(
      '[SMS STUB] +996700111222: Your verification code is 123456',
    )
  })

  it('sends email reset link via console stub', async () => {
    const svc = new NotificationService()
    await svc.sendPasswordResetEmail(
      'a@example.com',
      'http://localhost:3000/reset-password?token=abc123',
    )
    expect(logSpy).toHaveBeenCalledWith(
      '[EMAIL STUB] To a@example.com: reset link http://localhost:3000/reset-password?token=abc123',
    )
  })
})
