import { HttpStatus } from '@nestjs/common'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { ApiException } from '../common/errors/api.exception'
import type { AuthUserPayload } from '../common/types/authenticated-request'

import { UsersController } from './users.controller'
import type { UsersService } from './users.service'

function makeService(): UsersService {
  return {
    findById: vi.fn(),
    updateProfile: vi.fn(),
    toPublic: vi.fn((u: unknown) => u),
  } as unknown as UsersService
}

const authUser: AuthUserPayload = { id: 'u1', email: 'a@example.com', role: 'BUYER' }

describe('UsersController', () => {
  let svc: UsersService
  let controller: UsersController

  beforeEach(() => {
    svc = makeService()
    controller = new UsersController(svc)
  })

  describe('GET /users/me', () => {
    it('returns the current user', async () => {
      const user = { id: 'u1' }
      ;(svc.findById as ReturnType<typeof vi.fn>).mockResolvedValue(user)
      const result = await controller.me(authUser)
      expect(svc.findById).toHaveBeenCalledWith('u1')
      expect(result).toBe(user)
    })

    it('throws NOT_FOUND when user disappears', async () => {
      ;(svc.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null)
      await expect(controller.me(authUser)).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: expect.any(String),
      } as unknown as ApiException)
    })
  })

  describe('PATCH /users/me', () => {
    it('delegates to service and returns public user', async () => {
      const updated = { id: 'u1', firstName: 'New' }
      ;(svc.updateProfile as ReturnType<typeof vi.fn>).mockResolvedValue(updated)
      const result = await controller.updateMe(authUser, { firstName: 'New' })
      expect(svc.updateProfile).toHaveBeenCalledWith('u1', { firstName: 'New' })
      expect(result).toEqual(updated)
    })
  })
})
