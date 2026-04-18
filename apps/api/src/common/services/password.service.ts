import { Inject, Injectable } from '@nestjs/common'
import * as bcrypt from 'bcrypt'

import type { Env } from '../../config/env'
import { ENV_TOKEN } from '../../config/env.token'

@Injectable()
export class PasswordService {
  constructor(@Inject(ENV_TOKEN) private readonly env: Env) {}

  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.env.BCRYPT_COST)
  }

  compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash)
  }
}
