# Phase 1c — Categories, Listings, Storage: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a working categories/listings/storage vertical slice on the API: `GET /categories` (nested tree), full listing CRUD with cursor pagination, listing image upload (one file per request, max 10), avatar upload on `/users/me/avatar`. MinIO is the storage adapter behind a swappable `IStorageAdapter` interface. All new services hit the 80% / controllers 60% coverage targets via co-located vitest specs.

**Architecture:** A new `apps/api/src/storage/` module exposes `IStorageAdapter` via a `STORAGE_TOKEN` injection symbol; Phase 1 binds it to `MinioStorageAdapter` (official `minio` SDK). A new `apps/api/src/categories/` module reads the seeded category tree and returns it as a nested structure. A new `apps/api/src/listings/` module owns listing CRUD, ownership enforcement, and listing-image attach/detach. The existing `UsersService` gains a `setAvatar` method and `UsersController` gains `POST /users/me/avatar`. Multipart uploads go through Nest's built-in `FileInterceptor` (multer) with size + MIME validation; validated buffers are handed to the storage adapter, which returns a public URL constructed from `MINIO_PUBLIC_URL`. Cursor pagination on `GET /listings` uses `id`-only opaque cursors (cuid is k-sortable, so ordering by `id DESC` and filtering `WHERE id < cursorId` is stable).

**Tech Stack:** NestJS 10 · `minio@^7` (S3 client) · `multer` (already pulled in via `@nestjs/platform-express`) · Prisma 5 · zod 3 · vitest 2.

**Scope of this plan:**
- **In:** `GET /categories` · `GET /listings` (cursor-paginated, public, ACTIVE-only, optional `categoryId` + `sellerId` filters) · `GET /listings/mine` (auth, all statuses, owner) · `GET /listings/:id` (public, increments `viewCount`) · `POST /listings` (auth, creates DRAFT) · `PATCH /listings/:id` (owner) · `DELETE /listings/:id` (owner, soft delete) · `POST /listings/:id/images` (owner, multipart, one file, max 10/listing) · `DELETE /listings/:id/images/:imageId` (owner) · `POST /users/me/avatar` (auth, multipart). Storage adapter interface + MinIO implementation. Shared zod schemas in `@kgm/types` for category + listing. End-to-end curl smoke test creating a listing with images.
- **Out (deferred to Plan 1d / later):** All web UI (`apps/web/app/(marketplace)/listings/...`, `apps/web/app/(dashboard)/...`) — Plan 1d covers all frontend pages. Meilisearch indexing — Phase 2. Subtree/recursive category filter — Phase 2. Image reorder endpoint — Phase 2. Orphan-MinIO-object cleanup job — Phase 2 (orphans accepted in Phase 1). Magic-byte MIME sniffing — Phase 2 (header allowlist only in Phase 1). `Listing.attributes` JSON field is persisted with default `{}` but no validation/UI in Phase 1.

**Plan-level decisions (fill spec gaps):**
- Cursor pagination: opaque `id`. Server orders `id DESC` and filters `WHERE id < cursorId`. Client treats cursor as opaque string.
- Listing status transitions allowed via `PATCH`: `DRAFT ↔ ACTIVE`, `ACTIVE → PAUSED`, `ACTIVE → SOLD`, `PAUSED → ACTIVE`. `REJECTED` / `EXPIRED` are admin-only / auto and rejected from PATCH input.
- Public `GET /listings` filter: `status = ACTIVE AND deletedAt IS NULL`. `GET /listings/mine` returns all of caller's listings (any status) excluding soft-deleted.
- `viewCount` increments on every `GET /listings/:id`, atomically (`{ increment: 1 }`). No owner exclusion in Phase 1.
- Categories: returned as nested tree (each parent contains `children`). Server assembles tree from flat query.
- Listing image `sortOrder`: assigned `max(sortOrder) + 1` per listing on insert. No reorder endpoint.
- Avatar: replaces `User.avatarUrl`. Old MinIO object is **not** deleted (orphan acceptable in Phase 1).
- MIME validation: trust multipart `Content-Type` against allowlist `['image/jpeg','image/png','image/webp']`. Extension derived from MIME (`.jpg` / `.png` / `.webp`).
- Storage key format: `avatars/<userId>/<uuid>.<ext>` and `listings/<listingId>/<uuid>.<ext>`. UUID via `crypto.randomUUID()`.

**Schema:** No Prisma migration required. `Category`, `Listing`, `ListingImage` already exist (see `apps/api/prisma/schema.prisma` lines 120–187). Seed already populates 54 categories with ru+ky names.

---

## File Structure

Files created or modified by this plan. All paths are relative to the repo root (`/Users/ruwuioli/Documents/kgm`).

### `packages/types/` — shared zod schemas
- `packages/types/src/category.ts` (create) — `CategoryNodeSchema` (recursive), `CategoryTreeSchema`
- `packages/types/src/listing.ts` (create) — `ListingConditionSchema`, `ListingStatusSchema`, `PublicListingImageSchema`, `PublicListingSchema`, `CreateListingSchema`, `UpdateListingSchema`, `ListingsPageSchema`, `ListingsQuerySchema`
- `packages/types/src/error.ts` (modify) — extend `ErrorCode` with `LISTING_IMAGE_LIMIT_EXCEEDED`, `LISTING_IMAGE_INVALID_TYPE`, `LISTING_IMAGE_TOO_LARGE`, `STORAGE_UPLOAD_FAILED`, `INVALID_STATUS_TRANSITION`
- `packages/types/src/index.ts` (modify) — re-export `category` + `listing`

### `apps/api/src/storage/` — storage adapter
- `apps/api/src/storage/storage.adapter.ts` (create) — `IStorageAdapter` interface + `STORAGE_TOKEN`
- `apps/api/src/storage/minio.adapter.ts` (create) — `MinioStorageAdapter`
- `apps/api/src/storage/minio.adapter.spec.ts` (create)
- `apps/api/src/storage/storage.module.ts` (create)
- `apps/api/src/storage/upload.constants.ts` (create) — `MAX_IMAGE_BYTES`, `ALLOWED_IMAGE_MIME`, `mimeToExt()`

### `apps/api/src/categories/` — category domain
- `apps/api/src/categories/categories.module.ts` (create)
- `apps/api/src/categories/categories.service.ts` (create) — `findTree()`
- `apps/api/src/categories/categories.service.spec.ts` (create)
- `apps/api/src/categories/categories.controller.ts` (create) — `GET /categories`
- `apps/api/src/categories/categories.controller.spec.ts` (create)

### `apps/api/src/listings/` — listing domain
- `apps/api/src/listings/listings.module.ts` (create)
- `apps/api/src/listings/listings.service.ts` (create) — `create`, `findPublicById`, `findPublicMany`, `findOwnedMany`, `update`, `softDelete`, `incrementViewCount`, `assertOwnership`, `toPublic`
- `apps/api/src/listings/listings.service.spec.ts` (create)
- `apps/api/src/listings/listings.controller.ts` (create) — 6 endpoints
- `apps/api/src/listings/listings.controller.spec.ts` (create)
- `apps/api/src/listings/listing-images.service.ts` (create) — `addImage`, `removeImage`
- `apps/api/src/listings/listing-images.service.spec.ts` (create)
- `apps/api/src/listings/listing-images.controller.ts` (create) — 2 endpoints
- `apps/api/src/listings/listing-images.controller.spec.ts` (create)

### `apps/api/src/users/` — extend
- `apps/api/src/users/users.service.ts` (modify) — add `setAvatar(userId, url)`
- `apps/api/src/users/users.service.spec.ts` (modify) — cover `setAvatar`
- `apps/api/src/users/users.controller.ts` (modify) — add `POST /users/me/avatar`
- `apps/api/src/users/users.controller.spec.ts` (modify) — cover avatar endpoint

### `apps/api/src/app.module.ts` (modify) — import `StorageModule`, `CategoriesModule`, `ListingsModule`
### `apps/api/package.json` (modify) — add deps `minio@^7`, `@types/multer@^1`
### `.env.example` — already complete (MinIO vars present); no change

---

## Conventions (apply to every task)

- **Import order** (from `packages/config/eslint-base.cjs`): `builtin` → `external` → `internal` (workspace `@kgm/*`) → `parent` → `sibling` → `index`, **with blank line between groups** and alphabetized within each group. `@kgm/*` = `internal`, `@nestjs/*` = `external` — so `external` block (which contains `@nestjs/*`) comes BEFORE `internal` block (which contains `@kgm/*`). Use `import type` (split from value imports) per `consistent-type-imports`.
- **Tests**: `vitest` with `describe / it / expect / beforeEach` imported explicitly (no globals). Mock `PrismaService` as a plain object literal typed via `as unknown as PrismaService`. Mock injected services with `vi.fn()`. Mock the storage adapter via the `STORAGE_TOKEN` symbol.
- **Error envelope**: throw `ApiException(code, message, status, details?)`. The global filter formats it.
- **Never log secrets** — image keys + URLs are fine to log; access keys are not.
- **Commit style**: Conventional Commits. Prefix scopes: `feat(api)`, `feat(types)`, `chore(api)`, `test(api)`. Every task ends with a commit.
- **Soft deletes**: Always filter `deletedAt: null` on listing queries. `User.deletedAt` is already enforced inside `UsersService`.

---

## Task 1: Add shared zod schemas in `@kgm/types`

**Files:**
- Modify: `packages/types/src/error.ts`
- Create: `packages/types/src/category.ts`
- Create: `packages/types/src/listing.ts`
- Modify: `packages/types/src/index.ts`

- [ ] **Step 1.1: Extend `packages/types/src/error.ts`**

Replace the entire file:

```ts
import { z } from 'zod'

export const ErrorCode = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  PHONE_ALREADY_EXISTS: 'PHONE_ALREADY_EXISTS',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  OTP_INVALID: 'OTP_INVALID',
  OTP_EXPIRED: 'OTP_EXPIRED',
  OTP_COOLDOWN: 'OTP_COOLDOWN',
  OTP_TOO_MANY_ATTEMPTS: 'OTP_TOO_MANY_ATTEMPTS',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  LISTING_IMAGE_LIMIT_EXCEEDED: 'LISTING_IMAGE_LIMIT_EXCEEDED',
  LISTING_IMAGE_INVALID_TYPE: 'LISTING_IMAGE_INVALID_TYPE',
  LISTING_IMAGE_TOO_LARGE: 'LISTING_IMAGE_TOO_LARGE',
  STORAGE_UPLOAD_FAILED: 'STORAGE_UPLOAD_FAILED',
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
} as const

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode]

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
})

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>
```

- [ ] **Step 1.2: Create `packages/types/src/category.ts`**

```ts
import { z } from 'zod'

export interface CategoryNode {
  id: string
  slug: string
  nameRu: string
  nameKy: string
  iconUrl: string | null
  sortOrder: number
  children: CategoryNode[]
}

export const CategoryNodeSchema: z.ZodType<CategoryNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    slug: z.string(),
    nameRu: z.string(),
    nameKy: z.string(),
    iconUrl: z.string().url().nullable(),
    sortOrder: z.number().int(),
    children: z.array(CategoryNodeSchema),
  }),
)

export const CategoryTreeSchema = z.array(CategoryNodeSchema)
export type CategoryTree = z.infer<typeof CategoryTreeSchema>
```

- [ ] **Step 1.3: Create `packages/types/src/listing.ts`**

```ts
import { z } from 'zod'

export const ListingConditionSchema = z.enum([
  'NEW',
  'LIKE_NEW',
  'GOOD',
  'FAIR',
  'FOR_PARTS',
])
export type ListingCondition = z.infer<typeof ListingConditionSchema>

export const ListingStatusSchema = z.enum([
  'DRAFT',
  'ACTIVE',
  'PAUSED',
  'SOLD',
  'REJECTED',
  'EXPIRED',
])
export type ListingStatus = z.infer<typeof ListingStatusSchema>

// Statuses a user may set via PATCH. REJECTED + EXPIRED are admin/auto only.
export const UpdatableListingStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'SOLD'])

export const PublicListingImageSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  sortOrder: z.number().int(),
})
export type PublicListingImage = z.infer<typeof PublicListingImageSchema>

export const PublicListingSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  price: z.string(), // Decimal serialized as string
  currency: z.string(),
  condition: ListingConditionSchema,
  status: ListingStatusSchema,
  location: z.string(),
  viewCount: z.number().int(),
  sellerId: z.string(),
  categoryId: z.string(),
  images: z.array(PublicListingImageSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type PublicListing = z.infer<typeof PublicListingSchema>

export const CreateListingSchema = z.object({
  title: z.string().min(10).max(100),
  description: z.string().min(20).max(5000),
  price: z.coerce.number().positive().int(),
  condition: ListingConditionSchema,
  categoryId: z.string().min(1),
  location: z.string().min(1).max(200),
})
export type CreateListingInput = z.infer<typeof CreateListingSchema>

export const UpdateListingSchema = z
  .object({
    title: z.string().min(10).max(100).optional(),
    description: z.string().min(20).max(5000).optional(),
    price: z.coerce.number().positive().int().optional(),
    condition: ListingConditionSchema.optional(),
    categoryId: z.string().min(1).optional(),
    location: z.string().min(1).max(200).optional(),
    status: UpdatableListingStatusSchema.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field required' })
export type UpdateListingInput = z.infer<typeof UpdateListingSchema>

export const ListingsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(50).default(20),
  categoryId: z.string().optional(),
  sellerId: z.string().optional(),
})
export type ListingsQuery = z.infer<typeof ListingsQuerySchema>

export const ListingsPageSchema = z.object({
  data: z.array(PublicListingSchema),
  nextCursor: z.string().nullable(),
})
export type ListingsPage = z.infer<typeof ListingsPageSchema>
```

- [ ] **Step 1.4: Update `packages/types/src/index.ts`**

Replace the entire file:

```ts
export * from './auth'
export * from './category'
export * from './error'
export * from './health'
export * from './listing'
export * from './user'
```

- [ ] **Step 1.5: Build `@kgm/types` (CJS dist required for runtime)**

```bash
pnpm --filter=@kgm/types build
```

Expected: exits 0; `packages/types/dist/index.js` rebuilt.

- [ ] **Step 1.6: Type-check root**

```bash
pnpm type-check
```

Expected: exits 0 across all workspaces.

- [ ] **Step 1.7: Commit**

```bash
git add packages/types/src packages/types/dist
git commit -m "feat(types): add category and listing zod schemas"
```

---

## Task 2: Install storage dependencies

**Files:**
- Modify: `apps/api/package.json`

- [ ] **Step 2.1: Install minio + types**

```bash
pnpm --filter=@kgm/api add minio@^7.1.3
pnpm --filter=@kgm/api add -D @types/multer@^1.4.11
```

Expected: `apps/api/package.json` `dependencies` gains `"minio": "^7.1.3"`; `devDependencies` gains `"@types/multer": "^1.4.11"`. `pnpm-lock.yaml` updates.

- [ ] **Step 2.2: Verify install**

```bash
pnpm --filter=@kgm/api exec node -e "console.log(require('minio').Client.name)"
```

Expected: prints `Client`.

- [ ] **Step 2.3: Commit**

```bash
git add apps/api/package.json pnpm-lock.yaml
git commit -m "chore(api): add minio and multer types for image uploads"
```

---

## Task 3: Add storage upload constants

**Files:**
- Create: `apps/api/src/storage/upload.constants.ts`

- [ ] **Step 3.1: Create the file**

```ts
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5 MB

export const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const
export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIME)[number]

export function isAllowedImageMime(mime: string): mime is AllowedImageMime {
  return (ALLOWED_IMAGE_MIME as readonly string[]).includes(mime)
}

export function mimeToExt(mime: AllowedImageMime): 'jpg' | 'png' | 'webp' {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
  }
}
```

- [ ] **Step 3.2: Commit**

```bash
git add apps/api/src/storage/upload.constants.ts
git commit -m "feat(api): add image upload constants and MIME helpers"
```

---

## Task 4: Define `IStorageAdapter` interface

**Files:**
- Create: `apps/api/src/storage/storage.adapter.ts`

- [ ] **Step 4.1: Create the file**

```ts
export const STORAGE_TOKEN = Symbol('STORAGE_ADAPTER')

export interface UploadResult {
  url: string
  key: string
}

export interface IStorageAdapter {
  upload(key: string, buffer: Buffer, contentType: string): Promise<UploadResult>
  delete(key: string): Promise<void>
}
```

- [ ] **Step 4.2: Commit**

```bash
git add apps/api/src/storage/storage.adapter.ts
git commit -m "feat(api): add IStorageAdapter interface and STORAGE_TOKEN"
```

---

## Task 5: Implement `MinioStorageAdapter` + spec

**Files:**
- Create: `apps/api/src/storage/minio.adapter.ts`
- Create: `apps/api/src/storage/minio.adapter.spec.ts`

- [ ] **Step 5.1: Create `apps/api/src/storage/minio.adapter.ts`**

```ts
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
```

- [ ] **Step 5.2: Create `apps/api/src/storage/minio.adapter.spec.ts`**

```ts
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
```

- [ ] **Step 5.3: Run test, expect pass**

```bash
pnpm --filter=@kgm/api test -- minio.adapter.spec
```

Expected: PASS (4 tests).

- [ ] **Step 5.4: Commit**

```bash
git add apps/api/src/storage/minio.adapter.ts apps/api/src/storage/minio.adapter.spec.ts
git commit -m "feat(api): add MinioStorageAdapter with put/delete and error wrapping"
```

---

## Task 6: Wire `StorageModule`

**Files:**
- Create: `apps/api/src/storage/storage.module.ts`

- [ ] **Step 6.1: Create the file**

```ts
import { Global, Module } from '@nestjs/common'

import { MinioStorageAdapter } from './minio.adapter'
import { STORAGE_TOKEN } from './storage.adapter'

@Global()
@Module({
  providers: [{ provide: STORAGE_TOKEN, useClass: MinioStorageAdapter }],
  exports: [STORAGE_TOKEN],
})
export class StorageModule {}
```

- [ ] **Step 6.2: Commit**

```bash
git add apps/api/src/storage/storage.module.ts
git commit -m "feat(api): add global StorageModule binding MinioStorageAdapter"
```

---

## Task 7: Implement `CategoriesService` + spec

**Files:**
- Create: `apps/api/src/categories/categories.service.ts`
- Create: `apps/api/src/categories/categories.service.spec.ts`

- [ ] **Step 7.1: Create `apps/api/src/categories/categories.service.ts`**

```ts
import type { CategoryNode } from '@kgm/types'
import { Injectable } from '@nestjs/common'
import type { Category } from '@prisma/client'

import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findTree(): Promise<CategoryNode[]> {
    const flat = await this.prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { nameRu: 'asc' }],
    })
    return buildTree(flat)
  }
}

function buildTree(rows: Category[]): CategoryNode[] {
  const byId = new Map<string, CategoryNode>()
  for (const row of rows) {
    byId.set(row.id, {
      id: row.id,
      slug: row.slug,
      nameRu: row.nameRu,
      nameKy: row.nameKy,
      iconUrl: row.iconUrl,
      sortOrder: row.sortOrder,
      children: [],
    })
  }
  const roots: CategoryNode[] = []
  for (const row of rows) {
    const node = byId.get(row.id)
    if (!node) continue
    if (row.parentId) {
      const parent = byId.get(row.parentId)
      if (parent) parent.children.push(node)
      else roots.push(node) // orphan: surface at top level
    } else {
      roots.push(node)
    }
  }
  return roots
}
```

- [ ] **Step 7.2: Create `apps/api/src/categories/categories.service.spec.ts`**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PrismaService } from '../prisma/prisma.service'

import { CategoriesService } from './categories.service'

const findMany = vi.fn()
const prisma = { category: { findMany } } as unknown as PrismaService

describe('CategoriesService', () => {
  let svc: CategoriesService

  beforeEach(() => {
    findMany.mockReset()
    svc = new CategoriesService(prisma)
  })

  it('builds a nested tree from a flat list', async () => {
    findMany.mockResolvedValue([
      { id: 'a', slug: 'transport', nameRu: 'T', nameKy: 'T', iconUrl: null, sortOrder: 1, parentId: null },
      { id: 'b', slug: 'cars', nameRu: 'C', nameKy: 'C', iconUrl: null, sortOrder: 1, parentId: 'a' },
      { id: 'c', slug: 'real-estate', nameRu: 'R', nameKy: 'R', iconUrl: null, sortOrder: 2, parentId: null },
    ])
    const tree = await svc.findTree()
    expect(tree).toHaveLength(2)
    expect(tree[0]).toMatchObject({ id: 'a', children: [{ id: 'b', children: [] }] })
    expect(tree[1]).toMatchObject({ id: 'c', children: [] })
  })

  it('surfaces orphans (parent missing) as roots', async () => {
    findMany.mockResolvedValue([
      { id: 'b', slug: 'cars', nameRu: 'C', nameKy: 'C', iconUrl: null, sortOrder: 1, parentId: 'missing' },
    ])
    const tree = await svc.findTree()
    expect(tree.map((n) => n.id)).toEqual(['b'])
  })

  it('returns [] on empty', async () => {
    findMany.mockResolvedValue([])
    expect(await svc.findTree()).toEqual([])
  })
})
```

- [ ] **Step 7.3: Run test, expect pass**

```bash
pnpm --filter=@kgm/api test -- categories.service.spec
```

Expected: PASS (3 tests).

- [ ] **Step 7.4: Commit**

```bash
git add apps/api/src/categories/categories.service.ts apps/api/src/categories/categories.service.spec.ts
git commit -m "feat(api): add CategoriesService.findTree assembling nested tree"
```

---

## Task 8: `CategoriesController` + module + spec

**Files:**
- Create: `apps/api/src/categories/categories.controller.ts`
- Create: `apps/api/src/categories/categories.controller.spec.ts`
- Create: `apps/api/src/categories/categories.module.ts`

- [ ] **Step 8.1: Create `apps/api/src/categories/categories.controller.ts`**

```ts
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
```

- [ ] **Step 8.2: Create `apps/api/src/categories/categories.controller.spec.ts`**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CategoriesController } from './categories.controller'
import { CategoriesService } from './categories.service'

const findTree = vi.fn()
const svc = { findTree } as unknown as CategoriesService

describe('CategoriesController', () => {
  let ctrl: CategoriesController

  beforeEach(() => {
    findTree.mockReset()
    ctrl = new CategoriesController(svc)
  })

  it('returns the tree from the service', async () => {
    findTree.mockResolvedValue([{ id: 'a', children: [] }])
    const result = await ctrl.list()
    expect(result).toEqual([{ id: 'a', children: [] }])
    expect(findTree).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 8.3: Create `apps/api/src/categories/categories.module.ts`**

```ts
import { Module } from '@nestjs/common'

import { PrismaModule } from '../prisma/prisma.module'

import { CategoriesController } from './categories.controller'
import { CategoriesService } from './categories.service'

@Module({
  imports: [PrismaModule],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
```

- [ ] **Step 8.4: Run test, expect pass**

```bash
pnpm --filter=@kgm/api test -- categories.controller.spec
```

Expected: PASS (1 test).

- [ ] **Step 8.5: Commit**

```bash
git add apps/api/src/categories
git commit -m "feat(api): add CategoriesController and CategoriesModule"
```

---

## Task 9: `ListingsService` create/find/update/delete + spec

**Files:**
- Create: `apps/api/src/listings/listings.service.ts`
- Create: `apps/api/src/listings/listings.service.spec.ts`

- [ ] **Step 9.1: Create `apps/api/src/listings/listings.service.ts`**

```ts
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
    return {
      data: page.map((row) => this.toPublic(row)),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    }
  }
}

function toPublicImage(img: ListingImage): PublicListingImage {
  return { id: img.id, url: img.url, sortOrder: img.sortOrder }
}
```

- [ ] **Step 9.2: Create `apps/api/src/listings/listings.service.spec.ts`**

```ts
import { Decimal } from '@prisma/client/runtime/library'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PrismaService } from '../prisma/prisma.service'

import { ListingsService } from './listings.service'

const findFirst = vi.fn()
const findMany = vi.fn()
const create = vi.fn()
const update = vi.fn()

const prisma = {
  listing: { findFirst, findMany, create, update },
} as unknown as PrismaService

const baseListing = {
  id: 'l1',
  title: 'Title here ten',
  description: 'Twenty plus characters description text',
  price: new Decimal('1000'),
  currency: 'KGS',
  condition: 'NEW',
  status: 'DRAFT',
  location: 'Bishkek',
  latitude: null,
  longitude: null,
  viewCount: 0,
  isFeatured: false,
  featuredUntil: null,
  attributes: {},
  sellerId: 'u1',
  categoryId: 'c1',
  createdAt: new Date('2026-04-19T00:00:00Z'),
  updatedAt: new Date('2026-04-19T00:00:00Z'),
  expiresAt: null,
  deletedAt: null,
  images: [],
}

describe('ListingsService', () => {
  let svc: ListingsService

  beforeEach(() => {
    findFirst.mockReset()
    findMany.mockReset()
    create.mockReset()
    update.mockReset()
    svc = new ListingsService(prisma)
  })

  it('creates a listing in DRAFT', async () => {
    create.mockResolvedValue(baseListing)
    const result = await svc.create('u1', {
      title: 'Title here ten',
      description: 'Twenty plus characters description text',
      price: 1000,
      condition: 'NEW',
      categoryId: 'c1',
      location: 'Bishkek',
    })
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ sellerId: 'u1', status: 'DRAFT' }),
      }),
    )
    expect(result.status).toBe('DRAFT')
    expect(result.price).toBe('1000')
  })

  it('findPublicById returns 404 when missing', async () => {
    findFirst.mockResolvedValue(null)
    await expect(svc.findPublicById('x')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('findPublicById increments viewCount and returns +1', async () => {
    findFirst.mockResolvedValue({ ...baseListing, status: 'ACTIVE', viewCount: 5 })
    update.mockResolvedValue(undefined)
    const result = await svc.findPublicById('l1')
    expect(update).toHaveBeenCalledWith({
      where: { id: 'l1' },
      data: { viewCount: { increment: 1 } },
    })
    expect(result.viewCount).toBe(6)
  })

  it('findPublicMany returns nextCursor when more rows exist', async () => {
    const rows = Array.from({ length: 21 }, (_, i) => ({
      ...baseListing,
      id: `l${21 - i}`,
      status: 'ACTIVE',
    }))
    findMany.mockResolvedValue(rows)
    const result = await svc.findPublicMany({ limit: 20 })
    expect(result.data).toHaveLength(20)
    expect(result.nextCursor).toBe('l2')
  })

  it('findPublicMany returns null cursor when fewer rows', async () => {
    findMany.mockResolvedValue([{ ...baseListing, status: 'ACTIVE' }])
    const result = await svc.findPublicMany({ limit: 20 })
    expect(result.nextCursor).toBeNull()
  })

  it('update rejects non-owner with FORBIDDEN', async () => {
    findFirst.mockResolvedValue({ ...baseListing, sellerId: 'other' })
    await expect(
      svc.update('u1', 'l1', { title: 'New title here please' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('update rejects illegal status transition', async () => {
    findFirst.mockResolvedValue({ ...baseListing, status: 'SOLD' })
    await expect(svc.update('u1', 'l1', { status: 'ACTIVE' })).rejects.toMatchObject({
      code: 'INVALID_STATUS_TRANSITION',
    })
  })

  it('update applies allowed DRAFT → ACTIVE transition', async () => {
    findFirst.mockResolvedValue({ ...baseListing, status: 'DRAFT' })
    update.mockResolvedValue({ ...baseListing, status: 'ACTIVE' })
    const result = await svc.update('u1', 'l1', { status: 'ACTIVE' })
    expect(result.status).toBe('ACTIVE')
  })

  it('softDelete sets deletedAt for owner', async () => {
    findFirst.mockResolvedValue({ ...baseListing })
    update.mockResolvedValue(undefined)
    await svc.softDelete('u1', 'l1')
    expect(update).toHaveBeenCalledWith({
      where: { id: 'l1' },
      data: { deletedAt: expect.any(Date) },
    })
  })

  it('assertOwnership returns the listing for owner', async () => {
    findFirst.mockResolvedValue({ ...baseListing })
    const result = await svc.assertOwnership('u1', 'l1')
    expect(result.id).toBe('l1')
  })
})
```

- [ ] **Step 9.3: Run test, expect pass**

```bash
pnpm --filter=@kgm/api test -- listings.service.spec
```

Expected: PASS (10 tests).

- [ ] **Step 9.4: Commit**

```bash
git add apps/api/src/listings/listings.service.ts apps/api/src/listings/listings.service.spec.ts
git commit -m "feat(api): add ListingsService with CRUD, ownership, status transitions, and pagination"
```

---

## Task 10: `ListingsController` 6 endpoints + spec

**Files:**
- Create: `apps/api/src/listings/listings.controller.ts`
- Create: `apps/api/src/listings/listings.controller.spec.ts`

- [ ] **Step 10.1: Create `apps/api/src/listings/listings.controller.ts`**

```ts
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
```

- [ ] **Step 10.2: Create `apps/api/src/listings/listings.controller.spec.ts`**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthUserPayload } from '../common/types/authenticated-request'

import { ListingsController } from './listings.controller'
import { ListingsService } from './listings.service'

const findPublicMany = vi.fn()
const findOwnedMany = vi.fn()
const findPublicById = vi.fn()
const create = vi.fn()
const update = vi.fn()
const softDelete = vi.fn()

const svc = {
  findPublicMany,
  findOwnedMany,
  findPublicById,
  create,
  update,
  softDelete,
} as unknown as ListingsService

const auth: AuthUserPayload = { id: 'u1', email: 'a@b.c', role: 'BUYER' }

describe('ListingsController', () => {
  let ctrl: ListingsController

  beforeEach(() => {
    ;[findPublicMany, findOwnedMany, findPublicById, create, update, softDelete].forEach((m) =>
      m.mockReset(),
    )
    ctrl = new ListingsController(svc)
  })

  it('GET /listings delegates to findPublicMany', async () => {
    findPublicMany.mockResolvedValue({ data: [], nextCursor: null })
    await ctrl.list({ limit: 20 })
    expect(findPublicMany).toHaveBeenCalledWith({ limit: 20 })
  })

  it('GET /listings/mine delegates to findOwnedMany with caller id', async () => {
    findOwnedMany.mockResolvedValue({ data: [], nextCursor: null })
    await ctrl.mine(auth, { limit: 20 })
    expect(findOwnedMany).toHaveBeenCalledWith('u1', { limit: 20 })
  })

  it('GET /listings/:id delegates to findPublicById', async () => {
    findPublicById.mockResolvedValue({ id: 'l1' })
    const result = await ctrl.detail('l1')
    expect(findPublicById).toHaveBeenCalledWith('l1')
    expect(result).toMatchObject({ id: 'l1' })
  })

  it('POST /listings creates with caller id', async () => {
    create.mockResolvedValue({ id: 'l1' })
    await ctrl.create(auth, {
      title: 'Title here ten',
      description: 'Twenty plus characters description text',
      price: 100,
      condition: 'NEW',
      categoryId: 'c1',
      location: 'Bishkek',
    })
    expect(create).toHaveBeenCalledWith('u1', expect.objectContaining({ title: 'Title here ten' }))
  })

  it('PATCH /listings/:id forwards id and body', async () => {
    update.mockResolvedValue({ id: 'l1' })
    await ctrl.update(auth, 'l1', { title: 'Title here ten more' })
    expect(update).toHaveBeenCalledWith('u1', 'l1', { title: 'Title here ten more' })
  })

  it('DELETE /listings/:id returns null', async () => {
    softDelete.mockResolvedValue(undefined)
    const result = await ctrl.remove(auth, 'l1')
    expect(softDelete).toHaveBeenCalledWith('u1', 'l1')
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 10.3: Run test, expect pass**

```bash
pnpm --filter=@kgm/api test -- listings.controller.spec
```

Expected: PASS (6 tests).

- [ ] **Step 10.4: Commit**

```bash
git add apps/api/src/listings/listings.controller.ts apps/api/src/listings/listings.controller.spec.ts
git commit -m "feat(api): add ListingsController with 6 endpoints (public list/detail, mine, CRUD)"
```

---

## Task 11: `ListingImagesService` + spec

**Files:**
- Create: `apps/api/src/listings/listing-images.service.ts`
- Create: `apps/api/src/listings/listing-images.service.spec.ts`

- [ ] **Step 11.1: Create `apps/api/src/listings/listing-images.service.ts`**

```ts
import { randomUUID } from 'node:crypto'

import type { PublicListingImage } from '@kgm/types'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'

import { ApiException } from '../common/errors/api.exception'
import { PrismaService } from '../prisma/prisma.service'
import { STORAGE_TOKEN } from '../storage/storage.adapter'
import type { IStorageAdapter } from '../storage/storage.adapter'
import {
  ALLOWED_IMAGE_MIME,
  MAX_IMAGE_BYTES,
  isAllowedImageMime,
  mimeToExt,
} from '../storage/upload.constants'

import { ListingsService } from './listings.service'

const MAX_IMAGES_PER_LISTING = 10

export interface UploadedFile {
  buffer: Buffer
  mimetype: string
  size: number
}

@Injectable()
export class ListingImagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly listings: ListingsService,
    @Inject(STORAGE_TOKEN) private readonly storage: IStorageAdapter,
  ) {}

  async addImage(
    sellerId: string,
    listingId: string,
    file: UploadedFile,
  ): Promise<PublicListingImage> {
    await this.listings.assertOwnership(sellerId, listingId)
    this.validateFile(file)

    const count = await this.prisma.listingImage.count({ where: { listingId } })
    if (count >= MAX_IMAGES_PER_LISTING) {
      throw new ApiException(
        'LISTING_IMAGE_LIMIT_EXCEEDED',
        `Maximum ${MAX_IMAGES_PER_LISTING} images per listing`,
        HttpStatus.CONFLICT,
      )
    }

    const ext = mimeToExt(file.mimetype as (typeof ALLOWED_IMAGE_MIME)[number])
    const key = `listings/${listingId}/${randomUUID()}.${ext}`
    const { url } = await this.storage.upload(key, file.buffer, file.mimetype)

    const last = await this.prisma.listingImage.findFirst({
      where: { listingId },
      orderBy: { sortOrder: 'desc' },
    })
    const sortOrder = (last?.sortOrder ?? -1) + 1

    const image = await this.prisma.listingImage.create({
      data: { url, key, sortOrder, listingId },
    })
    return { id: image.id, url: image.url, sortOrder: image.sortOrder }
  }

  async removeImage(sellerId: string, listingId: string, imageId: string): Promise<void> {
    await this.listings.assertOwnership(sellerId, listingId)
    const image = await this.prisma.listingImage.findFirst({
      where: { id: imageId, listingId },
    })
    if (!image) {
      throw new ApiException('NOT_FOUND', 'Image not found', HttpStatus.NOT_FOUND)
    }
    await this.storage.delete(image.key)
    await this.prisma.listingImage.delete({ where: { id: imageId } })
  }

  private validateFile(file: UploadedFile): void {
    if (!file?.buffer || file.size === 0) {
      throw new ApiException(
        'LISTING_IMAGE_INVALID_TYPE',
        'No file uploaded',
        HttpStatus.BAD_REQUEST,
      )
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new ApiException(
        'LISTING_IMAGE_TOO_LARGE',
        `File exceeds ${MAX_IMAGE_BYTES} bytes`,
        HttpStatus.PAYLOAD_TOO_LARGE,
      )
    }
    if (!isAllowedImageMime(file.mimetype)) {
      throw new ApiException(
        'LISTING_IMAGE_INVALID_TYPE',
        `Allowed types: ${ALLOWED_IMAGE_MIME.join(', ')}`,
        HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      )
    }
  }
}
```

- [ ] **Step 11.2: Create `apps/api/src/listings/listing-images.service.spec.ts`**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PrismaService } from '../prisma/prisma.service'
import type { IStorageAdapter } from '../storage/storage.adapter'

import { ListingImagesService } from './listing-images.service'
import { ListingsService } from './listings.service'

const count = vi.fn()
const findFirst = vi.fn()
const create = vi.fn()
const del = vi.fn()
const prisma = {
  listingImage: { count, findFirst, create, delete: del },
} as unknown as PrismaService

const assertOwnership = vi.fn()
const listings = { assertOwnership } as unknown as ListingsService

const upload = vi.fn()
const remove = vi.fn()
const storage = { upload, delete: remove } as unknown as IStorageAdapter

const file = (overrides: Partial<{ size: number; mimetype: string }> = {}) => ({
  buffer: Buffer.from('img'),
  mimetype: 'image/jpeg',
  size: 3,
  ...overrides,
})

describe('ListingImagesService', () => {
  let svc: ListingImagesService

  beforeEach(() => {
    ;[count, findFirst, create, del, assertOwnership, upload, remove].forEach((m) => m.mockReset())
    svc = new ListingImagesService(prisma, listings, storage)
  })

  it('rejects when listing already has 10 images', async () => {
    assertOwnership.mockResolvedValue({ id: 'l1' })
    count.mockResolvedValue(10)
    await expect(svc.addImage('u1', 'l1', file())).rejects.toMatchObject({
      code: 'LISTING_IMAGE_LIMIT_EXCEEDED',
    })
  })

  it('rejects oversize files', async () => {
    assertOwnership.mockResolvedValue({ id: 'l1' })
    await expect(
      svc.addImage('u1', 'l1', file({ size: 6 * 1024 * 1024 })),
    ).rejects.toMatchObject({ code: 'LISTING_IMAGE_TOO_LARGE' })
  })

  it('rejects bad MIME', async () => {
    assertOwnership.mockResolvedValue({ id: 'l1' })
    await expect(svc.addImage('u1', 'l1', file({ mimetype: 'image/gif' }))).rejects.toMatchObject({
      code: 'LISTING_IMAGE_INVALID_TYPE',
    })
  })

  it('uploads, persists, and assigns sortOrder = max+1', async () => {
    assertOwnership.mockResolvedValue({ id: 'l1' })
    count.mockResolvedValue(2)
    upload.mockResolvedValue({ url: 'http://x/a.jpg', key: 'listings/l1/a.jpg' })
    findFirst.mockResolvedValue({ sortOrder: 4 })
    create.mockResolvedValue({ id: 'i1', url: 'http://x/a.jpg', sortOrder: 5 })

    const result = await svc.addImage('u1', 'l1', file())
    expect(upload).toHaveBeenCalledWith(
      expect.stringMatching(/^listings\/l1\/[0-9a-f-]+\.jpg$/),
      expect.any(Buffer),
      'image/jpeg',
    )
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ sortOrder: 5, listingId: 'l1' }),
    })
    expect(result).toEqual({ id: 'i1', url: 'http://x/a.jpg', sortOrder: 5 })
  })

  it('first image gets sortOrder 0', async () => {
    assertOwnership.mockResolvedValue({ id: 'l1' })
    count.mockResolvedValue(0)
    upload.mockResolvedValue({ url: 'u', key: 'k' })
    findFirst.mockResolvedValue(null)
    create.mockResolvedValue({ id: 'i1', url: 'u', sortOrder: 0 })

    const result = await svc.addImage('u1', 'l1', file())
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ sortOrder: 0 }),
    })
    expect(result.sortOrder).toBe(0)
  })

  it('removeImage deletes from storage and DB', async () => {
    assertOwnership.mockResolvedValue({ id: 'l1' })
    findFirst.mockResolvedValue({ id: 'i1', listingId: 'l1', key: 'listings/l1/x.jpg' })
    remove.mockResolvedValue(undefined)
    del.mockResolvedValue(undefined)

    await svc.removeImage('u1', 'l1', 'i1')
    expect(remove).toHaveBeenCalledWith('listings/l1/x.jpg')
    expect(del).toHaveBeenCalledWith({ where: { id: 'i1' } })
  })

  it('removeImage 404s on missing image', async () => {
    assertOwnership.mockResolvedValue({ id: 'l1' })
    findFirst.mockResolvedValue(null)
    await expect(svc.removeImage('u1', 'l1', 'i1')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})
```

- [ ] **Step 11.3: Run test, expect pass**

```bash
pnpm --filter=@kgm/api test -- listing-images.service.spec
```

Expected: PASS (7 tests).

- [ ] **Step 11.4: Commit**

```bash
git add apps/api/src/listings/listing-images.service.ts apps/api/src/listings/listing-images.service.spec.ts
git commit -m "feat(api): add ListingImagesService with upload, validation, and 10-per-listing cap"
```

---

## Task 12: `ListingImagesController` + spec

**Files:**
- Create: `apps/api/src/listings/listing-images.controller.ts`
- Create: `apps/api/src/listings/listing-images.controller.spec.ts`

- [ ] **Step 12.1: Create `apps/api/src/listings/listing-images.controller.ts`**

```ts
import type { PublicListingImage } from '@kgm/types'
import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'

import { CurrentUser } from '../common/decorators/current-user.decorator'
import type { AuthUserPayload } from '../common/types/authenticated-request'
import { MAX_IMAGE_BYTES } from '../storage/upload.constants'

import { ListingImagesService } from './listing-images.service'

interface MulterFile {
  buffer: Buffer
  mimetype: string
  size: number
}

@Controller('listings/:id/images')
export class ListingImagesController {
  constructor(private readonly images: ListingImagesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_BYTES } }))
  upload(
    @CurrentUser() auth: AuthUserPayload,
    @Param('id') id: string,
    @UploadedFile() file: MulterFile,
  ): Promise<PublicListingImage> {
    return this.images.addImage(auth.id, id, file)
  }

  @Delete(':imageId')
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentUser() auth: AuthUserPayload,
    @Param('id') id: string,
    @Param('imageId') imageId: string,
  ): Promise<null> {
    await this.images.removeImage(auth.id, id, imageId)
    return null
  }
}
```

- [ ] **Step 12.2: Create `apps/api/src/listings/listing-images.controller.spec.ts`**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthUserPayload } from '../common/types/authenticated-request'

import { ListingImagesController } from './listing-images.controller'
import { ListingImagesService } from './listing-images.service'

const addImage = vi.fn()
const removeImage = vi.fn()
const svc = { addImage, removeImage } as unknown as ListingImagesService

const auth: AuthUserPayload = { id: 'u1', email: 'a@b.c', role: 'BUYER' }
const file = { buffer: Buffer.from('img'), mimetype: 'image/jpeg', size: 3 }

describe('ListingImagesController', () => {
  let ctrl: ListingImagesController

  beforeEach(() => {
    addImage.mockReset()
    removeImage.mockReset()
    ctrl = new ListingImagesController(svc)
  })

  it('POST forwards file and ids to addImage', async () => {
    addImage.mockResolvedValue({ id: 'i1', url: 'u', sortOrder: 0 })
    const result = await ctrl.upload(auth, 'l1', file)
    expect(addImage).toHaveBeenCalledWith('u1', 'l1', file)
    expect(result).toEqual({ id: 'i1', url: 'u', sortOrder: 0 })
  })

  it('DELETE forwards ids and returns null', async () => {
    removeImage.mockResolvedValue(undefined)
    const result = await ctrl.remove(auth, 'l1', 'i1')
    expect(removeImage).toHaveBeenCalledWith('u1', 'l1', 'i1')
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 12.3: Run test, expect pass**

```bash
pnpm --filter=@kgm/api test -- listing-images.controller.spec
```

Expected: PASS (2 tests).

- [ ] **Step 12.4: Commit**

```bash
git add apps/api/src/listings/listing-images.controller.ts apps/api/src/listings/listing-images.controller.spec.ts
git commit -m "feat(api): add ListingImagesController with multipart upload and delete endpoints"
```

---

## Task 13: Wire `ListingsModule`

**Files:**
- Create: `apps/api/src/listings/listings.module.ts`

- [ ] **Step 13.1: Create the file**

```ts
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
```

- [ ] **Step 13.2: Commit**

```bash
git add apps/api/src/listings/listings.module.ts
git commit -m "feat(api): add ListingsModule wiring listings + listing-images"
```

---

## Task 14: Extend `UsersService` with `setAvatar`

**Files:**
- Modify: `apps/api/src/users/users.service.ts`
- Modify: `apps/api/src/users/users.service.spec.ts`

- [ ] **Step 14.1: Add method to `UsersService`**

In `apps/api/src/users/users.service.ts`, add (right after `updatePassword`):

```ts
  async setAvatar(id: string, avatarUrl: string): Promise<User> {
    try {
      return await this.prisma.user.update({ where: { id }, data: { avatarUrl } })
    } catch (err) {
      if (isPrismaNotFound(err)) {
        throw new ApiException('NOT_FOUND', 'User not found', HttpStatus.NOT_FOUND)
      }
      throw err
    }
  }
```

(`isPrismaNotFound`, `ApiException`, and `HttpStatus` are already imported in this file.)

- [ ] **Step 14.2: Add a `describe('setAvatar', ...)` block to the existing spec**

The existing spec uses a `prisma = makePrisma()` mock factory and a `service` variable inside `describe('UsersService', ...)`. Add this new sub-`describe` inside that block (alongside `describe('findById', ...)`, `describe('findByIdentifier', ...)` etc.):

```ts
  describe('setAvatar', () => {
    it('updates avatarUrl and returns the user', async () => {
      prisma.user.update.mockResolvedValue(dbUser({ avatarUrl: 'http://x/a.jpg' }))
      const result = await service.setAvatar('u1', 'http://x/a.jpg')
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { avatarUrl: 'http://x/a.jpg' },
      })
      expect(result.avatarUrl).toBe('http://x/a.jpg')
    })

    it('throws NOT_FOUND on Prisma P2025', async () => {
      prisma.user.update.mockRejectedValue({ code: 'P2025' })
      await expect(service.setAvatar('u1', 'u')).rejects.toMatchObject({
        code: 'NOT_FOUND',
      })
    })
  })
```

(`prisma`, `service`, and `dbUser` are already declared at the top of the file by Plan 1b.)

- [ ] **Step 14.3: Run users service tests**

```bash
pnpm --filter=@kgm/api test -- users.service.spec
```

Expected: all existing tests still pass + 2 new pass.

- [ ] **Step 14.4: Commit**

```bash
git add apps/api/src/users/users.service.ts apps/api/src/users/users.service.spec.ts
git commit -m "feat(api): add UsersService.setAvatar with NOT_FOUND mapping"
```

---

## Task 15: Avatar upload endpoint on `UsersController`

**Files:**
- Modify: `apps/api/src/users/users.controller.ts`
- Modify: `apps/api/src/users/users.controller.spec.ts`

- [ ] **Step 15.1: Replace the controller**

Replace `apps/api/src/users/users.controller.ts` entirely:

```ts
import { randomUUID } from 'node:crypto'

import { UpdateUserSchema } from '@kgm/types'
import type { PublicUser, UpdateUserInput } from '@kgm/types'
import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Inject,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ZodValidationPipe } from 'nestjs-zod'

import { CurrentUser } from '../common/decorators/current-user.decorator'
import { ApiException } from '../common/errors/api.exception'
import type { AuthUserPayload } from '../common/types/authenticated-request'
import { STORAGE_TOKEN } from '../storage/storage.adapter'
import type { IStorageAdapter } from '../storage/storage.adapter'
import {
  ALLOWED_IMAGE_MIME,
  MAX_IMAGE_BYTES,
  isAllowedImageMime,
  mimeToExt,
} from '../storage/upload.constants'

import { UsersService } from './users.service'

interface MulterFile {
  buffer: Buffer
  mimetype: string
  size: number
}

@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    @Inject(STORAGE_TOKEN) private readonly storage: IStorageAdapter,
  ) {}

  @Get('me')
  async me(@CurrentUser() auth: AuthUserPayload): Promise<PublicUser> {
    const user = await this.users.findById(auth.id)
    if (!user) throw new ApiException('NOT_FOUND', 'User not found', HttpStatus.NOT_FOUND)
    return this.users.toPublic(user)
  }

  @Patch('me')
  async updateMe(
    @CurrentUser() auth: AuthUserPayload,
    @Body(new ZodValidationPipe(UpdateUserSchema)) input: UpdateUserInput,
  ): Promise<PublicUser> {
    const updated = await this.users.updateProfile(auth.id, input)
    return this.users.toPublic(updated)
  }

  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_BYTES } }))
  async uploadAvatar(
    @CurrentUser() auth: AuthUserPayload,
    @UploadedFile() file: MulterFile,
  ): Promise<PublicUser> {
    if (!file?.buffer || file.size === 0) {
      throw new ApiException(
        'LISTING_IMAGE_INVALID_TYPE',
        'No file uploaded',
        HttpStatus.BAD_REQUEST,
      )
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new ApiException(
        'LISTING_IMAGE_TOO_LARGE',
        `File exceeds ${MAX_IMAGE_BYTES} bytes`,
        HttpStatus.PAYLOAD_TOO_LARGE,
      )
    }
    if (!isAllowedImageMime(file.mimetype)) {
      throw new ApiException(
        'LISTING_IMAGE_INVALID_TYPE',
        `Allowed types: ${ALLOWED_IMAGE_MIME.join(', ')}`,
        HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      )
    }
    const ext = mimeToExt(file.mimetype as (typeof ALLOWED_IMAGE_MIME)[number])
    const key = `avatars/${auth.id}/${randomUUID()}.${ext}`
    const { url } = await this.storage.upload(key, file.buffer, file.mimetype)
    const updated = await this.users.setAvatar(auth.id, url)
    return this.users.toPublic(updated)
  }
}
```

- [ ] **Step 15.2: Update `apps/api/src/users/users.controller.spec.ts`**

Replace the entire file:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthUserPayload } from '../common/types/authenticated-request'
import type { IStorageAdapter } from '../storage/storage.adapter'

import { UsersController } from './users.controller'
import { UsersService } from './users.service'

const findById = vi.fn()
const updateProfile = vi.fn()
const setAvatar = vi.fn()
const toPublic = vi.fn((u) => ({ ...u, createdAt: 'iso', updatedAt: 'iso' }))
const users = {
  findById,
  updateProfile,
  setAvatar,
  toPublic,
} as unknown as UsersService

const upload = vi.fn()
const storage = { upload, delete: vi.fn() } as unknown as IStorageAdapter

const auth: AuthUserPayload = { id: 'u1', email: 'a@b.c', role: 'BUYER' }

describe('UsersController', () => {
  let ctrl: UsersController

  beforeEach(() => {
    ;[findById, updateProfile, setAvatar, upload].forEach((m) => m.mockReset())
    toPublic.mockClear()
    ctrl = new UsersController(users, storage)
  })

  it('GET /users/me returns the current user', async () => {
    findById.mockResolvedValue({ id: 'u1', email: 'a@b.c' })
    const result = await ctrl.me(auth)
    expect(result.id).toBe('u1')
  })

  it('GET /users/me 404s when missing', async () => {
    findById.mockResolvedValue(null)
    await expect(ctrl.me(auth)).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('PATCH /users/me returns the updated profile', async () => {
    updateProfile.mockResolvedValue({ id: 'u1', firstName: 'Z' })
    const result = await ctrl.updateMe(auth, { firstName: 'Z' })
    expect(updateProfile).toHaveBeenCalledWith('u1', { firstName: 'Z' })
    expect(result.firstName).toBe('Z')
  })

  it('POST /users/me/avatar uploads, persists URL, and returns the user', async () => {
    upload.mockResolvedValue({ url: 'http://x/avatars/u1/a.jpg', key: 'avatars/u1/a.jpg' })
    setAvatar.mockResolvedValue({ id: 'u1', avatarUrl: 'http://x/avatars/u1/a.jpg' })
    const result = await ctrl.uploadAvatar(auth, {
      buffer: Buffer.from('img'),
      mimetype: 'image/jpeg',
      size: 3,
    })
    expect(upload).toHaveBeenCalledWith(
      expect.stringMatching(/^avatars\/u1\/[0-9a-f-]+\.jpg$/),
      expect.any(Buffer),
      'image/jpeg',
    )
    expect(setAvatar).toHaveBeenCalledWith('u1', 'http://x/avatars/u1/a.jpg')
    expect(result.avatarUrl).toBe('http://x/avatars/u1/a.jpg')
  })

  it('POST /users/me/avatar rejects bad MIME', async () => {
    await expect(
      ctrl.uploadAvatar(auth, { buffer: Buffer.from('x'), mimetype: 'image/gif', size: 1 }),
    ).rejects.toMatchObject({ code: 'LISTING_IMAGE_INVALID_TYPE' })
    expect(upload).not.toHaveBeenCalled()
  })

  it('POST /users/me/avatar rejects oversize', async () => {
    await expect(
      ctrl.uploadAvatar(auth, {
        buffer: Buffer.from('x'),
        mimetype: 'image/jpeg',
        size: 6 * 1024 * 1024,
      }),
    ).rejects.toMatchObject({ code: 'LISTING_IMAGE_TOO_LARGE' })
  })
})
```

- [ ] **Step 15.3: Run controller tests**

```bash
pnpm --filter=@kgm/api test -- users.controller.spec
```

Expected: PASS (6 tests).

- [ ] **Step 15.4: Commit**

```bash
git add apps/api/src/users/users.controller.ts apps/api/src/users/users.controller.spec.ts
git commit -m "feat(api): add POST /users/me/avatar with multipart upload validation"
```

---

## Task 16: Wire new modules into `AppModule`

**Files:**
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 16.1: Replace the file**

```ts
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
```

- [ ] **Step 16.2: Type-check + run all tests**

```bash
pnpm --filter=@kgm/api type-check
pnpm --filter=@kgm/api test
```

Expected: type-check exits 0; all suites pass (existing + new categories + listings + listing-images + extended users).

- [ ] **Step 16.3: Commit**

```bash
git add apps/api/src/app.module.ts
git commit -m "feat(api): wire StorageModule, CategoriesModule, ListingsModule into AppModule"
```

---

## Task 17: Lint + full build verification

**Files:** none (verification only)

- [ ] **Step 17.1: Run lint**

```bash
pnpm --filter=@kgm/api lint
```

Expected: exits 0. If `import/order` fails, reorder per the convention block at the top of this plan and re-run.

- [ ] **Step 17.2: Run type-check across workspaces**

```bash
pnpm type-check
```

Expected: exits 0.

- [ ] **Step 17.3: Build API**

```bash
pnpm --filter=@kgm/api build
```

Expected: `apps/api/dist/` rebuilt without error.

- [ ] **Step 17.4: Build all workspaces**

```bash
pnpm -r build
```

Expected: every workspace `build` script succeeds.

- [ ] **Step 17.5: Run full test suite across workspaces**

```bash
pnpm test
```

Expected: every workspace's tests pass.

- [ ] **Step 17.6: Commit any lint fixes (if any)**

```bash
git status
git add -A   # only if lint fixes were made
git commit -m "chore(api): lint fixes from phase 1c wiring"   # only if needed
```

---

## Task 18: End-to-end smoke test

**Files:** none (runtime check)

- [ ] **Step 18.1: Reset stack and start services**

```bash
cd /Users/ruwuioli/Documents/kgm
docker compose up -d
pnpm db:reset
pnpm --filter=@kgm/api dev
```

In a second terminal, with the API running, execute the curl commands below.

- [ ] **Step 18.2: Fetch the category tree**

```bash
curl -s http://localhost:3001/api/v1/categories | jq '.data | length, .data[0]'
```

Expected: top-level count > 0 (10–11 with the seeded taxonomy); first node has `nameRu`, `nameKy`, and a `children` array.

Save a category id for later:
```bash
CAT=$(curl -s http://localhost:3001/api/v1/categories | jq -r '.data[0].children[0].id')
echo "$CAT"
```

- [ ] **Step 18.3: Register + login**

```bash
curl -s -X POST http://localhost:3001/api/v1/auth/register \
  -H 'content-type: application/json' \
  -d '{"email":"smoke1c@example.com","phone":"+996700111222","password":"testpass1234","firstName":"Smoke","lastName":"OneCee"}' > /dev/null

ACCESS=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"identifier":"smoke1c@example.com","password":"testpass1234"}' | jq -r '.data.tokens.accessToken')
echo "ACCESS=${ACCESS:0:20}..."
```

Expected: `ACCESS=eyJ...` printed.

- [ ] **Step 18.4: Create a listing**

```bash
LISTING=$(curl -s -X POST http://localhost:3001/api/v1/listings \
  -H "authorization: Bearer $ACCESS" -H 'content-type: application/json' \
  -d "{\"title\":\"Smoke test listing one\",\"description\":\"Twenty plus characters of description text here.\",\"price\":15000,\"condition\":\"NEW\",\"categoryId\":\"$CAT\",\"location\":\"Bishkek\"}" \
  | jq -r '.data.id')
echo "LISTING=$LISTING"
```

Expected: `LISTING=<cuid>` printed. A `GET /listings/mine` shows it in DRAFT.

- [ ] **Step 18.5: Verify it's not in the public list (DRAFT)**

```bash
curl -s "http://localhost:3001/api/v1/listings" | jq ".data | map(select(.id == \"$LISTING\")) | length"
```

Expected: `0` (DRAFT listings are hidden from public).

- [ ] **Step 18.6: Activate the listing**

```bash
curl -s -X PATCH "http://localhost:3001/api/v1/listings/$LISTING" \
  -H "authorization: Bearer $ACCESS" -H 'content-type: application/json' \
  -d '{"status":"ACTIVE"}' | jq '.data.status'
```

Expected: `"ACTIVE"`.

- [ ] **Step 18.7: Public listing now visible**

```bash
curl -s "http://localhost:3001/api/v1/listings" | jq ".data | map(select(.id == \"$LISTING\")) | length"
```

Expected: `1`.

- [ ] **Step 18.8: Upload an image**

Generate a tiny test JPEG (or use any local file):
```bash
# create a 1x1 jpeg
printf '\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xdb\x00C\x00%s\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4\x00\x14\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xff\xc4\x00\x14\x10\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xff\xda\x00\x08\x01\x01\x00\x00?\x00\x37\xff\xd9' "$(printf '\x08%.0s' $(seq 1 64))" > /tmp/tiny.jpg
ls -la /tmp/tiny.jpg
```

Upload it:
```bash
curl -s -X POST "http://localhost:3001/api/v1/listings/$LISTING/images" \
  -H "authorization: Bearer $ACCESS" \
  -F "file=@/tmp/tiny.jpg;type=image/jpeg" | jq .
```

Expected: `{ "data": { "id": "...", "url": "http://localhost:9000/kgm-media/listings/<id>/<uuid>.jpg", "sortOrder": 0 } }`. Open the URL in a browser → image renders.

- [ ] **Step 18.9: Reject oversize image**

```bash
dd if=/dev/urandom of=/tmp/big.jpg bs=1M count=6 2>/dev/null
curl -s -o /dev/null -w "%{http_code}\n" -X POST "http://localhost:3001/api/v1/listings/$LISTING/images" \
  -H "authorization: Bearer $ACCESS" \
  -F "file=@/tmp/big.jpg;type=image/jpeg"
```

Expected: `413` (multer's pre-check) **or** an envelope with `LISTING_IMAGE_TOO_LARGE`. Either is acceptable — multer rejects before the controller for files exceeding `fileSize`.

- [ ] **Step 18.10: Reject bad MIME**

```bash
echo "hello" > /tmp/x.txt
curl -s -X POST "http://localhost:3001/api/v1/listings/$LISTING/images" \
  -H "authorization: Bearer $ACCESS" \
  -F "file=@/tmp/x.txt;type=text/plain" | jq .
```

Expected: `{ "error": { "code": "LISTING_IMAGE_INVALID_TYPE", ... } }`.

- [ ] **Step 18.11: Avatar upload**

```bash
curl -s -X POST http://localhost:3001/api/v1/users/me/avatar \
  -H "authorization: Bearer $ACCESS" \
  -F "file=@/tmp/tiny.jpg;type=image/jpeg" | jq '.data.avatarUrl'
```

Expected: `"http://localhost:9000/kgm-media/avatars/<userId>/<uuid>.jpg"`. URL renders the image when opened.

- [ ] **Step 18.12: Public listing detail increments viewCount**

```bash
V1=$(curl -s "http://localhost:3001/api/v1/listings/$LISTING" | jq '.data.viewCount')
V2=$(curl -s "http://localhost:3001/api/v1/listings/$LISTING" | jq '.data.viewCount')
echo "before=$V1 after=$V2"
```

Expected: `after = before + 1`.

- [ ] **Step 18.13: Cursor pagination**

Create a few more listings then page through:
```bash
for i in 2 3 4 5; do
  LID=$(curl -s -X POST http://localhost:3001/api/v1/listings \
    -H "authorization: Bearer $ACCESS" -H 'content-type: application/json' \
    -d "{\"title\":\"Smoke listing number $i\",\"description\":\"Twenty plus characters of description text here.\",\"price\":1000,\"condition\":\"NEW\",\"categoryId\":\"$CAT\",\"location\":\"Bishkek\"}" \
    | jq -r '.data.id')
  curl -s -X PATCH "http://localhost:3001/api/v1/listings/$LID" \
    -H "authorization: Bearer $ACCESS" -H 'content-type: application/json' \
    -d '{"status":"ACTIVE"}' > /dev/null
done

# page 1: limit 2
curl -s "http://localhost:3001/api/v1/listings?limit=2" | jq '{count: (.data|length), nextCursor}'
NEXT=$(curl -s "http://localhost:3001/api/v1/listings?limit=2" | jq -r '.nextCursor')
echo "NEXT=$NEXT"
# page 2: pass cursor
curl -s "http://localhost:3001/api/v1/listings?limit=2&cursor=$NEXT" | jq '{count: (.data|length), nextCursor}'
```

Expected: page 1 returns 2 items + non-null `nextCursor`. Page 2 returns 2 items with strictly older `id` values than page 1.

- [ ] **Step 18.14: Soft delete**

```bash
curl -s -X DELETE "http://localhost:3001/api/v1/listings/$LISTING" \
  -H "authorization: Bearer $ACCESS" | jq .
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3001/api/v1/listings/$LISTING"
```

Expected: DELETE returns `{ "data": null }`. Subsequent GET returns `404`.

- [ ] **Step 18.15: Non-owner cannot edit**

Register a second user, log them in, try to PATCH the original listing:
```bash
curl -s -X POST http://localhost:3001/api/v1/auth/register \
  -H 'content-type: application/json' \
  -d '{"email":"smoke1c-2@example.com","phone":"+996700111223","password":"testpass1234","firstName":"Other","lastName":"User"}' > /dev/null
ACCESS2=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"identifier":"smoke1c-2@example.com","password":"testpass1234"}' | jq -r '.data.tokens.accessToken')

# pick any not-yet-deleted listing id (from page 1 above)
TARGET=$(curl -s "http://localhost:3001/api/v1/listings?limit=1" | jq -r '.data[0].id')
curl -s -o /dev/null -w "%{http_code}\n" -X PATCH "http://localhost:3001/api/v1/listings/$TARGET" \
  -H "authorization: Bearer $ACCESS2" -H 'content-type: application/json' \
  -d '{"title":"Hijack attempt please ten chars"}'
```

Expected: `403` with envelope `{ error: { code: "FORBIDDEN", ... } }`.

- [ ] **Step 18.16: Image limit enforcement (optional, slow)**

Loop 11 times posting `/tmp/tiny.jpg` to a fresh listing:
```bash
NEW=$(curl -s -X POST http://localhost:3001/api/v1/listings \
  -H "authorization: Bearer $ACCESS" -H 'content-type: application/json' \
  -d "{\"title\":\"Image cap smoke listing\",\"description\":\"Twenty plus characters of description text here.\",\"price\":1,\"condition\":\"NEW\",\"categoryId\":\"$CAT\",\"location\":\"Bishkek\"}" \
  | jq -r '.data.id')
for i in $(seq 1 10); do
  curl -s -o /dev/null -X POST "http://localhost:3001/api/v1/listings/$NEW/images" \
    -H "authorization: Bearer $ACCESS" -F "file=@/tmp/tiny.jpg;type=image/jpeg"
done
curl -s -o /dev/null -w "%{http_code}\n" -X POST "http://localhost:3001/api/v1/listings/$NEW/images" \
  -H "authorization: Bearer $ACCESS" -F "file=@/tmp/tiny.jpg;type=image/jpeg"
```

Expected: 10 successful uploads, 11th returns `409` with `LISTING_IMAGE_LIMIT_EXCEEDED`.

- [ ] **Step 18.17: Stop the stack**

```bash
# In the API terminal, Ctrl+C
docker compose down
```

- [ ] **Step 18.18: No code change to commit**

If lint left no fixes after the smoke test, this task does not produce a commit. Skip.

---

## Self-Review Checklist

After completing all 18 tasks, verify:

- [ ] `GET /categories` returns the seeded tree as nested `children[]`.
- [ ] `GET /listings` shows only `ACTIVE`, non-soft-deleted listings; cursor pagination works (`nextCursor` rotates and points to strictly older `id`).
- [ ] `GET /listings/mine` returns all of caller's listings including DRAFT.
- [ ] `GET /listings/:id` increments `viewCount` atomically (check with two consecutive requests).
- [ ] `POST /listings` creates in DRAFT; ownership is `auth.id`.
- [ ] `PATCH /listings/:id` enforces ownership (403 for non-owner) and rejects illegal status transitions (e.g. `SOLD → ACTIVE` returns 409 `INVALID_STATUS_TRANSITION`).
- [ ] `DELETE /listings/:id` soft-deletes; subsequent GET is 404.
- [ ] `POST /listings/:id/images` enforces ownership, the 10-image cap (409), 5MB cap (413/too-large), and MIME allowlist (415). The returned URL renders in a browser.
- [ ] `DELETE /listings/:id/images/:imageId` removes from MinIO and DB.
- [ ] `POST /users/me/avatar` updates `User.avatarUrl` to the public URL; image renders.
- [ ] `pnpm lint`, `pnpm type-check`, `pnpm test`, `pnpm -r build` all exit 0.
- [ ] Service coverage ≥ 80% for `ListingsService`, `ListingImagesService`, `CategoriesService`, `MinioStorageAdapter`. Controller coverage ≥ 60% for `ListingsController`, `ListingImagesController`, `CategoriesController`, `UsersController` (avatar path).
- [ ] No `attributes` JSON, image reorder, recursive category filter, or orphan cleanup leaked into scope (all deferred).
