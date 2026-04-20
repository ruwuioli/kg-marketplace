import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PrismaService } from '../prisma/prisma.service'
import type { IStorageAdapter } from '../storage/storage.adapter'

import { ListingImagesService } from './listing-images.service'
import type { ListingsService } from './listings.service'

const count = vi.fn()
const findFirst = vi.fn()
const create = vi.fn()
const del = vi.fn()
const prisma = {
  listingImage: { count, findFirst, create, delete: del },
} as unknown as PrismaService

const assertOwnership = vi.fn()
const listings = { assertOwnership } as unknown as ListingsService

const upload = vi.fn()
const remove = vi.fn()
const storage = { upload, delete: remove } as unknown as IStorageAdapter

const file = (overrides: Partial<{ size: number; mimetype: string }> = {}) => ({
  buffer: Buffer.from('img'),
  mimetype: 'image/jpeg',
  size: 3,
  ...overrides,
})

describe('ListingImagesService', () => {
  let svc: ListingImagesService

  beforeEach(() => {
    ;[count, findFirst, create, del, assertOwnership, upload, remove].forEach((m) => m.mockReset())
    svc = new ListingImagesService(prisma, listings, storage)
  })

  it('rejects when listing already has 10 images', async () => {
    assertOwnership.mockResolvedValue({ id: 'l1' })
    count.mockResolvedValue(10)
    await expect(svc.addImage('u1', 'l1', file())).rejects.toMatchObject({
      code: 'LISTING_IMAGE_LIMIT_EXCEEDED',
    })
  })

  it('rejects oversize files', async () => {
    assertOwnership.mockResolvedValue({ id: 'l1' })
    await expect(
      svc.addImage('u1', 'l1', file({ size: 6 * 1024 * 1024 })),
    ).rejects.toMatchObject({ code: 'LISTING_IMAGE_TOO_LARGE' })
  })

  it('rejects bad MIME', async () => {
    assertOwnership.mockResolvedValue({ id: 'l1' })
    await expect(svc.addImage('u1', 'l1', file({ mimetype: 'image/gif' }))).rejects.toMatchObject({
      code: 'LISTING_IMAGE_INVALID_TYPE',
    })
  })

  it('uploads, persists, and assigns sortOrder = max+1', async () => {
    assertOwnership.mockResolvedValue({ id: 'l1' })
    count.mockResolvedValue(2)
    upload.mockResolvedValue({ url: 'http://x/a.jpg', key: 'listings/l1/a.jpg' })
    findFirst.mockResolvedValue({ sortOrder: 4 })
    create.mockResolvedValue({ id: 'i1', url: 'http://x/a.jpg', sortOrder: 5 })

    const result = await svc.addImage('u1', 'l1', file())
    expect(upload).toHaveBeenCalledWith(
      expect.stringMatching(/^listings\/l1\/[0-9a-f-]+\.jpg$/),
      expect.any(Buffer),
      'image/jpeg',
    )
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ sortOrder: 5, listingId: 'l1' }),
    })
    expect(result).toEqual({ id: 'i1', url: 'http://x/a.jpg', sortOrder: 5 })
  })

  it('first image gets sortOrder 0', async () => {
    assertOwnership.mockResolvedValue({ id: 'l1' })
    count.mockResolvedValue(0)
    upload.mockResolvedValue({ url: 'u', key: 'k' })
    findFirst.mockResolvedValue(null)
    create.mockResolvedValue({ id: 'i1', url: 'u', sortOrder: 0 })

    const result = await svc.addImage('u1', 'l1', file())
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ sortOrder: 0 }),
    })
    expect(result.sortOrder).toBe(0)
  })

  it('removeImage deletes from storage and DB', async () => {
    assertOwnership.mockResolvedValue({ id: 'l1' })
    findFirst.mockResolvedValue({ id: 'i1', listingId: 'l1', key: 'listings/l1/x.jpg' })
    remove.mockResolvedValue(undefined)
    del.mockResolvedValue(undefined)

    await svc.removeImage('u1', 'l1', 'i1')
    expect(remove).toHaveBeenCalledWith('listings/l1/x.jpg')
    expect(del).toHaveBeenCalledWith({ where: { id: 'i1' } })
  })

  it('removeImage 404s on missing image', async () => {
    assertOwnership.mockResolvedValue({ id: 'l1' })
    findFirst.mockResolvedValue(null)
    await expect(svc.removeImage('u1', 'l1', 'i1')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})
