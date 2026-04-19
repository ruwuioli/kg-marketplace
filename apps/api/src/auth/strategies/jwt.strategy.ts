import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

import { ApiException } from '../../common/errors/api.exception'
import type { AuthUserPayload } from '../../common/types/authenticated-request'
import type { Env } from '../../config/env'
import { ENV_TOKEN } from '../../config/env.token'
import { UsersService } from '../../users/users.service'

interface JwtPayload {
  sub: string
  email: string
  role: AuthUserPayload['role']
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(ENV_TOKEN) env: Env,
    private readonly users: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: env.JWT_SECRET,
    })
  }

  async validate(payload: JwtPayload): Promise<AuthUserPayload> {
    const user = await this.users.findById(payload.sub)
    if (!user) {
      throw new ApiException('UNAUTHORIZED', 'User not found', HttpStatus.UNAUTHORIZED)
    }
    return { id: user.id, email: user.email, role: user.role }
  }
}
