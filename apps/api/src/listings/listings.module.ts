import { Module } from '@nestjs/common'

import { PrismaModule } from '../prisma/prisma.module'

import { ListingImagesController } from './listing-images.controller'
import { ListingImagesService } from './listing-images.service'
import { ListingsController } from './listings.controller'
import { ListingsService } from './listings.service'

@Module({
  imports: [PrismaModule],
  controllers: [ListingsController, ListingImagesController],
  providers: [ListingsService, ListingImagesService],
  exports: [ListingsService],
})
export class ListingsModule {}
