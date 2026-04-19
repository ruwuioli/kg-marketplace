import { z } from 'zod'

export const UserRoleSchema = z.enum(['BUYER', 'SELLER', 'ADMIN'])
export const UserStatusSchema = z.enum(['ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION'])

export const PublicUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  role: UserRoleSchema,
  status: UserStatusSchema,
  firstName: z.string(),
  lastName: z.string(),
  avatarUrl: z.string().url().nullable(),
  bio: z.string().nullable(),
  isPhoneVerified: z.boolean(),
  isEmailVerified: z.boolean(),
  isIdentityVerified: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type PublicUser = z.infer<typeof PublicUserSchema>

export const UpdateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).nullable().optional(),
})

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>
