export const STORAGE_TOKEN = Symbol('STORAGE_ADAPTER')

export interface UploadResult {
  url: string
  key: string
}

export interface IStorageAdapter {
  upload(key: string, buffer: Buffer, contentType: string): Promise<UploadResult>
  delete(key: string): Promise<void>
}
