import type { CategoryNode } from '@kgm/types'
import { Injectable } from '@nestjs/common'
import type { Category } from '@prisma/client'

import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findTree(): Promise<CategoryNode[]> {
    const flat = await this.prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { nameRu: 'asc' }],
    })
    return buildTree(flat)
  }
}

function buildTree(rows: Category[]): CategoryNode[] {
  const byId = new Map<string, CategoryNode>()
  for (const row of rows) {
    byId.set(row.id, {
      id: row.id,
      slug: row.slug,
      nameRu: row.nameRu,
      nameKy: row.nameKy,
      iconUrl: row.iconUrl,
      sortOrder: row.sortOrder,
      children: [],
    })
  }
  const roots: CategoryNode[] = []
  for (const row of rows) {
    const node = byId.get(row.id)
    if (!node) continue
    if (row.parentId) {
      const parent = byId.get(row.parentId)
      if (parent) parent.children.push(node)
      else roots.push(node) // orphan: surface at top level
    } else {
      roots.push(node)
    }
  }
  return roots
}
