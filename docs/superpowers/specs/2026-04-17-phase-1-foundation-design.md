# Phase 1 — Foundation: Design Spec

**Date:** 2026-04-17
**Status:** Approved (design phase)
**Scope:** Weeks 1–4 of the KG Marketplace roadmap (see `CLAUDE.md` → Development Roadmap → Phase 1)

---

## 1. Purpose

Deliver a runnable monorepo with auth, user profiles, category browsing, and listing CRUD end-to-end. A fresh `git clone` should yield a working local stack where a seller can register, verify their phone, create a listing with images, and see it on a public listings page.

Everything outside this scope (search, messaging, orders, payments, admin, mobile, analytics) is deferred to later phases. Tables for those domains exist in the Prisma schema but are not exercised by endpoints or UI.

## 2. Constraints & decisions (locked)

- **External services: all stubbed.** MinIO replaces Cloudflare R2 (S3-compatible, swap is config-only). SMS and email output to the API console with `[SMS STUB]` / `[EMAIL STUB]` prefixes.
- **Testing posture: tests alongside code, not TDD.** Each module ships with unit tests before "done." Service coverage target 80%, controller 60%. No integration/E2E tests this phase.
- **Auth defaults:** email + phone login identifiers; random 6-digit OTP logged to console; access 15m / refresh 30d; password reset via one-time token (console-logged).
- **Web scope: seller-focused + bare `/listings` index.** Auth pages, profile, seller dashboard, listing CRUD. Public `/listings` is a paginated grid with no search/filter. Admin stays empty.
- **Execution approach: spine-first, then vertical slices.** Day 1 wires the full monorepo skeleton with minimal endpoints to prove the build. Subsequent work ships one domain end-to-end at a time.
- **Git: initialize at start.** Repo is not a git repo yet; first commit is the approved design + existing scaffold.

## 3. Architecture

### 3.1 Monorepo layout

```
apps/
  api/      NestJS 10 + Prisma, port 3001
  web/      Next.js 15 App Router, port 3000
  admin/    empty scaffold only (Phase 2)
packages/
  types/    Shared zod schemas + inferred TS types (@kgm/types)
  ui/       Shared React components (minimal in Phase 1)
  utils/    Pure helpers: KGS currency formatting, +996 phone parsing
  config/   tsconfig.base.json, eslint-base.js, tailwind.base.ts
infrastructure/
  docker/   docker-compose.yml + dockerfiles
```

### 3.2 Build tooling

- `pnpm` 9 workspaces, `turbo.json` pipelines: `build`, `lint`, `type-check`, `test`, `dev`.
- Strict TypeScript across all packages via `packages/config/tsconfig.base.json` (`strict: true`, `moduleResolution: "bundler"`).
- Shared ESLint + Prettier configs at the root and in `packages/config/`.
- Test runner: `vitest` everywhere (API + web + packages).

### 3.3 Shared types strategy

- `packages/types/src/` — one file per domain (`auth.ts`, `user.ts`, `category.ts`, `listing.ts`).
- Each file exports **zod schemas** plus inferred TS types (e.g. `CreateListingSchema` and `type CreateListingInput = z.infer<typeof CreateListingSchema>`).
- NestJS validates requests with `nestjs-zod` pipes using the same schemas. Web forms use `@hookform/resolvers/zod` with the same schemas. Single source of truth.

### 3.4 Spine-pass deliverables (Day 1)

- Root `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.prettierrc`, `.eslintrc.js`.
- NestJS bootstraps on `:3001` with a `GET /health` endpoint returning `{ status: "ok" }`.
- Next.js bootstraps on `:3000` with a placeholder homepage that fetches `/health` through the BFF proxy.
- Both apps import a stub from `@kgm/types` (proves workspace resolution).
- `docker compose up -d` brings up Postgres, Redis, Meilisearch, MinIO (+ MinIO bucket init).
- `pnpm dev` runs `api:dev` + `web:dev` in parallel via Turborepo.
- GitHub Actions CI runs lint + type-check + test + build on every PR to `main`.

## 4. Data model

### 4.1 Phase 1 usage

The Prisma schema at `apps/api/prisma/schema.prisma` already defines all marketplace entities. Phase 1 exercises only:

- `User`
- `RefreshToken`
- `Category`
- `Listing`
- `ListingImage`

Other models (`Favorite`, `Message`, `Order`, `Payment`, `Review`) remain untouched in Phase 1.

### 4.2 New model to add

```prisma
enum OtpPurpose {
  PHONE_VERIFY
  PASSWORD_RESET
}

model OtpCode {
  id          String     @id @default(cuid())
  code        String     // 6-digit numeric for phone; random token for password reset
  purpose     OtpPurpose
  userId      String?    // null for password reset requests keyed by email
  email       String?    // password-reset identifier
  expiresAt   DateTime
  consumedAt  DateTime?
  createdAt   DateTime   @default(now())

  user        User?      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, purpose])
  @@index([email, purpose])
  @@index([expiresAt])
}
```

Add `otpCodes OtpCode[]` back-relation to `User`.

### 4.3 Category seed

A seed script at `apps/api/prisma/seed.ts` populates a taxonomy (ru + ky names):

Top-level: Transport, Real Estate, Electronics, Home & Garden, Fashion, Kids, Hobbies, Animals, Services, Jobs, Business.

Each has 3–5 subcategories (e.g. Transport → Cars, Motorcycles, Parts & Accessories, Commercial Vehicles). Exact taxonomy defined in the seed file — not fixed in this spec so it can evolve without a spec update.

## 5. API surface

All routes prefixed `/api/v1`. Guards: `JwtAuthGuard` is global; `@Public()` decorator opts endpoints out.

| Module | Method | Path | Auth | Notes |
|---|---|---|---|---|
| auth | POST | `/auth/register` | Public | returns `{ user, tokens }` |
| auth | POST | `/auth/login` | Public | identifier = email or phone |
| auth | POST | `/auth/refresh` | Public | rotates refresh token |
| auth | POST | `/auth/logout` | Auth | revokes current refresh token |
| auth | POST | `/auth/verify-phone/request` | Auth | generates OTP, logs to console |
| auth | POST | `/auth/verify-phone/confirm` | Auth | sets `isPhoneVerified=true` |
| auth | POST | `/auth/password-reset/request` | Public | generates token, logs link |
| auth | POST | `/auth/password-reset/confirm` | Public | token + new password |
| users | GET | `/users/me` | Auth | current user profile |
| users | PATCH | `/users/me` | Auth | firstName, lastName, bio |
| users | POST | `/users/me/avatar` | Auth | multipart image upload |
| categories | GET | `/categories` | Public | returns full tree |
| listings | GET | `/listings` | Public | cursor-paginated, filter by `categoryId`, `sellerId` |
| listings | GET | `/listings/:id` | Public | increments `viewCount` |
| listings | POST | `/listings` | Auth | creates in `DRAFT` status |
| listings | PATCH | `/listings/:id` | Auth (owner) | |
| listings | DELETE | `/listings/:id` | Auth (owner) | soft delete |
| listings | POST | `/listings/:id/images` | Auth (owner) | multipart, **one file per request**; server rejects if listing already has 10 images |
| listings | DELETE | `/listings/:id/images/:imageId` | Auth (owner) | |

**Response envelope:** `{ data: T }` on success, `{ error: { code, message, details? } }` on failure. A global `AllExceptionsFilter` formats all errors.

**Pagination:** cursor-based on `GET /listings`. Query: `?cursor=<lastId>&limit=20` (default 20, max 50). Response: `{ data: Listing[], nextCursor: string | null }`.

## 6. Auth flow

### 6.1 Register

1. Client posts `{ email, phone, password, firstName, lastName }`.
2. Service validates uniqueness of email and phone.
3. Bcrypt hash (cost 12).
4. Creates `User` with `status=PENDING_VERIFICATION`, `role=BUYER`.
5. Issues access (15m) and refresh (30d) tokens; refresh token stored in `RefreshToken` table.
6. Returns `{ user, tokens }`. The `user` DTO never includes `passwordHash`.

Phone verification is **optional** — accounts are fully usable while unverified, but a dashboard banner prompts the user. Future phases may gate specific actions on verification.

### 6.2 Login

1. Client posts `{ identifier, password }` where identifier is email or phone (detected by `+` prefix).
2. Lookup by email or phone; bcrypt-compare password.
3. On success, issue fresh access + refresh tokens.
4. On failure, return 401 with error code `INVALID_CREDENTIALS`. Do not disclose whether the identifier existed.

### 6.3 Refresh

1. Client posts `{ refreshToken }`.
2. Verify JWT signature with `JWT_REFRESH_SECRET`.
3. Look up the token string in `RefreshToken` table (authoritative revocation list). Reject if missing or expired.
4. Delete the matched row (one-time-use rotation).
5. Issue new access + new refresh; insert the new refresh token string into `RefreshToken`.
6. Return `{ tokens }`.

### 6.4 Phone verification

1. Authed client posts `/auth/verify-phone/request`.
2. Service generates a random 6-digit code, inserts `OtpCode { purpose=PHONE_VERIFY, userId, code, expiresAt=now+10m }`.
3. Logs `[SMS STUB] +996XXXXXXXXX: Your verification code is 123456`.
4. Client posts `/auth/verify-phone/confirm` with `{ code }`.
5. Service finds the most recent unexpired, unconsumed OTP for this user+purpose; matches code; marks `consumedAt=now`; sets `user.isPhoneVerified=true`.

Rate limit: max 1 OTP request per user per 60s, max 5 confirm attempts per OTP.

### 6.5 Password reset

1. Client posts `/auth/password-reset/request` with `{ email }`.
2. If user exists, insert `OtpCode { purpose=PASSWORD_RESET, email, code=<random 32-byte hex>, expiresAt=now+30m }`.
3. Log `[EMAIL STUB] To <email>: reset link http://localhost:3000/reset-password?token=<code>`.
4. **Always return 200** — do not disclose whether the email exists.
5. Client posts `/auth/password-reset/confirm` with `{ token, newPassword }`.
6. Find unexpired, unconsumed OTP by code; update user password hash; mark OTP consumed; revoke all refresh tokens for that user.

### 6.6 JWT payload

- Access: `{ sub: userId, role, email, iat, exp }`. Signed with `JWT_SECRET`.
- Refresh: `{ sub: userId, iat, exp }`. Signed with `JWT_REFRESH_SECRET`. Revocation is enforced by presence in the `RefreshToken` table (see 6.3); the full signed token string is stored there.

## 7. File uploads

### 7.1 Storage adapter

```ts
interface IStorageAdapter {
  upload(key: string, buffer: Buffer, contentType: string): Promise<{ url: string; key: string }>;
  delete(key: string): Promise<void>;
}
```

Phase 1 implementation: `MinioStorageAdapter` using the official `minio` SDK. Phase 2 swaps in `R2StorageAdapter` via DI — no service-layer changes.

### 7.2 Rules

- Accepted MIME: `image/jpeg`, `image/png`, `image/webp`.
- Max 5 MB per file.
- Max 10 images per listing.
- Avatar path: `avatars/<userId>/<uuid>.<ext>`.
- Listing image path: `listings/<listingId>/<uuid>.<ext>`.
- Bucket `kgm-media` is created by the `minio-init` service with public-read policy on startup.

## 8. Web surface (`apps/web`)

### 8.1 Route structure

```
app/
  (auth)/
    login/page.tsx
    register/page.tsx
    verify-phone/page.tsx
    forgot-password/page.tsx
    reset-password/page.tsx
    layout.tsx                    centered card layout
  (marketplace)/
    page.tsx                      "/" — landing with CTA to /listings
    listings/page.tsx             paginated grid, no filters
    listings/[id]/page.tsx        detail view
    layout.tsx                    public header + footer
  (dashboard)/
    dashboard/page.tsx            seller dashboard home
    dashboard/listings/page.tsx
    dashboard/listings/new/page.tsx
    dashboard/listings/[id]/edit/page.tsx
    dashboard/profile/page.tsx
    layout.tsx                    authed header; redirects to /login if no session
  api/
    proxy/[...path]/route.ts      BFF proxy to NestJS
  layout.tsx                      next-intl provider, theme
  globals.css
```

### 8.2 Data fetching

- Server Components fetch through the BFF proxy route handler at `/api/proxy/...`. Browser never hits NestJS directly.
- Access + refresh tokens are stored in **httpOnly cookies** set by the BFF on login.
- On 401 from the backend, the BFF attempts a silent refresh using the refresh cookie; on success retries the request; on failure clears cookies and returns 401 to the client.
- Forms use React Server Actions where practical; the image-upload flow uses client-side `fetch` with `react-hook-form` (multipart).

### 8.3 Auth UX

- `/register` success → redirect to `/dashboard` with a dismissible banner prompting phone verification.
- `/verify-phone` → "Request code" button → "Code sent (check server console)" hint → code input.
- `/forgot-password` → email → "Check your inbox (or server console)" confirmation.
- `/reset-password?token=...` → new password form → redirect to `/login`.

### 8.4 Listing UX

- `/dashboard/listings/new` — single form:
  - Title (required, 10–100 chars)
  - Description (required, 20–5000 chars)
  - Price (required, positive integer KGS)
  - Condition (select: NEW / LIKE_NEW / GOOD / FAIR / FOR_PARTS)
  - Category (cascading select from `/categories` tree)
  - Location (required, text)
  - Images (drag-drop, up to 10, client-preview, POSTed to `/listings/:id/images` after the listing is created)
- `/listings` — public grid of cards, `limit=20`, "Load more" with `nextCursor`.
- `/listings/[id]` — hero image, thumbnail gallery, price, condition badge, seller name + avatar, description. "Message seller" button is present but disabled (Phase 2).

### 8.5 i18n

- `next-intl` with `ru` as default, `ky` as second locale.
- `messages/ru.json`, `messages/ky.json` contain every Phase 1 user-visible string.
- All text in components uses `t()` — no hardcoded strings.
- URL structure: default locale (`ru`) has no prefix; `ky` uses `/ky/...`.

### 8.6 Styling

- Tailwind CSS + shadcn/ui components generated into `packages/ui/`.
- Neutral palette and shadcn defaults. Visual design pass deferred to Phase 3.
- Mobile-first: base styles target mobile; `md:` breakpoints upscale to desktop.

## 9. Infrastructure (dev)

### 9.1 Docker Compose services

| Service | Image | Port(s) | Volume | Purpose |
|---|---|---|---|---|
| postgres | `postgres:16-alpine` | 5432 | `pg_data` | Primary DB |
| redis | `redis:7-alpine` | 6379 | — | Cache, rate limit, (BullMQ ready) |
| meilisearch | `getmeili/meilisearch:v1.8` | 7700 | `meili_data` | Container only; no indexing in Phase 1 |
| minio | `minio/minio` | 9000 (S3), 9001 (console) | `minio_data` | File storage |
| minio-init | alpine + mc | — | — | One-shot: creates `kgm-media` bucket, sets public-read policy |

All services share a `kgm` network. Environment variables sourced from the repo root `.env` (see `.env.example`).

### 9.2 Scripts

- `pnpm dev` — Turborepo parallel `api:dev` + `web:dev`.
- `pnpm db:migrate` — `prisma migrate dev` in `apps/api`.
- `pnpm db:seed` — seeds Categories and an optional admin test user.
- `pnpm db:reset` — drops, re-migrates, re-seeds (dev only).

## 10. CI

GitHub Actions at `.github/workflows/ci.yml`. Triggers: PRs to `main` and pushes to `main`. Single Node 20 job.

Steps:

1. Checkout with full history.
2. Setup pnpm 9 + Node 20 with pnpm-store cache keyed by `pnpm-lock.yaml`.
3. `pnpm install --frozen-lockfile`.
4. `pnpm lint`.
5. `pnpm type-check`.
6. `pnpm test` (unit tests only).
7. `pnpm build`.

Turborepo remote cache and integration-test jobs deferred to Phase 2.

## 11. Testing strategy

- **Unit tests** for services with business logic: auth (register, login, refresh, OTP, reset), listings (ownership checks, image limits), utilities in `packages/utils`. Coverage target: **80%**.
- **Controller tests** — one happy-path + one error-path per endpoint using `Test.createTestingModule` with mocked services. Coverage target: **60%**.
- **No integration/E2E tests** this phase — wait for stable API surface in Phase 2.
- Runner: `vitest` across API, web, and packages. Shared config at `packages/config/`.
- Tests co-located with source (`foo.service.spec.ts` next to `foo.service.ts`), per CLAUDE.md convention.

## 12. Out of scope (Phase 1)

The following exist in infrastructure or schema but are **not built** this phase:

- Meilisearch indexing or search endpoints (container runs; nothing queries it)
- WebSocket messaging gateway
- Orders, payments, reviews (tables exist; no endpoints or UI)
- Admin panel (`apps/admin/` stays empty)
- Real SMS / email providers (stubbed to console)
- Featured listings, favorites UI, saved searches, watchlist
- Push notifications, analytics, fraud detection
- Mobile app / React Native
- Kubernetes manifests, Terraform (directories stay empty)
- Production deployment pipeline

## 13. Definition of done

From a fresh `git clone`, a developer can:

1. Run `docker compose up -d && pnpm install && pnpm db:migrate && pnpm db:seed && pnpm dev`.
2. Register a new account at `/register`, landing on `/dashboard`.
3. Verify their phone using the OTP printed to the API console.
4. Create a listing with up to 10 images at `/dashboard/listings/new`.
5. See the listing on `/listings` and at `/listings/[id]`.
6. Reset their password via the link printed to the API console.
7. Open a PR and see CI pass: lint + type-check + tests + build all green.

All Phase 1 services meet their coverage targets (80% service / 60% controller).

## 14. References

- Roadmap: `CLAUDE.md` → "Development Roadmap" → Phase 1
- Architecture decisions: `docs/architecture.md`
- Prisma schema: `apps/api/prisma/schema.prisma`
- Env vars: `.env.example`
