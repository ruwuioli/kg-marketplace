import type { PublicUser } from '@kgm/types'
import { HttpStatus, Injectable } from '@nestjs/common'
import type { Prisma, User } from '@prisma/client'

import { ApiException } from '../common/errors/api.exception'
import { PrismaService } from '../prisma/prisma.service'

export interface CreateUserInput {
  email: string
  phone: string
  passwordHash: string
  firstName: string
  lastName: string
}

export interface UpdateProfileInput {
  firstName?: string
  lastName?: string
  bio?: string | null
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findFirst({ where: { id, deletedAt: null } })
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    })
  }

  findByPhone(phone: string): Promise<User | null> {
    return this.prisma.user.findFirst({ where: { phone, deletedAt: null } })
  }

  findByIdentifier(identifier: string): Promise<User | null> {
    if (identifier.startsWith('+')) return this.findByPhone(identifier)
    return this.findByEmail(identifier)
  }

  create(input: CreateUserInput): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: input.email,
        phone: input.phone,
        passwordHash: input.passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        role: 'BUYER',
        status: 'PENDING_VERIFICATION',
      },
    })
  }

  async updateProfile(id: string, input: UpdateProfileInput): Promise<User> {
    const data: Prisma.UserUpdateInput = {}
    if (input.firstName !== undefined) data.firstName = input.firstName
    if (input.lastName !== undefined) data.lastName = input.lastName
    if (input.bio !== undefined) data.bio = input.bio
    try {
      return await this.prisma.user.update({ where: { id }, data })
    } catch (err) {
      if (isPrismaNotFound(err)) {
        throw new ApiException('NOT_FOUND', 'User not found', HttpStatus.NOT_FOUND)
      }
      throw err
    }
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { passwordHash } })
  }

  async setAvatar(id: string, avatarUrl: string): Promise<User> {
    try {
      return await this.prisma.user.update({ where: { id }, data: { avatarUrl } })
    } catch (err) {
      if (isPrismaNotFound(err)) {
        throw new ApiException('NOT_FOUND', 'User not found', HttpStatus.NOT_FOUND)
      }
      throw err
    }
  }

  async setPhoneVerified(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { isPhoneVerified: true, status: 'ACTIVE' },
    })
  }

  toPublic(user: User): PublicUser {
    const { passwordHash: _pw, deletedAt: _del, createdAt, updatedAt, ...rest } = user
    return {
      ...rest,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    }
  }
}

function isPrismaNotFound(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'P2025'
}
