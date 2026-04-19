import type { UserRole } from '@prisma/client'
import type { Request } from 'express'

export interface AuthUserPayload {
  id: string
  email: string
  role: UserRole
}

export interface AuthenticatedRequest extends Request {
  user: AuthUserPayload
}
