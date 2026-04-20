import { Global, Module } from '@nestjs/common'

import { MinioStorageAdapter } from './minio.adapter'
import { STORAGE_TOKEN } from './storage.adapter'

@Global()
@Module({
  providers: [{ provide: STORAGE_TOKEN, useClass: MinioStorageAdapter }],
  exports: [STORAGE_TOKEN],
})
export class StorageModule {}
