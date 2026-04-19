import {
  ConfirmPasswordResetSchema,
  ConfirmPhoneVerifySchema,
  LoginSchema,
  LogoutSchema,
  RefreshTokenSchema,
  RegisterSchema,
  RequestPasswordResetSchema,
} from '@kgm/types'
import type {
  AuthResponse,
  ConfirmPasswordResetInput,
  ConfirmPhoneVerifyInput,
  LoginInput,
  LogoutInput,
  RefreshTokenInput,
  RegisterInput,
  RequestPasswordResetInput,
  Tokens,
} from '@kgm/types'
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { ZodValidationPipe } from 'nestjs-zod'

import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Public } from '../common/decorators/public.decorator'
import { ApiException } from '../common/errors/api.exception'
import type { AuthUserPayload } from '../common/types/authenticated-request'
import { UsersService } from '../users/users.service'

import { AuthService } from './auth.service'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}

  @Public()
  @Post('register')
  register(
    @Body(new ZodValidationPipe(RegisterSchema)) input: RegisterInput,
  ): Promise<AuthResponse> {
    return this.auth.register(input)
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body(new ZodValidationPipe(LoginSchema)) input: LoginInput): Promise<AuthResponse> {
    return this.auth.login(input)
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body(new ZodValidationPipe(RefreshTokenSchema)) input: RefreshTokenInput,
  ): Promise<{ tokens: Tokens }> {
    const tokens = await this.auth.refresh(input.refreshToken)
    return { tokens }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body(new ZodValidationPipe(LogoutSchema)) input: LogoutInput,
  ): Promise<null> {
    await this.auth.logout(input.refreshToken)
    return null
  }

  @Post('verify-phone/request')
  @HttpCode(HttpStatus.OK)
  async requestPhoneVerify(@CurrentUser() auth: AuthUserPayload): Promise<null> {
    const user = await this.users.findById(auth.id)
    if (!user?.phone) {
      throw new ApiException(
        'NOT_FOUND',
        'No phone number on file',
        HttpStatus.BAD_REQUEST,
      )
    }
    await this.auth.requestPhoneVerify(auth.id, user.phone)
    return null
  }

  @Post('verify-phone/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmPhoneVerify(
    @CurrentUser() auth: AuthUserPayload,
    @Body(new ZodValidationPipe(ConfirmPhoneVerifySchema)) input: ConfirmPhoneVerifyInput,
  ): Promise<null> {
    await this.auth.confirmPhoneVerify(auth.id, input.code)
    return null
  }

  @Public()
  @Post('password-reset/request')
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(
    @Body(new ZodValidationPipe(RequestPasswordResetSchema)) input: RequestPasswordResetInput,
  ): Promise<null> {
    await this.auth.requestPasswordReset(input.email)
    return null
  }

  @Public()
  @Post('password-reset/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmPasswordReset(
    @Body(new ZodValidationPipe(ConfirmPasswordResetSchema)) input: ConfirmPasswordResetInput,
  ): Promise<null> {
    await this.auth.confirmPasswordReset(input.token, input.newPassword)
    return null
  }
}
