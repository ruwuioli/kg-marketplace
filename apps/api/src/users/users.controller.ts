import { randomUUID } from 'node:crypto'

import { UpdateUserSchema } from '@kgm/types'
import type { PublicUser, UpdateUserInput } from '@kgm/types'
import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Inject,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ZodValidationPipe } from 'nestjs-zod'

import { CurrentUser } from '../common/decorators/current-user.decorator'
import { ApiException } from '../common/errors/api.exception'
import type { AuthUserPayload } from '../common/types/authenticated-request'
import { STORAGE_TOKEN } from '../storage/storage.adapter'
import type { IStorageAdapter } from '../storage/storage.adapter'
import {
  ALLOWED_IMAGE_MIME,
  MAX_IMAGE_BYTES,
  isAllowedImageMime,
  mimeToExt,
} from '../storage/upload.constants'

import { UsersService } from './users.service'

interface MulterFile {
  buffer: Buffer
  mimetype: string
  size: number
}

@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    @Inject(STORAGE_TOKEN) private readonly storage: IStorageAdapter,
  ) {}

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

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_BYTES } }))
  async uploadAvatar(
    @CurrentUser() auth: AuthUserPayload,
    @UploadedFile() file: MulterFile,
  ): Promise<PublicUser> {
    if (!file?.buffer || file.size === 0) {
      throw new ApiException(
        'LISTING_IMAGE_INVALID_TYPE',
        'No file uploaded',
        HttpStatus.BAD_REQUEST,
      )
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new ApiException(
        'LISTING_IMAGE_TOO_LARGE',
        `File exceeds ${MAX_IMAGE_BYTES} bytes`,
        HttpStatus.PAYLOAD_TOO_LARGE,
      )
    }
    if (!isAllowedImageMime(file.mimetype)) {
      throw new ApiException(
        'LISTING_IMAGE_INVALID_TYPE',
        `Allowed types: ${ALLOWED_IMAGE_MIME.join(', ')}`,
        HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      )
    }
    const ext = mimeToExt(file.mimetype as (typeof ALLOWED_IMAGE_MIME)[number])
    const key = `avatars/${auth.id}/${randomUUID()}.${ext}`
    const { url } = await this.storage.upload(key, file.buffer, file.mimetype)
    const updated = await this.users.setAvatar(auth.id, url)
    return this.users.toPublic(updated)
  }
}
