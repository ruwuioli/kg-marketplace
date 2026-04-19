import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PrismaService } from '../prisma/prisma.service'

import { CategoriesService } from './categories.service'

const findMany = vi.fn()
const prisma = { category: { findMany } } as unknown as PrismaService

describe('CategoriesService', () => {
  let svc: CategoriesService

  beforeEach(() => {
    findMany.mockReset()
    svc = new CategoriesService(prisma)
  })

  it('builds a nested tree from a flat list', async () => {
    findMany.mockResolvedValue([
      { id: 'a', slug: 'transport', nameRu: 'T', nameKy: 'T', iconUrl: null, sortOrder: 1, parentId: null, description: null, createdAt: new Date(), updatedAt: new Date() },
      { id: 'b', slug: 'cars', nameRu: 'C', nameKy: 'C', iconUrl: null, sortOrder: 1, parentId: 'a', description: null, createdAt: new Date(), updatedAt: new Date() },
      { id: 'c', slug: 'real-estate', nameRu: 'R', nameKy: 'R', iconUrl: null, sortOrder: 2, parentId: null, description: null, createdAt: new Date(), updatedAt: new Date() },
    ])
    const tree = await svc.findTree()
    expect(tree).toHaveLength(2)
    expect(tree[0]).toMatchObject({ id: 'a', children: [{ id: 'b', children: [] }] })
    expect(tree[1]).toMatchObject({ id: 'c', children: [] })
  })

  it('surfaces orphans (parent missing) as roots', async () => {
    findMany.mockResolvedValue([
      { id: 'b', slug: 'cars', nameRu: 'C', nameKy: 'C', iconUrl: null, sortOrder: 1, parentId: 'missing', description: null, createdAt: new Date(), updatedAt: new Date() },
    ])
    const tree = await svc.findTree()
    expect(tree.map((n) => n.id)).toEqual(['b'])
  })

  it('returns [] on empty', async () => {
    findMany.mockResolvedValue([])
    expect(await svc.findTree()).toEqual([])
  })
})
