import { createParamDecorator } from '@nestjs/common'
import type { ExecutionContext } from '@nestjs/common'

import type { AuthUserPayload, AuthenticatedRequest } from '../types/authenticated-request'

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUserPayload => {
    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>()
    return req.user
  },
)
