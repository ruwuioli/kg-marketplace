import { z } from 'zod'

export interface CategoryNode {
  id: string
  slug: string
  nameRu: string
  nameKy: string
  iconUrl: string | null
  sortOrder: number
  children: CategoryNode[]
}

export const CategoryNodeSchema: z.ZodType<CategoryNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    slug: z.string(),
    nameRu: z.string(),
    nameKy: z.string(),
    iconUrl: z.string().url().nullable(),
    sortOrder: z.number().int(),
    children: z.array(CategoryNodeSchema),
  }),
)

export const CategoryTreeSchema = z.array(CategoryNodeSchema)
export type CategoryTree = z.infer<typeof CategoryTreeSchema>
