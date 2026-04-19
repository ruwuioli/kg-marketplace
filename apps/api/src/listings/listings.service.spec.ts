import { Decimal } from '@prisma/client/runtime/library'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PrismaService } from '../prisma/prisma.service'

import { ListingsService } from './listings.service'

const findFirst = vi.fn()
const findMany = vi.fn()
const create = vi.fn()
const update = vi.fn()

const prisma = {
  listing: { findFirst, findMany, create, update },
} as unknown as PrismaService

const baseListing = {
  id: 'l1',
  title: 'Title here ten',
  description: 'Twenty plus characters description text',
  price: new Decimal('1000'),
  currency: 'KGS',
  condition: 'NEW',
  status: 'DRAFT',
  location: 'Bishkek',
  latitude: null,
  longitude: null,
  viewCount: 0,
  isFeatured: false,
  featuredUntil: null,
  attributes: {},
  sellerId: 'u1',
  categoryId: 'c1',
  createdAt: new Date('2026-04-19T00:00:00Z'),
  updatedAt: new Date('2026-04-19T00:00:00Z'),
  expiresAt: null,
  deletedAt: null,
  images: [],
}

describe('ListingsService', () => {
  let svc: ListingsService

  beforeEach(() => {
    findFirst.mockReset()
    findMany.mockReset()
    create.mockReset()
    update.mockReset()
    svc = new ListingsService(prisma)
  })

  it('creates a listing in DRAFT', async () => {
    create.mockResolvedValue(baseListing)
    const result = await svc.create('u1', {
      title: 'Title here ten',
      description: 'Twenty plus characters description text',
      price: 1000,
      condition: 'NEW',
      categoryId: 'c1',
      location: 'Bishkek',
    })
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ sellerId: 'u1', status: 'DRAFT' }),
      }),
    )
    expect(result.status).toBe('DRAFT')
    expect(result.price).toBe('1000')
  })

  it('findPublicById returns 404 when missing', async () => {
    findFirst.mockResolvedValue(null)
    await expect(svc.findPublicById('x')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('findPublicById increments viewCount and returns +1', async () => {
    findFirst.mockResolvedValue({ ...baseListing, status: 'ACTIVE', viewCount: 5 })
    update.mockResolvedValue(undefined)
    const result = await svc.findPublicById('l1')
    expect(update).toHaveBeenCalledWith({
      where: { id: 'l1' },
      data: { viewCount: { increment: 1 } },
    })
    expect(result.viewCount).toBe(6)
  })

  it('findPublicMany returns nextCursor when more rows exist', async () => {
    const rows = Array.from({ length: 21 }, (_, i) => ({
      ...baseListing,
      id: `l${21 - i}`,
      status: 'ACTIVE',
    }))
    findMany.mockResolvedValue(rows)
    const result = await svc.findPublicMany({ limit: 20 })
    expect(result.data).toHaveLength(20)
    expect(result.nextCursor).toBe('l2')
  })

  it('findPublicMany returns null cursor when fewer rows', async () => {
    findMany.mockResolvedValue([{ ...baseListing, status: 'ACTIVE' }])
    const result = await svc.findPublicMany({ limit: 20 })
    expect(result.nextCursor).toBeNull()
  })

  it('update rejects non-owner with FORBIDDEN', async () => {
    findFirst.mockResolvedValue({ ...baseListing, sellerId: 'other' })
    await expect(
      svc.update('u1', 'l1', { title: 'New title here please' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('update rejects illegal status transition', async () => {
    findFirst.mockResolvedValue({ ...baseListing, status: 'SOLD' })
    await expect(svc.update('u1', 'l1', { status: 'ACTIVE' })).rejects.toMatchObject({
      code: 'INVALID_STATUS_TRANSITION',
    })
  })

  it('update applies allowed DRAFT → ACTIVE transition', async () => {
    findFirst.mockResolvedValue({ ...baseListing, status: 'DRAFT' })
    update.mockResolvedValue({ ...baseListing, status: 'ACTIVE' })
    const result = await svc.update('u1', 'l1', { status: 'ACTIVE' })
    expect(result.status).toBe('ACTIVE')
  })

  it('softDelete sets deletedAt for owner', async () => {
    findFirst.mockResolvedValue({ ...baseListing })
    update.mockResolvedValue(undefined)
    await svc.softDelete('u1', 'l1')
    expect(update).toHaveBeenCalledWith({
      where: { id: 'l1' },
      data: { deletedAt: expect.any(Date) },
    })
  })

  it('assertOwnership returns the listing for owner', async () => {
    findFirst.mockResolvedValue({ ...baseListing })
    const result = await svc.assertOwnership('u1', 'l1')
    expect(result.id).toBe('l1')
  })
})
