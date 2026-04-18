import 'reflect-metadata'

import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'

import { AppModule } from './app.module'
import { loadEnv } from './config/env'

async function bootstrap() {
  const env = loadEnv()
  const app = await NestFactory.create(AppModule)
  app.setGlobalPrefix('api/v1')
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }))
  app.enableCors({ origin: true, credentials: true })
  await app.listen(env.API_PORT)
  // eslint-disable-next-line no-console
  console.warn(`[api] listening on http://localhost:${env.API_PORT}/api/v1`)
}

bootstrap()
