import { describe, it, expect, beforeEach, vi } from 'vitest'

import type { NotificationService } from '../common/services/notification.service'
import type { PasswordService } from '../common/services/password.service'
import type { Env } from '../config/env'
import type { UsersService } from '../users/users.service'

import { AuthService } from './auth.service'
import type { OtpService } from './otp.service'
import type { TokenService } from './token.service'

function makeDeps() {
  const users = {
    findByEmail: vi.fn(),
    findByPhone: vi.fn(),
    findByIdentifier: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    updatePassword: vi.fn(),
    setPhoneVerified: vi.fn(),
    toPublic: vi.fn((u: unknown) => u),
  } as unknown as UsersService
  const password = {
    hash: vi.fn(),
    compare: vi.fn(),
  } as unknown as PasswordService
  const tokens = {
    issueTokens: vi.fn(),
    rotateRefresh: vi.fn(),
    revokeRefresh: vi.fn(),
    revokeAllForUser: vi.fn(),
  } as unknown as TokenService
  const otp = {
    createPhoneOtp: vi.fn(),
    consumePhoneOtp: vi.fn(),
    createPasswordResetOtp: vi.fn(),
    consumePasswordResetOtp: vi.fn(),
  } as unknown as OtpService
  const notifier = {
    sendSmsOtp: vi.fn(),
    sendPasswordResetEmail: vi.fn(),
  } as unknown as NotificationService
  const env = { WEB_PUBLIC_URL: 'http://localhost:3000' } as Env
  return { users, password, tokens, otp, notifier, env }
}

function asMock<T>(fn: T): ReturnType<typeof vi.fn> {
  return fn as unknown as ReturnType<typeof vi.fn>
}

describe('AuthService', () => {
  let deps: ReturnType<typeof makeDeps>
  let service: AuthService

  beforeEach(() => {
    deps = makeDeps()
    service = new AuthService(
      deps.env,
      deps.users,
      deps.password,
      deps.tokens,
      deps.otp,
      deps.notifier,
    )
  })

  describe('register', () => {
    it('rejects when email exists', async () => {
      asMock(deps.users.findByEmail).mockResolvedValue({ id: 'existing' })
      await expect(
        service.register({
          email: 'a@example.com',
          phone: '+996700000000',
          password: 'pa$$word1',
          firstName: 'A',
          lastName: 'B',
        }),
      ).rejects.toMatchObject({ code: 'EMAIL_ALREADY_EXISTS' })
    })

    it('rejects when phone exists', async () => {
      asMock(deps.users.findByEmail).mockResolvedValue(null)
      asMock(deps.users.findByPhone).mockResolvedValue({ id: 'existing' })
      await expect(
        service.register({
          email: 'a@example.com',
          phone: '+996700000000',
          password: 'pa$$word1',
          firstName: 'A',
          lastName: 'B',
        }),
      ).rejects.toMatchObject({ code: 'PHONE_ALREADY_EXISTS' })
    })

    it('creates user and issues tokens on happy path', async () => {
      asMock(deps.users.findByEmail).mockResolvedValue(null)
      asMock(deps.users.findByPhone).mockResolvedValue(null)
      asMock(deps.password.hash).mockResolvedValue('$2b$12$x')
      const created = { id: 'u1', email: 'a@example.com', role: 'BUYER' as const }
      asMock(deps.users.create).mockResolvedValue(created)
      asMock(deps.tokens.issueTokens).mockResolvedValue({
        accessToken: 'a',
        refreshToken: 'r',
        accessTokenExpiresAt: '2030-01-01T00:00:00.000Z',
        refreshTokenExpiresAt: '2030-01-01T00:00:00.000Z',
      })
      const result = await service.register({
        email: 'a@example.com',
        phone: '+996700000000',
        password: 'pa$$word1',
        firstName: 'A',
        lastName: 'B',
      })
      expect(deps.password.hash).toHaveBeenCalledWith('pa$$word1')
      expect(deps.users.create).toHaveBeenCalledWith({
        email: 'a@example.com',
        phone: '+996700000000',
        passwordHash: '$2b$12$x',
        firstName: 'A',
        lastName: 'B',
      })
      expect(deps.tokens.issueTokens).toHaveBeenCalledWith({
        id: 'u1',
        email: 'a@example.com',
        role: 'BUYER',
      })
      expect(result.tokens.accessToken).toBe('a')
      expect(result.user).toBe(created)
    })
  })

  describe('login', () => {
    it('returns INVALID_CREDENTIALS when user missing', async () => {
      asMock(deps.users.findByIdentifier).mockResolvedValue(null)
      await expect(service.login({ identifier: 'a@example.com', password: 'x' })).rejects.toMatchObject({
        code: 'INVALID_CREDENTIALS',
      })
    })

    it('returns INVALID_CREDENTIALS when password wrong', async () => {
      asMock(deps.users.findByIdentifier).mockResolvedValue({
        id: 'u1',
        email: 'a@example.com',
        role: 'BUYER',
        passwordHash: 'h',
        deletedAt: null,
      })
      asMock(deps.password.compare).mockResolvedValue(false)
      await expect(service.login({ identifier: 'a@example.com', password: 'x' })).rejects.toMatchObject({
        code: 'INVALID_CREDENTIALS',
      })
    })

    it('returns INVALID_CREDENTIALS when user is soft-deleted', async () => {
      asMock(deps.users.findByIdentifier).mockResolvedValue({
        id: 'u1',
        email: 'a@example.com',
        role: 'BUYER',
        passwordHash: 'h',
        deletedAt: new Date('2026-04-01'),
      })
      await expect(service.login({ identifier: 'a@example.com', password: 'x' })).rejects.toMatchObject({
        code: 'INVALID_CREDENTIALS',
      })
      expect(deps.password.compare).not.toHaveBeenCalled()
    })

    it('issues tokens on correct credentials', async () => {
      asMock(deps.users.findByIdentifier).mockResolvedValue({
        id: 'u1',
        email: 'a@example.com',
        role: 'BUYER',
        passwordHash: 'h',
        deletedAt: null,
      })
      asMock(deps.password.compare).mockResolvedValue(true)
      asMock(deps.tokens.issueTokens).mockResolvedValue({
        accessToken: 'a',
        refreshToken: 'r',
        accessTokenExpiresAt: '2030-01-01T00:00:00.000Z',
        refreshTokenExpiresAt: '2030-01-01T00:00:00.000Z',
      })
      const result = await service.login({ identifier: 'a@example.com', password: 'x' })
      expect(result.tokens.accessToken).toBe('a')
    })
  })

  describe('refresh', () => {
    it('delegates to tokenService.rotateRefresh', async () => {
      asMock(deps.tokens.rotateRefresh).mockResolvedValue({
        accessToken: 'a',
        refreshToken: 'r',
        accessTokenExpiresAt: '2030-01-01T00:00:00.000Z',
        refreshTokenExpiresAt: '2030-01-01T00:00:00.000Z',
      })
      const result = await service.refresh('old')
      expect(deps.tokens.rotateRefresh).toHaveBeenCalledWith('old')
      expect(result.accessToken).toBe('a')
    })
  })

  describe('logout', () => {
    it('revokes the provided refresh token', async () => {
      await service.logout('some-token')
      expect(deps.tokens.revokeRefresh).toHaveBeenCalledWith('some-token')
    })
  })

  describe('requestPhoneVerify', () => {
    it('creates code and sends SMS', async () => {
      asMock(deps.otp.createPhoneOtp).mockResolvedValue('123456')
      await service.requestPhoneVerify('u1', '+996700111222')
      expect(deps.otp.createPhoneOtp).toHaveBeenCalledWith('u1')
      expect(deps.notifier.sendSmsOtp).toHaveBeenCalledWith('+996700111222', '123456')
    })
  })

  describe('confirmPhoneVerify', () => {
    it('consumes OTP and marks user verified', async () => {
      await service.confirmPhoneVerify('u1', '123456')
      expect(deps.otp.consumePhoneOtp).toHaveBeenCalledWith('u1', '123456')
      expect(deps.users.setPhoneVerified).toHaveBeenCalledWith('u1')
    })
  })

  describe('requestPasswordReset', () => {
    it('is a silent no-op when email not found', async () => {
      asMock(deps.users.findByEmail).mockResolvedValue(null)
      await service.requestPasswordReset('a@example.com')
      expect(deps.otp.createPasswordResetOtp).not.toHaveBeenCalled()
      expect(deps.notifier.sendPasswordResetEmail).not.toHaveBeenCalled()
    })

    it('creates token and sends email when user exists', async () => {
      asMock(deps.users.findByEmail).mockResolvedValue({ id: 'u1', email: 'a@example.com' })
      asMock(deps.otp.createPasswordResetOtp).mockResolvedValue('tok123')
      await service.requestPasswordReset('A@Example.com')
      expect(deps.otp.createPasswordResetOtp).toHaveBeenCalledWith('a@example.com')
      expect(deps.notifier.sendPasswordResetEmail).toHaveBeenCalledWith(
        'a@example.com',
        'http://localhost:3000/reset-password?token=tok123',
      )
    })
  })

  describe('confirmPasswordReset', () => {
    it('updates password hash and revokes refresh tokens', async () => {
      asMock(deps.otp.consumePasswordResetOtp).mockResolvedValue({ email: 'a@example.com' })
      asMock(deps.users.findByEmail).mockResolvedValue({ id: 'u1', email: 'a@example.com' })
      asMock(deps.password.hash).mockResolvedValue('$2b$12$new')
      await service.confirmPasswordReset('tok123', 'newpass1234')
      expect(deps.password.hash).toHaveBeenCalledWith('newpass1234')
      expect(deps.users.updatePassword).toHaveBeenCalledWith('u1', '$2b$12$new')
      expect(deps.tokens.revokeAllForUser).toHaveBeenCalledWith('u1')
    })

    it('throws OTP_INVALID when target user no longer exists', async () => {
      asMock(deps.otp.consumePasswordResetOtp).mockResolvedValue({ email: 'a@example.com' })
      asMock(deps.users.findByEmail).mockResolvedValue(null)
      await expect(service.confirmPasswordReset('tok', 'newpass1234')).rejects.toMatchObject({
        code: 'OTP_INVALID',
      })
    })
  })
})
