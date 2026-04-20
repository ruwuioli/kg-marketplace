import { randomUUID } from 'node:crypto'

import type { PublicListingImage } from '@kgm/types'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'

import { ApiException } from '../common/errors/api.exception'
import { PrismaService } from '../prisma/prisma.service'
import { STORAGE_TOKEN } from '../storage/storage.adapter'
import type { IStorageAdapter } from '../storage/storage.adapter'
import {
  ALLOWED_IMAGE_MIME,
  MAX_IMAGE_BYTES,
  isAllowedImageMime,
  mimeToExt,
} from '../storage/upload.constants'

import { ListingsService } from './listings.service'

const MAX_IMAGES_PER_LISTING = 10

export interface UploadedFile {
  buffer: Buffer
  mimetype: string
  size: number
}

@Injectable()
export class ListingImagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly listings: ListingsService,
    @Inject(STORAGE_TOKEN) private readonly storage: IStorageAdapter,
  ) {}

  async addImage(
    sellerId: string,
    listingId: string,
    file: UploadedFile,
  ): Promise<PublicListingImage> {
    await this.listings.assertOwnership(sellerId, listingId)
    this.validateFile(file)

    const count = await this.prisma.listingImage.count({ where: { listingId } })
    if (count >= MAX_IMAGES_PER_LISTING) {
      throw new ApiException(
        'LISTING_IMAGE_LIMIT_EXCEEDED',
        `Maximum ${MAX_IMAGES_PER_LISTING} images per listing`,
        HttpStatus.CONFLICT,
      )
    }

    const ext = mimeToExt(file.mimetype as (typeof ALLOWED_IMAGE_MIME)[number])
    const key = `listings/${listingId}/${randomUUID()}.${ext}`
    const { url } = await this.storage.upload(key, file.buffer, file.mimetype)

    const last = await this.prisma.listingImage.findFirst({
      where: { listingId },
      orderBy: { sortOrder: 'desc' },
    })
    const sortOrder = (last?.sortOrder ?? -1) + 1

    const image = await this.prisma.listingImage.create({
      data: { url, key, sortOrder, listingId },
    })
    return { id: image.id, url: image.url, sortOrder: image.sortOrder }
  }

  async removeImage(sellerId: string, listingId: string, imageId: string): Promise<void> {
    await this.listings.assertOwnership(sellerId, listingId)
    const image = await this.prisma.listingImage.findFirst({
      where: { id: imageId, listingId },
    })
    if (!image) {
      throw new ApiException('NOT_FOUND', 'Image not found', HttpStatus.NOT_FOUND)
    }
    await this.storage.delete(image.key)
    await this.prisma.listingImage.delete({ where: { id: imageId } })
  }

  private validateFile(file: UploadedFile): void {
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
  }
}
