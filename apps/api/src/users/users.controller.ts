import { UpdateUserSchema } from '@kgm/types'
import type { PublicUser, UpdateUserInput } from '@kgm/types'
import { Body, Controller, Get, HttpStatus, Patch } from '@nestjs/common'
import { ZodValidationPipe } from 'nestjs-zod'

import { CurrentUser } from '../common/decorators/current-user.decorator'
import { ApiException } from '../common/errors/api.exception'
import type { AuthUserPayload } from '../common/types/authenticated-request'

import { UsersService } from './users.service'

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  async me(@CurrentUser() auth: AuthUserPayload): Promise<PublicUser> {
    const user = await this.users.findById(auth.id)
    if (!user) throw new ApiException('NOT_FOUND', 'User not found', HttpStatus.NOT_FOUND)
    return this.users.toPublic(user)
  }

  @Patch('me')
  async updateMe(
    @CurrentUser() auth: AuthUserPayload,
    @Body(new ZodValidationPipe(UpdateUserSchema)) input: UpdateUserInput,
  ): Promise<PublicUser> {
    const updated = await this.users.updateProfile(auth.id, input)
    return this.users.toPublic(updated)
  }
}
