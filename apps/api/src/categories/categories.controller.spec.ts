import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CategoriesController } from './categories.controller'
import { CategoriesService } from './categories.service'

const findTree = vi.fn()
const svc = { findTree } as unknown as CategoriesService

describe('CategoriesController', () => {
  let ctrl: CategoriesController

  beforeEach(() => {
    findTree.mockReset()
    ctrl = new CategoriesController(svc)
  })

  it('returns the tree from the service', async () => {
    findTree.mockResolvedValue([{ id: 'a', children: [] }])
    const result = await ctrl.list()
    expect(result).toEqual([{ id: 'a', children: [] }])
    expect(findTree).toHaveBeenCalledTimes(1)
  })
})
