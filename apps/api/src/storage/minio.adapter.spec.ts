import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Env } from '../config/env'

import { MinioStorageAdapter } from './minio.adapter'

const putObject = vi.fn()
const removeObject = vi.fn()

vi.mock('minio', () => ({
  Client: vi.fn().mockImplementation(() => ({
    putObject: (...args: unknown[]) => putObject(...args),
    removeObject: (...args: unknown[]) => removeObject(...args),
  })),
}))

const env = {
  MINIO_ENDPOINT: 'localhost',
  MINIO_PORT: 9000,
  MINIO_USE_SSL: false,
  MINIO_ACCESS_KEY: 'k',
  MINIO_SECRET_KEY: 's',
  MINIO_BUCKET: 'kgm-media',
  MINIO_PUBLIC_URL: 'http://localhost:9000/kgm-media',
} as unknown as Env

describe('MinioStorageAdapter', () => {
  beforeEach(() => {
    putObject.mockReset()
    removeObject.mockReset()
  })

  it('uploads and returns the public URL', async () => {
    putObject.mockResolvedValue(undefined)
    const adapter = new MinioStorageAdapter(env)
    const buf = Buffer.from('hi')
    const result = await adapter.upload('listings/abc/x.jpg', buf, 'image/jpeg')
    expect(putObject).toHaveBeenCalledWith('kgm-media', 'listings/abc/x.jpg', buf, 2, {
      'Content-Type': 'image/jpeg',
    })
    expect(result).toEqual({
      key: 'listings/abc/x.jpg',
      url: 'http://localhost:9000/kgm-media/listings/abc/x.jpg',
    })
  })

  it('wraps put errors as STORAGE_UPLOAD_FAILED', async () => {
    putObject.mockRejectedValue(new Error('boom'))
    const adapter = new MinioStorageAdapter(env)
    await expect(adapter.upload('k', Buffer.from(''), 'image/png')).rejects.toMatchObject({
      code: 'STORAGE_UPLOAD_FAILED',
    })
  })

  it('deletes via removeObject', async () => {
    removeObject.mockResolvedValue(undefined)
    const adapter = new MinioStorageAdapter(env)
    await adapter.delete('avatars/u/x.jpg')
    expect(removeObject).toHaveBeenCalledWith('kgm-media', 'avatars/u/x.jpg')
  })

  it('strips trailing slash from public URL', async () => {
    putObject.mockResolvedValue(undefined)
    const adapter = new MinioStorageAdapter({
      ...env,
      MINIO_PUBLIC_URL: 'http://localhost:9000/kgm-media/',
    } as unknown as Env)
    const result = await adapter.upload('a.jpg', Buffer.from(''), 'image/jpeg')
    expect(result.url).toBe('http://localhost:9000/kgm-media/a.jpg')
  })
})
