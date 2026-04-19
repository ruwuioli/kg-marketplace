import { randomBytes, randomInt } from 'node:crypto'

import { HttpStatus, Inject, Injectable } from '@nestjs/common'

import { ApiException } from '../common/errors/api.exception'
import type { Env } from '../config/env'
import { ENV_TOKEN } from '../config/env.token'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class OtpService {
  constructor(
    @Inject(ENV_TOKEN) private readonly env: Env,
    private readonly prisma: PrismaService,
  ) {}

  async createPhoneOtp(userId: string): Promise<string> {
    const cooldownMs = this.env.OTP_REQUEST_COOLDOWN_SECONDS * 1000
    const recent = await this.prisma.otpCode.findFirst({
      where: {
        userId,
        purpose: 'PHONE_VERIFY',
        consumedAt: null,
        createdAt: { gte: new Date(Date.now() - cooldownMs) },
      },
      orderBy: { createdAt: 'desc' },
    })
    if (recent) {
      throw new ApiException(
        'OTP_COOLDOWN',
        'Please wait before requesting another code',
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0')
    const expiresAt = new Date(Date.now() + this.env.OTP_VERIFY_EXPIRES_MINUTES * 60_000)
    await this.prisma.otpCode.create({
      data: { code, purpose: 'PHONE_VERIFY', userId, expiresAt },
    })
    return code
  }

  async consumePhoneOtp(userId: string, code: string): Promise<void> {
    const otp = await this.prisma.otpCode.findFirst({
      where: { userId, purpose: 'PHONE_VERIFY', consumedAt: null },
      orderBy: { createdAt: 'desc' },
    })
    if (!otp) {
      throw new ApiException('OTP_INVALID', 'No pending code', HttpStatus.BAD_REQUEST)
    }
    if (otp.expiresAt.getTime() < Date.now()) {
      throw new ApiException('OTP_EXPIRED', 'Code has expired', HttpStatus.BAD_REQUEST)
    }
    if (otp.attempts >= this.env.OTP_MAX_CONFIRM_ATTEMPTS) {
      throw new ApiException(
        'OTP_TOO_MANY_ATTEMPTS',
        'Too many incorrect attempts — request a new code',
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }
    if (otp.code !== code) {
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      })
      throw new ApiException('OTP_INVALID', 'Code does not match', HttpStatus.BAD_REQUEST)
    }
    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    })
  }

  async createPasswordResetOtp(email: string): Promise<string> {
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + this.env.PASSWORD_RESET_EXPIRES_MINUTES * 60_000)
    await this.prisma.otpCode.create({
      data: { code: token, purpose: 'PASSWORD_RESET', email, expiresAt },
    })
    return token
  }

  async consumePasswordResetOtp(token: string): Promise<{ email: string }> {
    const otp = await this.prisma.otpCode.findFirst({
      where: { code: token, purpose: 'PASSWORD_RESET', consumedAt: null },
    })
    if (!otp) {
      throw new ApiException('OTP_INVALID', 'Reset token not recognized', HttpStatus.BAD_REQUEST)
    }
    if (otp.expiresAt.getTime() < Date.now()) {
      throw new ApiException('OTP_EXPIRED', 'Reset token has expired', HttpStatus.BAD_REQUEST)
    }
    if (!otp.email) {
      throw new ApiException('OTP_INVALID', 'Reset token malformed', HttpStatus.BAD_REQUEST)
    }
    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    })
    return { email: otp.email }
  }
}
