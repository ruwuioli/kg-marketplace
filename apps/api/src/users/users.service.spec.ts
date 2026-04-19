import { describe, it, expect, vi, beforeEach } from 'vitest'

import { ApiException } from '../common/errors/api.exception'
import type { PrismaService } from '../prisma/prisma.service'

import { UsersService } from './users.service'

type MockPrisma = {
  user: {
    findUnique: ReturnType<typeof vi.fn>
    findFirst: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
}

function makePrisma(): MockPrisma {
  return {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  }
}

function dbUser(overrides: Partial<Record<string, unknown>> = {}) {
  const now = new Date('2026-04-19T10:00:00.000Z')
  return {
    id: 'u1',
    email: 'a@example.com',
    phone: '+996700111222',
    passwordHash: '$2b$12$hash',
    role: 'BUYER',
    status: 'ACTIVE',
    firstName: 'Ann',
    lastName: 'Ko',
    avatarUrl: null,
    bio: null,
    isPhoneVerified: false,
    isEmailVerified: false,
    isIdentityVerified: false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  }
}

describe('UsersService', () => {
  let prisma: MockPrisma
  let service: UsersService

  beforeEach(() => {
    prisma = makePrisma()
    service = new UsersService(prisma as unknown as PrismaService)
  })

  describe('findById', () => {
    it('returns user when found and not soft-deleted', async () => {
      prisma.user.findFirst.mockResolvedValue(dbUser())
      const result = await service.findById('u1')
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { id: 'u1', deletedAt: null },
      })
      expect(result?.id).toBe('u1')
    })

    it('returns null when user missing', async () => {
      prisma.user.findFirst.mockResolvedValue(null)
      const result = await service.findById('missing')
      expect(result).toBeNull()
    })
  })

  describe('findByIdentifier', () => {
    it('looks up by phone when identifier starts with +', async () => {
      prisma.user.findFirst.mockResolvedValue(dbUser())
      await service.findByIdentifier('+996700111222')
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { phone: '+996700111222', deletedAt: null },
      })
    })

    it('looks up by lowercased email otherwise', async () => {
      prisma.user.findFirst.mockResolvedValue(dbUser())
      await service.findByIdentifier('A@Example.com')
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'a@example.com', deletedAt: null },
      })
    })
  })

  describe('create', () => {
    it('persists a new user with provided fields', async () => {
      prisma.user.create.mockResolvedValue(dbUser({ id: 'u2' }))
      const result = await service.create({
        email: 'a@example.com',
        phone: '+996700111222',
        passwordHash: '$2b$12$x',
        firstName: 'Ann',
        lastName: 'Ko',
      })
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'a@example.com',
          phone: '+996700111222',
          passwordHash: '$2b$12$x',
          firstName: 'Ann',
          lastName: 'Ko',
          role: 'BUYER',
          status: 'PENDING_VERIFICATION',
        },
      })
      expect(result.id).toBe('u2')
    })
  })

  describe('updateProfile', () => {
    it('updates allowed fields and returns updated record', async () => {
      prisma.user.update.mockResolvedValue(dbUser({ firstName: 'New' }))
      const result = await service.updateProfile('u1', { firstName: 'New' })
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { firstName: 'New' },
      })
      expect(result.firstName).toBe('New')
    })

    it('throws NOT_FOUND when prisma raises P2025', async () => {
      prisma.user.update.mockRejectedValue(
        Object.assign(new Error('no'), { code: 'P2025' }),
      )
      await expect(service.updateProfile('missing', { firstName: 'x' })).rejects.toBeInstanceOf(
        ApiException,
      )
    })
  })

  describe('toPublic', () => {
    it('omits passwordHash and deletedAt and ISO-serializes dates', () => {
      const result = service.toPublic(dbUser())
      expect(result).not.toHaveProperty('passwordHash')
      expect(result).not.toHaveProperty('deletedAt')
      expect(result.createdAt).toBe('2026-04-19T10:00:00.000Z')
    })
  })
})
