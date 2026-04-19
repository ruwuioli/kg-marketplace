import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { Client as MinioClient } from 'minio'

import { ApiException } from '../common/errors/api.exception'
import type { Env } from '../config/env'
import { ENV_TOKEN } from '../config/env.token'

import type { IStorageAdapter, UploadResult } from './storage.adapter'

@Injectable()
export class MinioStorageAdapter implements IStorageAdapter {
  private readonly client: MinioClient
  private readonly bucket: string
  private readonly publicBaseUrl: string

  constructor(@Inject(ENV_TOKEN) env: Env) {
    this.client = new MinioClient({
      endPoint: env.MINIO_ENDPOINT,
      port: env.MINIO_PORT,
      useSSL: env.MINIO_USE_SSL,
      accessKey: env.MINIO_ACCESS_KEY,
      secretKey: env.MINIO_SECRET_KEY,
    })
    this.bucket = env.MINIO_BUCKET
    this.publicBaseUrl = env.MINIO_PUBLIC_URL.replace(/\/$/, '')
  }

  async upload(key: string, buffer: Buffer, contentType: string): Promise<UploadResult> {
    try {
      await this.client.putObject(this.bucket, key, buffer, buffer.length, {
        'Content-Type': contentType,
      })
    } catch (err) {
      throw new ApiException(
        'STORAGE_UPLOAD_FAILED',
        'Failed to upload object to storage',
        HttpStatus.BAD_GATEWAY,
        { cause: (err as Error).message },
      )
    }
    return { key, url: `${this.publicBaseUrl}/${key}` }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.removeObject(this.bucket, key)
    } catch (err) {
      throw new ApiException(
        'STORAGE_UPLOAD_FAILED',
        'Failed to delete object from storage',
        HttpStatus.BAD_GATEWAY,
        { cause: (err as Error).message },
      )
    }
  }
}
