import { Module } from '@nestjs/common'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'

import { AuthModule } from './auth/auth.module'
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard'
import { CategoriesModule } from './categories/categories.module'
import { CommonModule } from './common/common.module'
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter'
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor'
import { HealthModule } from './health/health.module'
import { ListingsModule } from './listings/listings.module'
import { PrismaModule } from './prisma/prisma.module'
import { StorageModule } from './storage/storage.module'
import { UsersModule } from './users/users.module'

@Module({
  imports: [
    CommonModule,
    StorageModule,
    PrismaModule,
    HealthModule,
    UsersModule,
    AuthModule,
    CategoriesModule,
    ListingsModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseEnvelopeInterceptor },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
