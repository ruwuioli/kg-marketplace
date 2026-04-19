import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthUserPayload } from '../common/types/authenticated-request'
import type { IStorageAdapter } from '../storage/storage.adapter'

import { UsersController } from './users.controller'
import { UsersService } from './users.service'

const findById = vi.fn()
const updateProfile = vi.fn()
const setAvatar = vi.fn()
const toPublic = vi.fn((u) => ({ ...u, createdAt: 'iso', updatedAt: 'iso' }))
const users = {
  findById,
  updateProfile,
  setAvatar,
  toPublic,
} as unknown as UsersService

const upload = vi.fn()
const storage = { upload, delete: vi.fn() } as unknown as IStorageAdapter

const auth: AuthUserPayload = { id: 'u1', email: 'a@b.c', role: 'BUYER' }

describe('UsersController', () => {
  let ctrl: UsersController

  beforeEach(() => {
    ;[findById, updateProfile, setAvatar, upload].forEach((m) => m.mockReset())
    toPublic.mockClear()
    ctrl = new UsersController(users, storage)
  })

  it('GET /users/me returns the current user', async () => {
    findById.mockResolvedValue({ id: 'u1', email: 'a@b.c' })
    const result = await ctrl.me(auth)
    expect(result.id).toBe('u1')
  })

  it('GET /users/me 404s when missing', async () => {
    findById.mockResolvedValue(null)
    await expect(ctrl.me(auth)).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('PATCH /users/me returns the updated profile', async () => {
    updateProfile.mockResolvedValue({ id: 'u1', firstName: 'Z' })
    const result = await ctrl.updateMe(auth, { firstName: 'Z' })
    expect(updateProfile).toHaveBeenCalledWith('u1', { firstName: 'Z' })
    expect(result.firstName).toBe('Z')
  })

  it('POST /users/me/avatar uploads, persists URL, and returns the user', async () => {
    upload.mockResolvedValue({ url: 'http://x/avatars/u1/a.jpg', key: 'avatars/u1/a.jpg' })
    setAvatar.mockResolvedValue({ id: 'u1', avatarUrl: 'http://x/avatars/u1/a.jpg' })
    const result = await ctrl.uploadAvatar(auth, {
      buffer: Buffer.from('img'),
      mimetype: 'image/jpeg',
      size: 3,
    })
    expect(upload).toHaveBeenCalledWith(
      expect.stringMatching(/^avatars\/u1\/[0-9a-f-]+\.jpg$/),
      expect.any(Buffer),
      'image/jpeg',
    )
    expect(setAvatar).toHaveBeenCalledWith('u1', 'http://x/avatars/u1/a.jpg')
    expect(result.avatarUrl).toBe('http://x/avatars/u1/a.jpg')
  })

  it('POST /users/me/avatar rejects bad MIME', async () => {
    await expect(
      ctrl.uploadAvatar(auth, { buffer: Buffer.from('x'), mimetype: 'image/gif', size: 1 }),
    ).rejects.toMatchObject({ code: 'LISTING_IMAGE_INVALID_TYPE' })
    expect(upload).not.toHaveBeenCalled()
  })

  it('POST /users/me/avatar rejects oversize', async () => {
    await expect(
      ctrl.uploadAvatar(auth, {
        buffer: Buffer.from('x'),
        mimetype: 'image/jpeg',
        size: 6 * 1024 * 1024,
      }),
    ).rejects.toMatchObject({ code: 'LISTING_IMAGE_TOO_LARGE' })
  })
})
