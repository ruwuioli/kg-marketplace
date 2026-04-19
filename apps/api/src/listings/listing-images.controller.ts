import type { PublicListingImage } from '@kgm/types'
import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'

import { CurrentUser } from '../common/decorators/current-user.decorator'
import type { AuthUserPayload } from '../common/types/authenticated-request'
import { MAX_IMAGE_BYTES } from '../storage/upload.constants'

import { ListingImagesService } from './listing-images.service'

interface MulterFile {
  buffer: Buffer
  mimetype: string
  size: number
}

@Controller('listings/:id/images')
export class ListingImagesController {
  constructor(private readonly images: ListingImagesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_BYTES } }))
  upload(
    @CurrentUser() auth: AuthUserPayload,
    @Param('id') id: string,
    @UploadedFile() file: MulterFile,
  ): Promise<PublicListingImage> {
    return this.images.addImage(auth.id, id, file)
  }

  @Delete(':imageId')
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentUser() auth: AuthUserPayload,
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ): Promise<null> {
    await this.images.removeImage(auth.id, id, imageId)
    return null
  }
}
