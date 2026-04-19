import { z } from 'zod'

import { PublicUserSchema } from './user'

const phoneRegex = /^\+996\d{9}$/
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')

export const RegisterSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  phone: z.string().regex(phoneRegex, 'Phone must be in +996XXXXXXXXX format'),
  password: passwordSchema,
  firstName: z.string().min(1).max(100).trim(),
  lastName: z.string().min(1).max(100).trim(),
})

export type RegisterInput = z.infer<typeof RegisterSchema>

export const LoginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
})

export type LoginInput = z.infer<typeof LoginSchema>

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
})

export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>

export const LogoutSchema = z.object({
  refreshToken: z.string().min(1),
})

export type LogoutInput = z.infer<typeof LogoutSchema>

export const ConfirmPhoneVerifySchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
})

export type ConfirmPhoneVerifyInput = z.infer<typeof ConfirmPhoneVerifySchema>

export const RequestPasswordResetSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
})

export type RequestPasswordResetInput = z.infer<typeof RequestPasswordResetSchema>

export const ConfirmPasswordResetSchema = z.object({
  token: z.string().min(16),
  newPassword: passwordSchema,
})

export type ConfirmPasswordResetInput = z.infer<typeof ConfirmPasswordResetSchema>

export const TokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  accessTokenExpiresAt: z.string().datetime(),
  refreshTokenExpiresAt: z.string().datetime(),
})

export type Tokens = z.infer<typeof TokensSchema>

export const AuthResponseSchema = z.object({
  user: PublicUserSchema,
  tokens: TokensSchema,
})

export type AuthResponse = z.infer<typeof AuthResponseSchema>
