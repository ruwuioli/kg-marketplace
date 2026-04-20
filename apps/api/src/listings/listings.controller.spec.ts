import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthUserPayload } from '../common/types/authenticated-request'

import { ListingsController } from './listings.controller'
import type { ListingsService } from './listings.service'

const findPublicMany = vi.fn()
const findOwnedMany = vi.fn()
const findPublicById = vi.fn()
const create = vi.fn()
const update = vi.fn()
const softDelete = vi.fn()

const svc = {
  findPublicMany,
  findOwnedMany,
  findPublicById,
  create,
  update,
  softDelete,
} as unknown as ListingsService

const auth: AuthUserPayload = { id: 'u1', email: 'a@b.c', role: 'BUYER' }

describe('ListingsController', () => {
  let ctrl: ListingsController

  beforeEach(() => {
    ;[findPublicMany, findOwnedMany, findPublicById, create, update, softDelete].forEach((m) =>
      m.mockReset(),
    )
    ctrl = new ListingsController(svc)
  })

  it('GET /listings delegates to findPublicMany', async () => {
    findPublicMany.mockResolvedValue({ data: [], nextCursor: null })
    await ctrl.list({ limit: 20 })
    expect(findPublicMany).toHaveBeenCalledWith({ limit: 20 })
  })

  it('GET /listings/mine delegates to findOwnedMany with caller id', async () => {
    findOwnedMany.mockResolvedValue({ data: [], nextCursor: null })
    await ctrl.mine(auth, { limit: 20 })
    expect(findOwnedMany).toHaveBeenCalledWith('u1', { limit: 20 })
  })

  it('GET /listings/:id delegates to findPublicById', async () => {
    findPublicById.mockResolvedValue({ id: 'l1' })
    const result = await ctrl.detail('l1')
    expect(findPublicById).toHaveBeenCalledWith('l1')
    expect(result).toMatchObject({ id: 'l1' })
  })

  it('POST /listings creates with caller id', async () => {
    create.mockResolvedValue({ id: 'l1' })
    await ctrl.create(auth, {
      title: 'Title here ten',
      description: 'Twenty plus characters description text',
      price: 100,
      condition: 'NEW',
      categoryId: 'c1',
      location: 'Bishkek',
    })
    expect(create).toHaveBeenCalledWith('u1', expect.objectContaining({ title: 'Title here ten' }))
  })

  it('PATCH /listings/:id forwards id and body', async () => {
    update.mockResolvedValue({ id: 'l1' })
    await ctrl.update(auth, 'l1', { title: 'Title here ten more' })
    expect(update).toHaveBeenCalledWith('u1', 'l1', { title: 'Title here ten more' })
  })

  it('DELETE /listings/:id returns null', async () => {
    softDelete.mockResolvedValue(undefined)
    const result = await ctrl.remove(auth, 'l1')
    expect(softDelete).toHaveBeenCalledWith('u1', 'l1')
    expect(result).toBeNull()
  })
})
