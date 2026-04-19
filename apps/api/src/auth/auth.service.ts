import type { AuthResponse, PublicUser, RegisterInput, LoginInput } from '@kgm/types'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'

import { ApiException } from '../common/errors/api.exception'
import { NotificationService } from '../common/services/notification.service'
import { PasswordService } from '../common/services/password.service'
import type { Env } from '../config/env'
import { ENV_TOKEN } from '../config/env.token'
import { UsersService } from '../users/users.service'

import type { IssuedTokens } from './token.service'
import { OtpService } from './otp.service'
import { TokenService } from './token.service'

@Injectable()
export class AuthService {
  constructor(
    @Inject(ENV_TOKEN) private readonly env: Env,
    private readonly users: UsersService,
    private readonly password: PasswordService,
    private readonly tokens: TokenService,
    private readonly otp: OtpService,
    private readonly notifier: NotificationService,
  ) {}

  async register(input: RegisterInput): Promise<AuthResponse> {
    if (await this.users.findByEmail(input.email)) {
      throw new ApiException(
        'EMAIL_ALREADY_EXISTS',
        'Email already registered',
        HttpStatus.CONFLICT,
      )
    }
    if (await this.users.findByPhone(input.phone)) {
      throw new ApiException(
        'PHONE_ALREADY_EXISTS',
        'Phone already registered',
        HttpStatus.CONFLICT,
      )
    }
    const passwordHash = await this.password.hash(input.password)
    const user = await this.users.create({
      email: input.email,
      phone: input.phone,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
    })
    const tokens = await this.tokens.issueTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    })
    return { user: this.users.toPublic(user) as PublicUser, tokens }
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await this.users.findByIdentifier(input.identifier)
    if (!user || user.deletedAt !== null) {
      throw new ApiException(
        'INVALID_CREDENTIALS',
        'Invalid credentials',
        HttpStatus.UNAUTHORIZED,
      )
    }
    const ok = await this.password.compare(input.password, user.passwordHash)
    if (!ok) {
      throw new ApiException(
        'INVALID_CREDENTIALS',
        'Invalid credentials',
        HttpStatus.UNAUTHORIZED,
      )
    }
    const tokens = await this.tokens.issueTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    })
    return { user: this.users.toPublic(user) as PublicUser, tokens }
  }

  refresh(refreshToken: string): Promise<IssuedTokens> {
    return this.tokens.rotateRefresh(refreshToken)
  }

  logout(refreshToken: string): Promise<void> {
    return this.tokens.revokeRefresh(refreshToken)
  }

  async requestPhoneVerify(userId: string, phone: string): Promise<void> {
    const code = await this.otp.createPhoneOtp(userId)
    await this.notifier.sendSmsOtp(phone, code)
  }

  async confirmPhoneVerify(userId: string, code: string): Promise<void> {
    await this.otp.consumePhoneOtp(userId, code)
    await this.users.setPhoneVerified(userId)
  }

  async requestPasswordReset(email: string): Promise<void> {
    const normalized = email.toLowerCase().trim()
    const user = await this.users.findByEmail(normalized)
    if (!user) return
    const token = await this.otp.createPasswordResetOtp(normalized)
    const resetUrl = `${this.env.WEB_PUBLIC_URL}/reset-password?token=${token}`
    await this.notifier.sendPasswordResetEmail(normalized, resetUrl)
  }

  async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    const { email } = await this.otp.consumePasswordResetOtp(token)
    const user = await this.users.findByEmail(email)
    if (!user) {
      throw new ApiException('OTP_INVALID', 'Reset target no longer exists', HttpStatus.BAD_REQUEST)
    }
    const passwordHash = await this.password.hash(newPassword)
    await this.users.updatePassword(user.id, passwordHash)
    await this.tokens.revokeAllForUser(user.id)
  }
}
