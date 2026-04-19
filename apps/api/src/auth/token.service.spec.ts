import { JwtModule, JwtService } from '@nestjs/jwt'
import { Test } from '@nestjs/testing'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import type { Env } from '../config/env'
import type { PrismaService } from '../prisma/prisma.service'

import { TokenService } from './token.service'

const env: Env = {
  NODE_ENV: 'test',
  API_PORT: 3001,
  DATABASE_URL: 'postgres://u:p@h:5432/d',
  REDIS_URL: 'redis://h:6379',
  JWT_SECRET: 'test-access-secret-1234567890',
  JWT_REFRESH_SECRET: 'test-refresh-secret-1234567890',
  JWT_ACCESS_EXPIRES_IN: '15m',
  JWT_REFRESH_EXPIRES_IN: '30d',
  BCRYPT_COST: 4,
  OTP_REQUEST_COOLDOWN_SECONDS: 60,
  OTP_VERIFY_EXPIRES_MINUTES: 10,
  OTP_MAX_CONFIRM_ATTEMPTS: 5,
  PASSWORD_RESET_EXPIRES_MINUTES: 30,
  WEB_PUBLIC_URL: 'http://localhost:3000',
  MINIO_ENDPOINT: 'localhost',
  MINIO_PORT: 9000,
  MINIO_USE_SSL: false,
  MINIO_ACCESS_KEY: 'x',
  MINIO_SECRET_KEY: 'x',
  MINIO_BUCKET: 'kgm-media',
  MINIO_PUBLIC_URL: 'http://localhost:9000/kgm-media',
}

type MockPrisma = {
  refreshToken: {
    create: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
    deleteMany: ReturnType<typeof vi.fn>
  }
  user: { findUnique: ReturnType<typeof vi.fn> }
}

function makePrisma(): MockPrisma {
  return {
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'u1',
        email: 'a@example.com',
        role: 'BUYER',
        deletedAt: null,
      }),
    },
  }
}

describe('TokenService', () => {
  let prisma: MockPrisma
  let jwt: JwtService
  let service: TokenService

  beforeEach(async () => {
    prisma = makePrisma()
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({})],
    }).compile()
    jwt = moduleRef.get(JwtService)
    service = new TokenService(env, prisma as unknown as PrismaService, jwt)
  })

  it('issueTokens returns a signed access + refresh pair and persists refresh', async () => {
    prisma.refreshToken.create.mockResolvedValue({})
    const result = await service.issueTokens({ id: 'u1', email: 'a@example.com', role: 'BUYER' })
    expect(result.accessToken).toMatch(/^eyJ/)
    expect(result.refreshToken).toMatch(/^eyJ/)
    const now = Date.now()
    expect(new Date(result.accessTokenExpiresAt).getTime()).toBeGreaterThan(now)
    expect(new Date(result.refreshTokenExpiresAt).getTime()).toBeGreaterThan(now)
    expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1)
    const call = prisma.refreshToken.create.mock.calls[0][0]
    expect(call.data.token).toBe(result.refreshToken)
    expect(call.data.userId).toBe('u1')
  })

  it('verifyAccess decodes a token signed with the access secret', async () => {
    prisma.refreshToken.create.mockResolvedValue({})
    const tokens = await service.issueTokens({ id: 'u1', email: 'a@example.com', role: 'BUYER' })
    const payload = service.verifyAccess(tokens.accessToken)
    expect(payload.sub).toBe('u1')
    expect(payload.role).toBe('BUYER')
  })

  it('verifyRefresh throws TOKEN_INVALID for a tampered token', () => {
    expect(() => service.verifyRefresh('not-a-jwt')).toThrow(/TOKEN_INVALID|invalid/i)
  })

  it('rotateRefresh deletes old row and creates a new one', async () => {
    prisma.refreshToken.create.mockResolvedValue({})
    const first = await service.issueTokens({ id: 'u1', email: 'a@example.com', role: 'BUYER' })
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'r1',
      token: first.refreshToken,
      userId: 'u1',
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
    })
    prisma.refreshToken.delete.mockResolvedValue({})
    const rotated = await service.rotateRefresh(first.refreshToken)
    expect(prisma.refreshToken.delete).toHaveBeenCalledWith({ where: { token: first.refreshToken } })
    expect(rotated.refreshToken).not.toBe(first.refreshToken)
  })

  it('rotateRefresh throws TOKEN_INVALID when row missing', async () => {
    prisma.refreshToken.create.mockResolvedValue({})
    const tokens = await service.issueTokens({ id: 'u1', email: 'a@example.com', role: 'BUYER' })
    prisma.refreshToken.findUnique.mockResolvedValue(null)
    await expect(service.rotateRefresh(tokens.refreshToken)).rejects.toMatchObject({
      code: 'TOKEN_INVALID',
    })
  })

  it('revokeAllForUser deletes all rows for a user', async () => {
    prisma.refreshToken.deleteMany.mockResolvedValue({ count: 3 })
    await service.revokeAllForUser('u1')
    expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } })
  })
})
