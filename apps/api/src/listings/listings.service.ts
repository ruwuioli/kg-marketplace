import type {
  CreateListingInput,
  ListingsQuery,
  PublicListing,
  PublicListingImage,
  UpdateListingInput,
} from '@kgm/types'
import { HttpStatus, Injectable } from '@nestjs/common'
import type { Listing, ListingImage, ListingStatus, Prisma } from '@prisma/client'

import { ApiException } from '../common/errors/api.exception'
import { PrismaService } from '../prisma/prisma.service'

type ListingWithImages = Listing & { images: ListingImage[] }

const ALLOWED_TRANSITIONS: Record<ListingStatus, ListingStatus[]> = {
  DRAFT: ['ACTIVE'],
  ACTIVE: ['DRAFT', 'PAUSED', 'SOLD'],
  PAUSED: ['ACTIVE'],
  SOLD: [],
  REJECTED: [],
  EXPIRED: [],
}

@Injectable()
export class ListingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(sellerId: string, input: CreateListingInput): Promise<PublicListing> {
    const listing = await this.prisma.listing.create({
      data: {
        title: input.title,
        description: input.description,
        price: input.price,
        condition: input.condition,
        categoryId: input.categoryId,
        location: input.location,
        sellerId,
        status: 'DRAFT',
      },
      include: { images: true },
    })
    return this.toPublic(listing)
  }

  async findPublicById(id: string): Promise<PublicListing> {
    const listing = await this.prisma.listing.findFirst({
      where: { id, deletedAt: null, status: 'ACTIVE' },
      include: { images: { orderBy: { sortOrder: 'asc' } } },
    })
    if (!listing) {
      throw new ApiException('NOT_FOUND', 'Listing not found', HttpStatus.NOT_FOUND)
    }
    await this.prisma.listing.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    })
    return this.toPublic({ ...listing, viewCount: listing.viewCount + 1 })
  }

  async findPublicMany(
    query: ListingsQuery,
  ): Promise<{ data: PublicListing[]; nextCursor: string | null }> {
    const where: Prisma.ListingWhereInput = {
      deletedAt: null,
      status: 'ACTIVE',
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.sellerId ? { sellerId: query.sellerId } : {}),
      ...(query.cursor ? { id: { lt: query.cursor } } : {}),
    }
    return this.queryPaged(where, query.limit)
  }

  async findOwnedMany(
    sellerId: string,
    query: ListingsQuery,
  ): Promise<{ data: PublicListing[]; nextCursor: string | null }> {
    const where: Prisma.ListingWhereInput = {
      deletedAt: null,
      sellerId,
      ...(query.cursor ? { id: { lt: query.cursor } } : {}),
    }
    return this.queryPaged(where, query.limit)
  }

  async update(
    sellerId: string,
    id: string,
    input: UpdateListingInput,
  ): Promise<PublicListing> {
    const existing = await this.prisma.listing.findFirst({
      where: { id, deletedAt: null },
    })
    if (!existing) {
      throw new ApiException('NOT_FOUND', 'Listing not found', HttpStatus.NOT_FOUND)
    }
    if (existing.sellerId !== sellerId) {
      throw new ApiException('FORBIDDEN', 'Not the listing owner', HttpStatus.FORBIDDEN)
    }
    if (input.status && input.status !== existing.status) {
      const allowed = ALLOWED_TRANSITIONS[existing.status]
      if (!allowed.includes(input.status)) {
        throw new ApiException(
          'INVALID_STATUS_TRANSITION',
          `Cannot transition ${existing.status} → ${input.status}`,
          HttpStatus.CONFLICT,
        )
      }
    }
    const data: Prisma.ListingUpdateInput = {}
    if (input.title !== undefined) data.title = input.title
    if (input.description !== undefined) data.description = input.description
    if (input.price !== undefined) data.price = input.price
    if (input.condition !== undefined) data.condition = input.condition
    if (input.categoryId !== undefined) {
      data.category = { connect: { id: input.categoryId } }
    }
    if (input.location !== undefined) data.location = input.location
    if (input.status !== undefined) data.status = input.status

    const updated = await this.prisma.listing.update({
      where: { id },
      data,
      include: { images: { orderBy: { sortOrder: 'asc' } } },
    })
    return this.toPublic(updated)
  }

  async softDelete(sellerId: string, id: string): Promise<void> {
    const existing = await this.prisma.listing.findFirst({
      where: { id, deletedAt: null },
    })
    if (!existing) {
      throw new ApiException('NOT_FOUND', 'Listing not found', HttpStatus.NOT_FOUND)
    }
    if (existing.sellerId !== sellerId) {
      throw new ApiException('FORBIDDEN', 'Not the listing owner', HttpStatus.FORBIDDEN)
    }
    await this.prisma.listing.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }

  async assertOwnership(sellerId: string, id: string): Promise<Listing> {
    const listing = await this.prisma.listing.findFirst({
      where: { id, deletedAt: null },
    })
    if (!listing) {
      throw new ApiException('NOT_FOUND', 'Listing not found', HttpStatus.NOT_FOUND)
    }
    if (listing.sellerId !== sellerId) {
      throw new ApiException('FORBIDDEN', 'Not the listing owner', HttpStatus.FORBIDDEN)
    }
    return listing
  }

  toPublic(listing: ListingWithImages): PublicListing {
    return {
      id: listing.id,
      title: listing.title,
      description: listing.description,
      price: listing.price.toString(),
      currency: listing.currency,
      condition: listing.condition,
      status: listing.status,
      location: listing.location,
      viewCount: listing.viewCount,
      sellerId: listing.sellerId,
      categoryId: listing.categoryId,
      images: listing.images.map(toPublicImage),
      createdAt: listing.createdAt.toISOString(),
      updatedAt: listing.updatedAt.toISOString(),
    }
  }

  private async queryPaged(
    where: Prisma.ListingWhereInput,
    limit: number,
  ): Promise<{ data: PublicListing[]; nextCursor: string | null }> {
    const rows = await this.prisma.listing.findMany({
      where,
      orderBy: { id: 'desc' },
      take: limit + 1,
      include: { images: { orderBy: { sortOrder: 'asc' } } },
    })
    const hasMore = rows.length > limit
    const page = hasMore ? rows.slice(0, limit) : rows
    const last = page[page.length - 1]
    return {
      data: page.map((row) => this.toPublic(row)),
      nextCursor: hasMore && last ? last.id : null,
    }
  }
}

function toPublicImage(img: ListingImage): PublicListingImage {
  return { id: img.id, url: img.url, sortOrder: img.sortOrder }
}
