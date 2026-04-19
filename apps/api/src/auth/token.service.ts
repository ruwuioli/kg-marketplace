import { randomUUID } from 'node:crypto'

import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import type { UserRole } from '@prisma/client'

import { ApiException } from '../common/errors/api.exception'
import type { AuthUserPayload } from '../common/types/authenticated-request'
import type { Env } from '../config/env'
import { ENV_TOKEN } from '../config/env.token'
import { PrismaService } from '../prisma/prisma.service'

export interface IssuedTokens {
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt: string
  refreshTokenExpiresAt: string
}

export interface AccessTokenPayload {
  sub: string
  email: string
  role: UserRole
  iat: number
  exp: number
}

export interface RefreshTokenPayload {
  sub: string
  iat: number
  exp: number
}

@Injectable()
export class TokenService {
  constructor(
    @Inject(ENV_TOKEN) private readonly env: Env,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async issueTokens(user: AuthUserPayload): Promise<IssuedTokens> {
    const accessToken = this.jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      {
        secret: this.env.JWT_SECRET,
        expiresIn: this.env.JWT_ACCESS_EXPIRES_IN,
        jwtid: randomUUID(),
      },
    )
    const refreshToken = this.jwt.sign(
      { sub: user.id },
      {
        secret: this.env.JWT_REFRESH_SECRET,
        expiresIn: this.env.JWT_REFRESH_EXPIRES_IN,
        jwtid: randomUUID(),
      },
    )
    const accessPayload = this.jwt.decode(accessToken) as AccessTokenPayload
    const refreshPayload = this.jwt.decode(refreshToken) as RefreshTokenPayload
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(refreshPayload.exp * 1000),
      },
    })
    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt: new Date(accessPayload.exp * 1000).toISOString(),
      refreshTokenExpiresAt: new Date(refreshPayload.exp * 1000).toISOString(),
    }
  }

  verifyAccess(token: string): AccessTokenPayload {
    try {
      return this.jwt.verify<AccessTokenPayload>(token, { secret: this.env.JWT_SECRET })
    } catch {
      throw new ApiException('TOKEN_INVALID', 'Invalid access token', HttpStatus.UNAUTHORIZED)
    }
  }

  verifyRefresh(token: string): RefreshTokenPayload {
    try {
      return this.jwt.verify<RefreshTokenPayload>(token, { secret: this.env.JWT_REFRESH_SECRET })
    } catch {
      throw new ApiException('TOKEN_INVALID', 'Invalid refresh token', HttpStatus.UNAUTHORIZED)
    }
  }

  async rotateRefresh(oldToken: string): Promise<IssuedTokens> {
    const payload = this.verifyRefresh(oldToken)
    const row = await this.prisma.refreshToken.findUnique({ where: { token: oldToken } })
    if (!row || row.expiresAt.getTime() < Date.now()) {
      throw new ApiException(
        'TOKEN_INVALID',
        'Refresh token not recognized',
        HttpStatus.UNAUTHORIZED,
      )
    }
    await this.prisma.refreshToken.delete({ where: { token: oldToken } })
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } })
    if (!user || user.deletedAt !== null) {
      throw new ApiException('TOKEN_INVALID', 'User no longer exists', HttpStatus.UNAUTHORIZED)
    }
    return this.issueTokens({ id: user.id, email: user.email, role: user.role })
  }

  async revokeRefresh(token: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({ where: { token } })
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({ where: { userId } })
  }
}
