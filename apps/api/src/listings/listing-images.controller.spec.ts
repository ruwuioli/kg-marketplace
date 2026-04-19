import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthUserPayload } from '../common/types/authenticated-request'

import { ListingImagesController } from './listing-images.controller'
import { ListingImagesService } from './listing-images.service'

const addImage = vi.fn()
const removeImage = vi.fn()
const svc = { addImage, removeImage } as unknown as ListingImagesService

const auth: AuthUserPayload = { id: 'u1', email: 'a@b.c', role: 'BUYER' }
const file = { buffer: Buffer.from('img'), mimetype: 'image/jpeg', size: 3 }

describe('ListingImagesController', () => {
  let ctrl: ListingImagesController

  beforeEach(() => {
    addImage.mockReset()
    removeImage.mockReset()
    ctrl = new ListingImagesController(svc)
  })

  it('POST forwards file and ids to addImage', async () => {
    addImage.mockResolvedValue({ id: 'i1', url: 'u', sortOrder: 0 })
    const result = await ctrl.upload(auth, 'l1', file)
    expect(addImage).toHaveBeenCalledWith('u1', 'l1', file)
    expect(result).toEqual({ id: 'i1', url: 'u', sortOrder: 0 })
  })

  it('DELETE forwards ids and returns null', async () => {
    removeImage.mockResolvedValue(undefined)
    const result = await ctrl.remove(auth, 'l1', 'i1')
    expect(removeImage).toHaveBeenCalledWith('u1', 'l1', 'i1')
    expect(result).toBeNull()
  })
})
