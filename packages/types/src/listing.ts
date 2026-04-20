import { z } from 'zod'

export const ListingConditionSchema = z.enum([
  'NEW',
  'LIKE_NEW',
  'GOOD',
  'FAIR',
  'FOR_PARTS',
])
export type ListingCondition = z.infer<typeof ListingConditionSchema>

export const ListingStatusSchema = z.enum([
  'DRAFT',
  'ACTIVE',
  'PAUSED',
  'SOLD',
  'REJECTED',
  'EXPIRED',
])
export type ListingStatus = z.infer<typeof ListingStatusSchema>

// Statuses a user may set via PATCH. REJECTED + EXPIRED are admin/auto only.
export const UpdatableListingStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'SOLD'])

export const PublicListingImageSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  sortOrder: z.number().int(),
})
export type PublicListingImage = z.infer<typeof PublicListingImageSchema>

export const PublicListingSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  price: z.string(), // Decimal serialized as string
  currency: z.string(),
  condition: ListingConditionSchema,
  status: ListingStatusSchema,
  location: z.string(),
  viewCount: z.number().int(),
  sellerId: z.string(),
  categoryId: z.string(),
  images: z.array(PublicListingImageSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type PublicListing = z.infer<typeof PublicListingSchema>

export const CreateListingSchema = z.object({
  title: z.string().min(10).max(100),
  description: z.string().min(20).max(5000),
  price: z.coerce.number().positive().int(),
  condition: ListingConditionSchema,
  categoryId: z.string().min(1),
  location: z.string().min(1).max(200),
})
export type CreateListingInput = z.infer<typeof CreateListingSchema>

export const UpdateListingSchema = z
  .object({
    title: z.string().min(10).max(100).optional(),
    description: z.string().min(20).max(5000).optional(),
    price: z.coerce.number().positive().int().optional(),
    condition: ListingConditionSchema.optional(),
    categoryId: z.string().min(1).optional(),
    location: z.string().min(1).max(200).optional(),
    status: UpdatableListingStatusSchema.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field required' })
export type UpdateListingInput = z.infer<typeof UpdateListingSchema>

export const ListingsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(50).default(20),
  categoryId: z.string().optional(),
  sellerId: z.string().optional(),
})
export type ListingsQuery = z.infer<typeof ListingsQuerySchema>

export const ListingsPageSchema = z.object({
  data: z.array(PublicListingSchema),
  nextCursor: z.string().nullable(),
})
export type ListingsPage = z.infer<typeof ListingsPageSchema>
