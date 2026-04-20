import type { CategoryNode } from '@kgm/types'
import { Controller, Get } from '@nestjs/common'

import { Public } from '../common/decorators/public.decorator'

import { CategoriesService } from './categories.service'

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Public()
  @Get()
  list(): Promise<CategoryNode[]> {
    return this.categories.findTree()
  }
}
