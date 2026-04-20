import {
  CreateListingSchema,
  ListingsQuerySchema,
  UpdateListingSchema,
} from '@kgm/types'
import type {
  CreateListingInput,
  ListingsPage,
  ListingsQuery,
  PublicListing,
  UpdateListingInput,
} from '@kgm/types'
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import { ZodValidationPipe } from 'nestjs-zod'

import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Public } from '../common/decorators/public.decorator'
import type { AuthUserPayload } from '../common/types/authenticated-request'

import { ListingsService } from './listings.service'

@Controller('listings')
export class ListingsController {
  constructor(private readonly listings: ListingsService) {}

  @Public()
  @Get()
  list(
    @Query(new ZodValidationPipe(ListingsQuerySchema)) query: ListingsQuery,
  ): Promise<ListingsPage> {
    return this.listings.findPublicMany(query)
  }

  @Get('mine')
  mine(
    @CurrentUser() auth: AuthUserPayload,
    @Query(new ZodValidationPipe(ListingsQuerySchema)) query: ListingsQuery,
  ): Promise<ListingsPage> {
    return this.listings.findOwnedMany(auth.id, query)
  }

  @Public()
  @Get(':id')
  detail(@Param('id') id: string): Promise<PublicListing> {
    return this.listings.findPublicById(id)
  }

  @Post()
  create(
    @CurrentUser() auth: AuthUserPayload,
    @Body(new ZodValidationPipe(CreateListingSchema)) input: CreateListingInput,
  ): Promise<PublicListing> {
    return this.listings.create(auth.id, input)
  }

  @Patch(':id')
  update(
    @CurrentUser() auth: AuthUserPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateListingSchema)) input: UpdateListingInput,
  ): Promise<PublicListing> {
    return this.listings.update(auth.id, id, input)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentUser() auth: AuthUserPayload,
    @Param('id') id: string,
  ): Promise<null> {
    await this.listings.softDelete(auth.id, id)
    return null
  }
}
