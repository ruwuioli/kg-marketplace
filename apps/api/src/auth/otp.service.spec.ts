import { describe, it, expect, beforeEach, vi } from 'vitest'

import type { Env } from '../config/env'
import type { PrismaService } from '../prisma/prisma.service'

import { OtpService } from './otp.service'

const env: Env = {
  OTP_REQUEST_COOLDOWN_SECONDS: 60,
  OTP_VERIFY_EXPIRES_MINUTES: 10,
  OTP_MAX_CONFIRM_ATTEMPTS: 5,
  PASSWORD_RESET_EXPIRES_MINUTES: 30,
} as Env

type MockPrisma = {
  otpCode: {
    create: ReturnType<typeof vi.fn>
    findFirst: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    count: ReturnType<typeof vi.fn>
  }
}

function makePrisma(): MockPrisma {
  return {
    otpCode: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  }
}

describe('OtpService', () => {
  let prisma: MockPrisma
  let service: OtpService

  beforeEach(() => {
    prisma = makePrisma()
    service = new OtpService(env, prisma as unknown as PrismaService)
  })

  describe('createPhoneOtp', () => {
    it('throws OTP_COOLDOWN when a recent unexpired OTP already exists', async () => {
      prisma.otpCode.findFirst.mockResolvedValue({
        id: 'o1',
        code: '123456',
        purpose: 'PHONE_VERIFY',
        userId: 'u1',
        expiresAt: new Date(Date.now() + 60_000),
        consumedAt: null,
        createdAt: new Date(Date.now() - 5_000),
      })
      await expect(service.createPhoneOtp('u1')).rejects.toMatchObject({ code: 'OTP_COOLDOWN' })
      expect(prisma.otpCode.create).not.toHaveBeenCalled()
    })

    it('creates a 6-digit code when no cooldown applies', async () => {
      prisma.otpCode.findFirst.mockResolvedValue(null)
      prisma.otpCode.create.mockImplementation(({ data }) => Promise.resolve({ id: 'o2', ...data }))
      const code = await service.createPhoneOtp('u1')
      expect(code).toMatch(/^\d{6}$/)
      expect(prisma.otpCode.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            purpose: 'PHONE_VERIFY',
            userId: 'u1',
            code,
          }),
        }),
      )
    })
  })

  describe('consumePhoneOtp', () => {
    it('throws OTP_INVALID when no matching OTP exists', async () => {
      prisma.otpCode.findFirst.mockResolvedValue(null)
      await expect(service.consumePhoneOtp('u1', '000000')).rejects.toMatchObject({
        code: 'OTP_INVALID',
      })
    })

    it('throws OTP_EXPIRED when the most recent OTP is past expiry', async () => {
      prisma.otpCode.findFirst.mockResolvedValue({
        id: 'o1',
        code: '123456',
        userId: 'u1',
        purpose: 'PHONE_VERIFY',
        expiresAt: new Date(Date.now() - 1000),
        consumedAt: null,
        attempts: 0,
        createdAt: new Date(Date.now() - 100_000),
      })
      await expect(service.consumePhoneOtp('u1', '123456')).rejects.toMatchObject({
        code: 'OTP_EXPIRED',
      })
    })

    it('marks OTP consumed when code matches and within expiry', async () => {
      prisma.otpCode.findFirst.mockResolvedValue({
        id: 'o1',
        code: '123456',
        userId: 'u1',
        purpose: 'PHONE_VERIFY',
        expiresAt: new Date(Date.now() + 60_000),
        consumedAt: null,
        attempts: 0,
        createdAt: new Date(),
      })
      prisma.otpCode.update.mockResolvedValue({})
      await service.consumePhoneOtp('u1', '123456')
      expect(prisma.otpCode.update).toHaveBeenCalledWith({
        where: { id: 'o1' },
        data: { consumedAt: expect.any(Date) },
      })
    })

    it('throws OTP_INVALID and increments attempts when code does not match', async () => {
      prisma.otpCode.findFirst.mockResolvedValue({
        id: 'o1',
        code: '123456',
        userId: 'u1',
        purpose: 'PHONE_VERIFY',
        expiresAt: new Date(Date.now() + 60_000),
        consumedAt: null,
        attempts: 0,
        createdAt: new Date(),
      })
      prisma.otpCode.update.mockResolvedValue({})
      await expect(service.consumePhoneOtp('u1', '999999')).rejects.toMatchObject({
        code: 'OTP_INVALID',
      })
      expect(prisma.otpCode.update).toHaveBeenCalledWith({
        where: { id: 'o1' },
        data: { attempts: { increment: 1 } },
      })
    })

    it('throws OTP_TOO_MANY_ATTEMPTS once the per-OTP limit is reached', async () => {
      prisma.otpCode.findFirst.mockResolvedValue({
        id: 'o1',
        code: '123456',
        userId: 'u1',
        purpose: 'PHONE_VERIFY',
        expiresAt: new Date(Date.now() + 60_000),
        consumedAt: null,
        attempts: 5,
        createdAt: new Date(),
      })
      await expect(service.consumePhoneOtp('u1', '123456')).rejects.toMatchObject({
        code: 'OTP_TOO_MANY_ATTEMPTS',
      })
      expect(prisma.otpCode.update).not.toHaveBeenCalled()
    })
  })

  describe('password reset OTP', () => {
    it('createPasswordResetOtp produces a hex token regardless of user existence', async () => {
      prisma.otpCode.create.mockImplementation(({ data }) => Promise.resolve({ id: 'o3', ...data }))
      const token = await service.createPasswordResetOtp('a@example.com')
      expect(token).toMatch(/^[a-f0-9]{64}$/)
      expect(prisma.otpCode.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            purpose: 'PASSWORD_RESET',
            email: 'a@example.com',
            code: token,
          }),
        }),
      )
    })

    it('consumePasswordResetOtp returns associated email and marks consumed', async () => {
      prisma.otpCode.findFirst.mockResolvedValue({
        id: 'o3',
        code: 'abc'.repeat(22),
        email: 'a@example.com',
        purpose: 'PASSWORD_RESET',
        expiresAt: new Date(Date.now() + 60_000),
        consumedAt: null,
        createdAt: new Date(),
      })
      prisma.otpCode.update.mockResolvedValue({})
      const result = await service.consumePasswordResetOtp('abc'.repeat(22))
      expect(result).toEqual({ email: 'a@example.com' })
      expect(prisma.otpCode.update).toHaveBeenCalled()
    })
  })
})
