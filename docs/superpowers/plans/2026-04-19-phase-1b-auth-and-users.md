# Phase 1b — Auth & Users: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a working authentication and user-profile vertical slice on the API: register, login, JWT access/refresh rotation, logout, phone OTP verification, email-token password reset, and authenticated `/users/me` profile read/update. SMS and email stubs log to the API console. All unit tests pass; service coverage ≥80%, controller ≥60%.

**Architecture:** `apps/api/src/auth/` is a NestJS module that depends on `users/`, `prisma/`, and a new `common/` shared-utilities module. JWT access tokens (15m) are signed with `JWT_SECRET`; refresh tokens (30d) are signed with `JWT_REFRESH_SECRET` and stored in the `RefreshToken` table as the authoritative revocation list. One-time passcodes (6-digit numeric for phone verify, 32-byte hex for password reset) live in the `OtpCode` table. A global `JwtAuthGuard` enforces auth; endpoints opt out with `@Public()`. All responses flow through a `{ data }` success envelope and a `{ error: { code, message, details? } }` error envelope via a global interceptor + filter. Shared zod schemas in `@kgm/types` are the single source of truth for request validation (via `nestjs-zod`) and future form validation on the web.

**Tech Stack:** NestJS 10 · `@nestjs/jwt` · `@nestjs/passport` · `passport-jwt` · `bcrypt` · `nestjs-zod` · Prisma 5 · PostgreSQL 16 · vitest 2 · zod 3.

**Scope of this plan:**
- **In:** auth endpoints (8), users endpoints (GET + PATCH `/users/me`), shared error + response envelopes, JWT guard + `@Public()` + `@CurrentUser()` decorators, OTP service, stubbed SMS/email notifier, end-to-end curl smoke test covering register → login → refresh → verify-phone → password-reset.
- **Out (deferred to Plan 1c):** `POST /users/me/avatar` (requires storage adapter), categories module, listings module. The users endpoint for avatar is explicitly deferred — `/users/me` stays read/update-only here.

---

## File Structure

Files created or modified by this plan. All paths are relative to the repo root (`/Users/ruwuioli/Documents/kgm`).

### `packages/types/` — shared zod schemas
- `packages/types/src/auth.ts` (create) — `RegisterSchema`, `LoginSchema`, `RefreshTokenSchema`, `LogoutSchema`, `RequestPhoneVerifySchema`, `ConfirmPhoneVerifySchema`, `RequestPasswordResetSchema`, `ConfirmPasswordResetSchema`, `AuthResponseSchema`, `TokensSchema`
- `packages/types/src/user.ts` (create) — `PublicUserSchema`, `UpdateUserSchema`
- `packages/types/src/error.ts` (create) — `ErrorCode` const + `ErrorResponseSchema`
- `packages/types/src/index.ts` (modify) — re-export new modules

### `apps/api/src/config/` — env validation
- `apps/api/src/config/env.ts` (modify) — add `BCRYPT_COST`, `OTP_REQUEST_COOLDOWN_SECONDS`, `OTP_VERIFY_EXPIRES_MINUTES`, `OTP_MAX_CONFIRM_ATTEMPTS`, `PASSWORD_RESET_EXPIRES_MINUTES`, `WEB_PUBLIC_URL`

### `apps/api/src/common/` — shared infrastructure
- `apps/api/src/common/common.module.ts` (create) — exports `PasswordService`, `NotificationService`
- `apps/api/src/common/errors/error-codes.ts` (create) — `ErrorCode` enum-like object
- `apps/api/src/common/errors/api.exception.ts` (create) — `ApiException` base class
- `apps/api/src/common/filters/all-exceptions.filter.ts` (create) — shapes all errors to envelope
- `apps/api/src/common/filters/all-exceptions.filter.spec.ts` (create)
- `apps/api/src/common/interceptors/response-envelope.interceptor.ts` (create) — wraps successful responses in `{ data }`
- `apps/api/src/common/interceptors/response-envelope.interceptor.spec.ts` (create)
- `apps/api/src/common/services/password.service.ts` (create)
- `apps/api/src/common/services/password.service.spec.ts` (create)
- `apps/api/src/common/services/notification.service.ts` (create)
- `apps/api/src/common/services/notification.service.spec.ts` (create)
- `apps/api/src/common/decorators/public.decorator.ts` (create) — `@Public()`
- `apps/api/src/common/decorators/current-user.decorator.ts` (create) — `@CurrentUser()`
- `apps/api/src/common/types/authenticated-request.ts` (create) — `AuthenticatedRequest`, `AuthUserPayload`

### `apps/api/src/users/` — user domain
- `apps/api/src/users/users.module.ts` (create)
- `apps/api/src/users/users.service.ts` (create) — `findById`, `findByEmail`, `findByPhone`, `findByIdentifier`, `create`, `updateProfile`, `updatePassword`, `setPhoneVerified`, `toPublic`
- `apps/api/src/users/users.service.spec.ts` (create)
- `apps/api/src/users/users.controller.ts` (create) — `GET /users/me`, `PATCH /users/me`
- `apps/api/src/users/users.controller.spec.ts` (create)

### `apps/api/src/auth/` — authentication domain
- `apps/api/src/auth/auth.module.ts` (create)
- `apps/api/src/auth/token.service.ts` (create) — `issueTokens`, `verifyAccess`, `verifyRefresh`, `storeRefresh`, `rotateRefresh`, `revokeRefresh`, `revokeAllForUser`
- `apps/api/src/auth/token.service.spec.ts` (create)
- `apps/api/src/auth/otp.service.ts` (create) — `createPhoneOtp`, `createPasswordResetOtp`, `consumePhoneOtp`, `consumePasswordResetOtp`
- `apps/api/src/auth/otp.service.spec.ts` (create)
- `apps/api/src/auth/auth.service.ts` (create) — `register`, `login`, `refresh`, `logout`, `requestPhoneVerify`, `confirmPhoneVerify`, `requestPasswordReset`, `confirmPasswordReset`
- `apps/api/src/auth/auth.service.spec.ts` (create)
- `apps/api/src/auth/auth.controller.ts` (create) — 8 endpoints
- `apps/api/src/auth/auth.controller.spec.ts` (create)
- `apps/api/src/auth/strategies/jwt.strategy.ts` (create) — `passport-jwt` strategy
- `apps/api/src/auth/guards/jwt-auth.guard.ts` (create) — honors `@Public()`

### `apps/api/src/app.module.ts` (modify) — import `CommonModule`, `AuthModule`, `UsersModule`; register global guard + filter + interceptor providers
### `apps/api/src/main.ts` (modify) — remove `ValidationPipe` in favor of `nestjs-zod` `ZodValidationPipe`

### `apps/api/package.json` (modify) — add deps
### `.env.example` (modify) — add new OTP + bcrypt variables + WEB_PUBLIC_URL

---

## Conventions (apply to every task)

- **Import order** (from `packages/config/eslint-base.cjs`): `builtin` → `external` → `internal` (workspace `@kgm/*`) → `parent` → `sibling` → `index`, **with blank line between groups** and alphabetized within each group. Use `import type` (split from value imports) per `consistent-type-imports`.
- **Inside each group**: `@kgm/*` imports come BEFORE `@nestjs/*` because the import-order plugin classifies `@kgm/*` as `internal` and `@nestjs/*` as `external`. So for a file importing both, the `external` group (`@nestjs/...`, then other external libs) comes first, then a blank line, then the `internal` group (`@kgm/...`). Follow the pattern already set in `apps/api/src/health/health.controller.ts`.
- **Tests**: `vitest` with `describe / it / expect / beforeEach` imported explicitly (no globals). Mock `PrismaService` as a plain object literal typed via `as unknown as PrismaService`. Mock other injected services with `vi.fn()`.
- **Error envelope**: throw `ApiException(code, message, status, details?)`. The global filter formats it.
- **Never log secrets** — password hashes, raw tokens, or OTP codes go to console only via the explicit `[SMS STUB]` / `[EMAIL STUB]` notification service.
- **Commit style**: Conventional Commits. Prefix scopes: `feat(api)`, `feat(types)`, `chore(api)`, `test(api)`. Every task ends with a commit.

---

## Task 1: Add shared zod schemas in `@kgm/types`

**Files:**
- Create: `packages/types/src/error.ts`
- Create: `packages/types/src/user.ts`
- Create: `packages/types/src/auth.ts`
- Modify: `packages/types/src/index.ts`

- [ ] **Step 1.1: Create `packages/types/src/error.ts`**

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

- [ ] **Step 1.2: Create `packages/types/src/user.ts`**

```ts
import { z } from 'zod'

export const UserRoleSchema = z.enum(['BUYER', 'SELLER', 'ADMIN'])
export const UserStatusSchema = z.enum(['ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION'])

export const PublicUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  role: UserRoleSchema,
  status: UserStatusSchema,
  firstName: z.string(),
  lastName: z.string(),
  avatarUrl: z.string().url().nullable(),
  bio: z.string().nullable(),
  isPhoneVerified: z.boolean(),
  isEmailVerified: z.boolean(),
  isIdentityVerified: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type PublicUser = z.infer<typeof PublicUserSchema>

export const UpdateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).nullable().optional(),
})

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>
```

- [ ] **Step 1.3: Create `packages/types/src/auth.ts`**

Phone regex: `/^\+996\d{9}$/` — must match the canonical form produced by `@kgm/utils` `parseKgPhone`.

```ts
import { z } from 'zod'

import { PublicUserSchema } from './user'

const phoneRegex = /^\+996\d{9}$/
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')

export const RegisterSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  phone: z.string().regex(phoneRegex, 'Phone must be in +996XXXXXXXXX format'),
  password: passwordSchema,
  firstName: z.string().min(1).max(100).trim(),
  lastName: z.string().min(1).max(100).trim(),
})

export type RegisterInput = z.infer<typeof RegisterSchema>

export const LoginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
})

export type LoginInput = z.infer<typeof LoginSchema>

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
})

export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>

export const LogoutSchema = z.object({
  refreshToken: z.string().min(1),
})

export type LogoutInput = z.infer<typeof LogoutSchema>

export const ConfirmPhoneVerifySchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
})

export type ConfirmPhoneVerifyInput = z.infer<typeof ConfirmPhoneVerifySchema>

export const RequestPasswordResetSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
})

export type RequestPasswordResetInput = z.infer<typeof RequestPasswordResetSchema>

export const ConfirmPasswordResetSchema = z.object({
  token: z.string().min(16),
  newPassword: passwordSchema,
})

export type ConfirmPasswordResetInput = z.infer<typeof ConfirmPasswordResetSchema>

export const TokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  accessTokenExpiresAt: z.string().datetime(),
  refreshTokenExpiresAt: z.string().datetime(),
})

export type Tokens = z.infer<typeof TokensSchema>

export const AuthResponseSchema = z.object({
  user: PublicUserSchema,
  tokens: TokensSchema,
})

export type AuthResponse = z.infer<typeof AuthResponseSchema>
```

- [ ] **Step 1.4: Update `packages/types/src/index.ts`**

Replace contents:

```ts
export * from './auth'
export * from './error'
export * from './health'
export * from './user'
```

- [ ] **Step 1.5: Type-check and commit**

Run:
```bash
pnpm --filter=@kgm/types type-check
```

Expected: exits 0 with no output.

```bash
git add packages/types
git commit -m "feat(types): add auth, user, and error zod schemas"
```

---

## Task 2: Expand env schema for auth knobs + add DI token

**Files:**
- Modify: `apps/api/src/config/env.ts`
- Create: `apps/api/src/config/env.token.ts`
- Modify: `.env.example`

- [ ] **Step 2.1: Extend `EnvSchema` in `apps/api/src/config/env.ts`**

Replace the existing `EnvSchema` definition with:

```ts
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  BCRYPT_COST: z.coerce.number().int().min(4).max(15).default(12),
  OTP_REQUEST_COOLDOWN_SECONDS: z.coerce.number().int().nonnegative().default(60),
  OTP_VERIFY_EXPIRES_MINUTES: z.coerce.number().int().positive().default(10),
  OTP_MAX_CONFIRM_ATTEMPTS: z.coerce.number().int().positive().default(5),
  PASSWORD_RESET_EXPIRES_MINUTES: z.coerce.number().int().positive().default(30),
  WEB_PUBLIC_URL: z.string().url().default('http://localhost:3000'),
  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z.coerce.number().int().positive().default(9000),
  MINIO_USE_SSL: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  MINIO_ACCESS_KEY: z.string().default('minioadmin'),
  MINIO_SECRET_KEY: z.string().default('minioadmin'),
  MINIO_BUCKET: z.string().default('kgm-media'),
  MINIO_PUBLIC_URL: z.string().url().default('http://localhost:9000/kgm-media'),
})
```

The rest of the file (`type Env`, `loadEnv`) stays unchanged.

- [ ] **Step 2.2: Create `apps/api/src/config/env.token.ts`**

```ts
export const ENV_TOKEN = Symbol.for('kgm.env')
```

This is the DI token used by `@Inject(ENV_TOKEN)` in services that depend on the validated env. A `CommonModule` (Task 9) registers a `useFactory: loadEnv` provider against this token.

- [ ] **Step 2.3: Update `.env.example`**

Insert a new block after the `JWT_REFRESH_EXPIRES_IN="30d"` line:

```
BCRYPT_COST="12"
OTP_REQUEST_COOLDOWN_SECONDS="60"
OTP_VERIFY_EXPIRES_MINUTES="10"
OTP_MAX_CONFIRM_ATTEMPTS="5"
PASSWORD_RESET_EXPIRES_MINUTES="30"
WEB_PUBLIC_URL="http://localhost:3000"
```

Also copy the same lines into `.env` (the working copy).

- [ ] **Step 2.4: Verify env loader**

Run:
```bash
pnpm --filter=@kgm/api type-check
```

Expected: exits 0.

- [ ] **Step 2.5: Commit**

```bash
git add apps/api/src/config/env.ts apps/api/src/config/env.token.ts .env.example
git commit -m "feat(api): extend env schema with auth knobs and add ENV_TOKEN DI symbol"
```

---

## Task 3: Install new backend dependencies

**Files:**
- Modify: `apps/api/package.json`

- [ ] **Step 3.1: Add production dependencies**

Run from repo root:
```bash
pnpm --filter=@kgm/api add @nestjs/jwt@^10.2.0 @nestjs/passport@^10.0.3 passport@^0.7.0 passport-jwt@^4.0.1 bcrypt@^5.1.1
```

- [ ] **Step 3.2: Add type definitions and test deps**

```bash
pnpm --filter=@kgm/api add -D @types/passport-jwt@^4.0.1 @types/bcrypt@^5.0.2
```

- [ ] **Step 3.3: Verify install**

```bash
pnpm install
pnpm --filter=@kgm/api type-check
```

Expected: both exit 0. The deps appear in `apps/api/package.json`.

- [ ] **Step 3.4: Commit**

```bash
git add apps/api/package.json pnpm-lock.yaml
git commit -m "chore(api): add jwt, passport, and bcrypt dependencies"
```

---

## Task 4: `common/errors/` — ApiException + error codes

**Files:**
- Create: `apps/api/src/common/errors/error-codes.ts`
- Create: `apps/api/src/common/errors/api.exception.ts`

- [ ] **Step 4.1: Create `apps/api/src/common/errors/error-codes.ts`**

```ts
export { ErrorCode } from '@kgm/types'
export type { ErrorCodeValue } from '@kgm/types'
```

Re-exporting keeps the API code importing from `@/common/errors` while types remain in `@kgm/types`.

- [ ] **Step 4.2: Create `apps/api/src/common/errors/api.exception.ts`**

```ts
import type { ErrorCodeValue } from '@kgm/types'
import { HttpException, HttpStatus } from '@nestjs/common'

export class ApiException extends HttpException {
  readonly code: ErrorCodeValue
  readonly details?: unknown

  constructor(
    code: ErrorCodeValue,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: unknown,
  ) {
    super({ code, message, details }, status)
    this.code = code
    this.details = details
  }
}
```

- [ ] **Step 4.3: Type-check**

Run:
```bash
pnpm --filter=@kgm/api type-check
```

Expected: exits 0.

- [ ] **Step 4.4: Commit**

```bash
git add apps/api/src/common/errors
git commit -m "feat(api): add ApiException and error-code barrel"
```

---

## Task 5: Global exception filter (with test)

**Files:**
- Create: `apps/api/src/common/filters/all-exceptions.filter.spec.ts`
- Create: `apps/api/src/common/filters/all-exceptions.filter.ts`

- [ ] **Step 5.1: Write failing filter test**

Create `apps/api/src/common/filters/all-exceptions.filter.spec.ts`:

```ts
import { BadRequestException, HttpStatus } from '@nestjs/common'
import { describe, it, expect, vi } from 'vitest'

import { ApiException } from '../errors/api.exception'

import { AllExceptionsFilter } from './all-exceptions.filter'

function makeHost(): { host: any; status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> } {
  const json = vi.fn()
  const status = vi.fn().mockReturnValue({ json })
  const response = { status }
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({ url: '/api/v1/test', method: 'GET' }),
    }),
  }
  return { host, status, json }
}

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter()

  it('formats ApiException with code, message, and details', () => {
    const { host, status, json } = makeHost()
    const exc = new ApiException('EMAIL_ALREADY_EXISTS', 'email taken', HttpStatus.CONFLICT, {
      field: 'email',
    })
    filter.catch(exc, host)
    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT)
    expect(json).toHaveBeenCalledWith({
      error: { code: 'EMAIL_ALREADY_EXISTS', message: 'email taken', details: { field: 'email' } },
    })
  })

  it('maps built-in HttpException to VALIDATION_FAILED when 400', () => {
    const { host, status, json } = makeHost()
    filter.catch(new BadRequestException('bad input'), host)
    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST)
    expect(json).toHaveBeenCalledWith({
      error: { code: 'VALIDATION_FAILED', message: 'bad input' },
    })
  })

  it('maps unknown errors to INTERNAL_ERROR with 500', () => {
    const { host, status, json } = makeHost()
    filter.catch(new Error('boom'), host)
    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR)
    expect(json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    })
  })
})
```

- [ ] **Step 5.2: Run test, expect failure**

```bash
pnpm --filter=@kgm/api test -- all-exceptions.filter.spec
```

Expected: FAIL with `Cannot find module './all-exceptions.filter'`.

- [ ] **Step 5.3: Create `apps/api/src/common/filters/all-exceptions.filter.ts`**

```ts
import type { ErrorCodeValue } from '@kgm/types'
import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common'
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common'
import type { Request, Response } from 'express'

import { ApiException } from '../errors/api.exception'

type ErrorBody = { code: ErrorCodeValue; message: string; details?: unknown }

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    const { status, body } = this.buildError(exception)

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${status} ${body.code}: ${body.message}`,
        exception instanceof Error ? exception.stack : undefined,
      )
    }

    response.status(status).json({ error: body })
  }

  private buildError(exception: unknown): { status: number; body: ErrorBody } {
    if (exception instanceof ApiException) {
      return {
        status: exception.getStatus(),
        body: { code: exception.code, message: exception.message, details: exception.details },
      }
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const response = exception.getResponse()
      const message =
        typeof response === 'string'
          ? response
          : ((response as { message?: string | string[] }).message ?? exception.message)
      return {
        status,
        body: {
          code: status === HttpStatus.BAD_REQUEST ? 'VALIDATION_FAILED' : 'INTERNAL_ERROR',
          message: Array.isArray(message) ? message.join(', ') : message,
        },
      }
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    }
  }
}
```

Note: the body omits `details` when it is `undefined` — the test expects no `details` key for non-`ApiException` cases. JSON.stringify drops undefined keys, so the test's `toHaveBeenCalledWith` exact match works.

- [ ] **Step 5.4: Run test, expect pass**

```bash
pnpm --filter=@kgm/api test -- all-exceptions.filter.spec
```

Expected: PASS (3 tests).

- [ ] **Step 5.5: Commit**

```bash
git add apps/api/src/common/filters
git commit -m "feat(api): add AllExceptionsFilter with error envelope"
```

---

## Task 6: Response envelope interceptor (with test)

**Files:**
- Create: `apps/api/src/common/interceptors/response-envelope.interceptor.spec.ts`
- Create: `apps/api/src/common/interceptors/response-envelope.interceptor.ts`

- [ ] **Step 6.1: Write failing test**

Create `apps/api/src/common/interceptors/response-envelope.interceptor.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { lastValueFrom, of } from 'rxjs'

import { ResponseEnvelopeInterceptor } from './response-envelope.interceptor'

describe('ResponseEnvelopeInterceptor', () => {
  const interceptor = new ResponseEnvelopeInterceptor()

  it('wraps a plain value in { data }', async () => {
    const next = { handle: () => of({ id: '1', name: 'foo' }) }
    const result = await lastValueFrom(interceptor.intercept({} as any, next))
    expect(result).toEqual({ data: { id: '1', name: 'foo' } })
  })

  it('wraps a primitive result in { data }', async () => {
    const next = { handle: () => of(42) }
    const result = await lastValueFrom(interceptor.intercept({} as any, next))
    expect(result).toEqual({ data: 42 })
  })

  it('passes through null', async () => {
    const next = { handle: () => of(null) }
    const result = await lastValueFrom(interceptor.intercept({} as any, next))
    expect(result).toEqual({ data: null })
  })
})
```

- [ ] **Step 6.2: Run test, expect failure**

```bash
pnpm --filter=@kgm/api test -- response-envelope.interceptor.spec
```

Expected: FAIL — module missing.

- [ ] **Step 6.3: Create `apps/api/src/common/interceptors/response-envelope.interceptor.ts`**

```ts
import { Injectable } from '@nestjs/common'
import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common'
import type { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<{ data: unknown }> {
    return next.handle().pipe(map((data) => ({ data })))
  }
}
```

- [ ] **Step 6.4: Run test, expect pass**

```bash
pnpm --filter=@kgm/api test -- response-envelope.interceptor.spec
```

Expected: PASS (3 tests).

- [ ] **Step 6.5: Commit**

```bash
git add apps/api/src/common/interceptors
git commit -m "feat(api): add ResponseEnvelopeInterceptor wrapping output in { data }"
```

---

## Task 7: `PasswordService` — bcrypt wrapper (with test)

**Files:**
- Create: `apps/api/src/common/services/password.service.spec.ts`
- Create: `apps/api/src/common/services/password.service.ts`

- [ ] **Step 7.1: Write failing test**

Create `apps/api/src/common/services/password.service.spec.ts`:

```ts
import { describe, it, expect } from 'vitest'

import type { Env } from '../../config/env'

import { PasswordService } from './password.service'

// Cost 4 is bcrypt's minimum; keeps the suite under 500ms.
const env = { BCRYPT_COST: 4 } as Env
const service = new PasswordService(env)

describe('PasswordService', () => {
  it('hash produces a different string than the input', async () => {
    const hash = await service.hash('pa$$word123')
    expect(hash).not.toBe('pa$$word123')
    expect(hash.startsWith('$2')).toBe(true)
  })

  it('compare returns true for matching password', async () => {
    const hash = await service.hash('pa$$word123')
    await expect(service.compare('pa$$word123', hash)).resolves.toBe(true)
  })

  it('compare returns false for wrong password', async () => {
    const hash = await service.hash('pa$$word123')
    await expect(service.compare('wrong-pw', hash)).resolves.toBe(false)
  })
})
```

- [ ] **Step 7.2: Run test, expect failure**

```bash
pnpm --filter=@kgm/api test -- password.service.spec
```

Expected: FAIL — module missing.

- [ ] **Step 7.3: Create `apps/api/src/common/services/password.service.ts`**

```ts
import { Inject, Injectable } from '@nestjs/common'
import * as bcrypt from 'bcrypt'

import type { Env } from '../../config/env'
import { ENV_TOKEN } from '../../config/env.token'

@Injectable()
export class PasswordService {
  constructor(@Inject(ENV_TOKEN) private readonly env: Env) {}

  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.env.BCRYPT_COST)
  }

  compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash)
  }
}
```

- [ ] **Step 7.4: Run test, expect pass**

```bash
pnpm --filter=@kgm/api test -- password.service.spec
```

Expected: PASS (3 tests) in < 500ms.

- [ ] **Step 7.5: Commit**

```bash
git add apps/api/src/common/services/password.service.ts \
        apps/api/src/common/services/password.service.spec.ts
git commit -m "feat(api): add PasswordService wrapping bcrypt with env-driven cost"
```

---

## Task 8: `NotificationService` — console-stub SMS + email (with test)

**Files:**
- Create: `apps/api/src/common/services/notification.service.spec.ts`
- Create: `apps/api/src/common/services/notification.service.ts`

- [ ] **Step 8.1: Write failing test**

Create `apps/api/src/common/services/notification.service.spec.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { NotificationService } from './notification.service'

describe('NotificationService', () => {
  let logSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('sends SMS via console stub with phone and code', async () => {
    const svc = new NotificationService()
    await svc.sendSmsOtp('+996700111222', '123456')
    expect(logSpy).toHaveBeenCalledWith(
      '[SMS STUB] +996700111222: Your verification code is 123456',
    )
  })

  it('sends email reset link via console stub', async () => {
    const svc = new NotificationService()
    await svc.sendPasswordResetEmail(
      'a@example.com',
      'http://localhost:3000/reset-password?token=abc123',
    )
    expect(logSpy).toHaveBeenCalledWith(
      '[EMAIL STUB] To a@example.com: reset link http://localhost:3000/reset-password?token=abc123',
    )
  })
})
```

- [ ] **Step 8.2: Run test, expect failure**

```bash
pnpm --filter=@kgm/api test -- notification.service.spec
```

Expected: FAIL — module missing.

- [ ] **Step 8.3: Create `apps/api/src/common/services/notification.service.ts`**

```ts
import { Injectable } from '@nestjs/common'

@Injectable()
export class NotificationService {
  sendSmsOtp(phone: string, code: string): Promise<void> {
    // eslint-disable-next-line no-console
    console.warn(`[SMS STUB] ${phone}: Your verification code is ${code}`)
    return Promise.resolve()
  }

  sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
    // eslint-disable-next-line no-console
    console.warn(`[EMAIL STUB] To ${email}: reset link ${resetUrl}`)
    return Promise.resolve()
  }
}
```

- [ ] **Step 8.4: Run test, expect pass**

```bash
pnpm --filter=@kgm/api test -- notification.service.spec
```

Expected: PASS (2 tests).

- [ ] **Step 8.5: Commit**

```bash
git add apps/api/src/common/services/notification.service.ts \
        apps/api/src/common/services/notification.service.spec.ts
git commit -m "feat(api): add NotificationService stubbing SMS and email to console"
```

---

## Task 9: Common module + decorators + auth types

**Files:**
- Create: `apps/api/src/common/decorators/public.decorator.ts`
- Create: `apps/api/src/common/decorators/current-user.decorator.ts`
- Create: `apps/api/src/common/types/authenticated-request.ts`
- Create: `apps/api/src/common/common.module.ts`

- [ ] **Step 9.1: Create `apps/api/src/common/decorators/public.decorator.ts`**

```ts
import { SetMetadata } from '@nestjs/common'

export const IS_PUBLIC_KEY = 'isPublic'
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true)
```

- [ ] **Step 9.2: Create `apps/api/src/common/types/authenticated-request.ts`**

```ts
import type { UserRole } from '@prisma/client'
import type { Request } from 'express'

export interface AuthUserPayload {
  id: string
  email: string
  role: UserRole
}

export interface AuthenticatedRequest extends Request {
  user: AuthUserPayload
}
```

- [ ] **Step 9.3: Create `apps/api/src/common/decorators/current-user.decorator.ts`**

```ts
import { createParamDecorator } from '@nestjs/common'
import type { ExecutionContext } from '@nestjs/common'

import type { AuthUserPayload, AuthenticatedRequest } from '../types/authenticated-request'

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUserPayload => {
    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>()
    return req.user
  },
)
```

- [ ] **Step 9.4: Create `apps/api/src/common/common.module.ts`**

```ts
import { Global, Module } from '@nestjs/common'

import { ENV_TOKEN } from '../config/env.token'
import { loadEnv } from '../config/env'

import { NotificationService } from './services/notification.service'
import { PasswordService } from './services/password.service'

@Global()
@Module({
  providers: [
    { provide: ENV_TOKEN, useFactory: loadEnv },
    PasswordService,
    NotificationService,
  ],
  exports: [ENV_TOKEN, PasswordService, NotificationService],
})
export class CommonModule {}
```

`@Global()` makes these providers available everywhere without re-importing `CommonModule`.

- [ ] **Step 9.5: Type-check**

```bash
pnpm --filter=@kgm/api type-check
```

Expected: exits 0.

- [ ] **Step 9.6: Commit**

```bash
git add apps/api/src/common
git commit -m "feat(api): add CommonModule with env, password, notification, and auth decorators"
```

---

## Task 10: `UsersService` with unit tests

**Files:**
- Create: `apps/api/src/users/users.service.spec.ts`
- Create: `apps/api/src/users/users.service.ts`

- [ ] **Step 10.1: Write failing tests**

Create `apps/api/src/users/users.service.spec.ts`:

```ts
import type { PrismaClient } from '@prisma/client'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { ApiException } from '../common/errors/api.exception'
import { PrismaService } from '../prisma/prisma.service'

import { UsersService } from './users.service'

type MockPrisma = {
  user: {
    findUnique: ReturnType<typeof vi.fn>
    findFirst: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
}

function makePrisma(): MockPrisma {
  return {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  }
}

function dbUser(overrides: Partial<Record<string, unknown>> = {}) {
  const now = new Date('2026-04-19T10:00:00.000Z')
  return {
    id: 'u1',
    email: 'a@example.com',
    phone: '+996700111222',
    passwordHash: '$2b$12$hash',
    role: 'BUYER',
    status: 'ACTIVE',
    firstName: 'Ann',
    lastName: 'Ko',
    avatarUrl: null,
    bio: null,
    isPhoneVerified: false,
    isEmailVerified: false,
    isIdentityVerified: false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  }
}

describe('UsersService', () => {
  let prisma: MockPrisma
  let service: UsersService

  beforeEach(() => {
    prisma = makePrisma()
    service = new UsersService(prisma as unknown as PrismaService)
  })

  describe('findById', () => {
    it('returns user when found and not soft-deleted', async () => {
      prisma.user.findFirst.mockResolvedValue(dbUser())
      const result = await service.findById('u1')
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { id: 'u1', deletedAt: null },
      })
      expect(result?.id).toBe('u1')
    })

    it('returns null when user missing', async () => {
      prisma.user.findFirst.mockResolvedValue(null)
      const result = await service.findById('missing')
      expect(result).toBeNull()
    })
  })

  describe('findByIdentifier', () => {
    it('looks up by phone when identifier starts with +', async () => {
      prisma.user.findFirst.mockResolvedValue(dbUser())
      await service.findByIdentifier('+996700111222')
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { phone: '+996700111222', deletedAt: null },
      })
    })

    it('looks up by lowercased email otherwise', async () => {
      prisma.user.findFirst.mockResolvedValue(dbUser())
      await service.findByIdentifier('A@Example.com')
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'a@example.com', deletedAt: null },
      })
    })
  })

  describe('create', () => {
    it('persists a new user with provided fields', async () => {
      prisma.user.create.mockResolvedValue(dbUser({ id: 'u2' }))
      const result = await service.create({
        email: 'a@example.com',
        phone: '+996700111222',
        passwordHash: '$2b$12$x',
        firstName: 'Ann',
        lastName: 'Ko',
      })
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'a@example.com',
          phone: '+996700111222',
          passwordHash: '$2b$12$x',
          firstName: 'Ann',
          lastName: 'Ko',
          role: 'BUYER',
          status: 'PENDING_VERIFICATION',
        },
      })
      expect(result.id).toBe('u2')
    })
  })

  describe('updateProfile', () => {
    it('updates allowed fields and returns updated record', async () => {
      prisma.user.update.mockResolvedValue(dbUser({ firstName: 'New' }))
      const result = await service.updateProfile('u1', { firstName: 'New' })
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { firstName: 'New' },
      })
      expect(result.firstName).toBe('New')
    })

    it('throws NOT_FOUND when prisma raises P2025', async () => {
      prisma.user.update.mockRejectedValue(
        Object.assign(new Error('no'), { code: 'P2025' }),
      )
      await expect(service.updateProfile('missing', { firstName: 'x' })).rejects.toBeInstanceOf(
        ApiException,
      )
    })
  })

  describe('toPublic', () => {
    it('omits passwordHash and deletedAt and ISO-serializes dates', () => {
      const result = service.toPublic(dbUser())
      expect(result).not.toHaveProperty('passwordHash')
      expect(result).not.toHaveProperty('deletedAt')
      expect(result.createdAt).toBe('2026-04-19T10:00:00.000Z')
    })
  })
})
```

- [ ] **Step 10.2: Run test, expect failure**

```bash
pnpm --filter=@kgm/api test -- users.service.spec
```

Expected: FAIL — module missing.

- [ ] **Step 10.3: Create `apps/api/src/users/users.service.ts`**

```ts
import type { PublicUser } from '@kgm/types'
import { HttpStatus, Injectable } from '@nestjs/common'
import type { Prisma, User } from '@prisma/client'

import { ApiException } from '../common/errors/api.exception'
import { PrismaService } from '../prisma/prisma.service'

export interface CreateUserInput {
  email: string
  phone: string
  passwordHash: string
  firstName: string
  lastName: string
}

export interface UpdateProfileInput {
  firstName?: string
  lastName?: string
  bio?: string | null
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findFirst({ where: { id, deletedAt: null } })
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    })
  }

  findByPhone(phone: string): Promise<User | null> {
    return this.prisma.user.findFirst({ where: { phone, deletedAt: null } })
  }

  findByIdentifier(identifier: string): Promise<User | null> {
    if (identifier.startsWith('+')) return this.findByPhone(identifier)
    return this.findByEmail(identifier)
  }

  create(input: CreateUserInput): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: input.email,
        phone: input.phone,
        passwordHash: input.passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        role: 'BUYER',
        status: 'PENDING_VERIFICATION',
      },
    })
  }

  async updateProfile(id: string, input: UpdateProfileInput): Promise<User> {
    const data: Prisma.UserUpdateInput = {}
    if (input.firstName !== undefined) data.firstName = input.firstName
    if (input.lastName !== undefined) data.lastName = input.lastName
    if (input.bio !== undefined) data.bio = input.bio
    try {
      return await this.prisma.user.update({ where: { id }, data })
    } catch (err) {
      if (isPrismaNotFound(err)) {
        throw new ApiException('NOT_FOUND', 'User not found', HttpStatus.NOT_FOUND)
      }
      throw err
    }
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { passwordHash } })
  }

  async setPhoneVerified(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { isPhoneVerified: true, status: 'ACTIVE' },
    })
  }

  toPublic(user: User): PublicUser {
    const { passwordHash: _pw, deletedAt: _del, createdAt, updatedAt, ...rest } = user
    return {
      ...rest,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    }
  }
}

function isPrismaNotFound(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'P2025'
}
```

- [ ] **Step 10.4: Run test, expect pass**

```bash
pnpm --filter=@kgm/api test -- users.service.spec
```

Expected: PASS (8 tests).

- [ ] **Step 10.5: Commit**

```bash
git add apps/api/src/users/users.service.ts apps/api/src/users/users.service.spec.ts
git commit -m "feat(api): add UsersService with CRUD, identifier lookup, and toPublic"
```

---

## Task 11: `UsersController` with unit tests

**Files:**
- Create: `apps/api/src/users/users.controller.spec.ts`
- Create: `apps/api/src/users/users.controller.ts`

- [ ] **Step 11.1: Write failing tests**

Create `apps/api/src/users/users.controller.spec.ts`:

```ts
import { HttpStatus } from '@nestjs/common'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { ApiException } from '../common/errors/api.exception'
import type { AuthUserPayload } from '../common/types/authenticated-request'

import { UsersController } from './users.controller'
import type { UsersService } from './users.service'

function makeService(): UsersService {
  return {
    findById: vi.fn(),
    updateProfile: vi.fn(),
    toPublic: vi.fn((u: unknown) => u),
  } as unknown as UsersService
}

const authUser: AuthUserPayload = { id: 'u1', email: 'a@example.com', role: 'BUYER' }

describe('UsersController', () => {
  let svc: UsersService
  let controller: UsersController

  beforeEach(() => {
    svc = makeService()
    controller = new UsersController(svc)
  })

  describe('GET /users/me', () => {
    it('returns the current user', async () => {
      const user = { id: 'u1' }
      ;(svc.findById as ReturnType<typeof vi.fn>).mockResolvedValue(user)
      const result = await controller.me(authUser)
      expect(svc.findById).toHaveBeenCalledWith('u1')
      expect(result).toBe(user)
    })

    it('throws NOT_FOUND when user disappears', async () => {
      ;(svc.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null)
      await expect(controller.me(authUser)).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: expect.any(String),
      } as unknown as ApiException)
    })
  })

  describe('PATCH /users/me', () => {
    it('delegates to service and returns public user', async () => {
      const updated = { id: 'u1', firstName: 'New' }
      ;(svc.updateProfile as ReturnType<typeof vi.fn>).mockResolvedValue(updated)
      const result = await controller.updateMe(authUser, { firstName: 'New' })
      expect(svc.updateProfile).toHaveBeenCalledWith('u1', { firstName: 'New' })
      expect(result).toEqual(updated)
    })
  })
})
```

- [ ] **Step 11.2: Run test, expect failure**

```bash
pnpm --filter=@kgm/api test -- users.controller.spec
```

Expected: FAIL — module missing.

- [ ] **Step 11.3: Create `apps/api/src/users/users.controller.ts`**

```ts
import { UpdateUserSchema } from '@kgm/types'
import type { PublicUser, UpdateUserInput } from '@kgm/types'
import { Body, Controller, Get, HttpStatus, Patch } from '@nestjs/common'
import { ZodValidationPipe } from 'nestjs-zod'

import { CurrentUser } from '../common/decorators/current-user.decorator'
import { ApiException } from '../common/errors/api.exception'
import type { AuthUserPayload } from '../common/types/authenticated-request'

import { UsersService } from './users.service'

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

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
}
```

- [ ] **Step 11.4: Run test, expect pass**

```bash
pnpm --filter=@kgm/api test -- users.controller.spec
```

Expected: PASS (3 tests).

- [ ] **Step 11.5: Create `apps/api/src/users/users.module.ts`**

```ts
import { Module } from '@nestjs/common'

import { PrismaModule } from '../prisma/prisma.module'

import { UsersController } from './users.controller'
import { UsersService } from './users.service'

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

- [ ] **Step 11.6: Commit**

```bash
git add apps/api/src/users
git commit -m "feat(api): add UsersController, UsersModule, and controller tests"
```

---

## Task 12: `TokenService` — JWT issuance + refresh table (with test)

**Files:**
- Create: `apps/api/src/auth/token.service.spec.ts`
- Create: `apps/api/src/auth/token.service.ts`

- [ ] **Step 12.1: Write failing test**

Create `apps/api/src/auth/token.service.spec.ts`:

```ts
import { JwtModule, JwtService } from '@nestjs/jwt'
import { Test } from '@nestjs/testing'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { ENV_TOKEN } from '../config/env.token'
import type { Env } from '../config/env'
import { PrismaService } from '../prisma/prisma.service'

import { TokenService } from './token.service'

const env: Env = {
  NODE_ENV: 'test',
  API_PORT: 3001,
  DATABASE_URL: 'postgres://u:p@h:5432/d',
  REDIS_URL: 'redis://h:6379',
  JWT_SECRET: 'test-access-secret-1234567890',
  JWT_REFRESH_SECRET: 'test-refresh-secret-1234567890',
  JWT_ACCESS_EXPIRES_IN: '15m',
  JWT_REFRESH_EXPIRES_IN: '30d',
  BCRYPT_COST: 4,
  OTP_REQUEST_COOLDOWN_SECONDS: 60,
  OTP_VERIFY_EXPIRES_MINUTES: 10,
  OTP_MAX_CONFIRM_ATTEMPTS: 5,
  PASSWORD_RESET_EXPIRES_MINUTES: 30,
  WEB_PUBLIC_URL: 'http://localhost:3000',
  MINIO_ENDPOINT: 'localhost',
  MINIO_PORT: 9000,
  MINIO_USE_SSL: false,
  MINIO_ACCESS_KEY: 'x',
  MINIO_SECRET_KEY: 'x',
  MINIO_BUCKET: 'kgm-media',
  MINIO_PUBLIC_URL: 'http://localhost:9000/kgm-media',
}

type MockPrisma = {
  refreshToken: {
    create: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
    deleteMany: ReturnType<typeof vi.fn>
  }
}

function makePrisma(): MockPrisma {
  return {
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  }
}

describe('TokenService', () => {
  let prisma: MockPrisma
  let jwt: JwtService
  let service: TokenService

  beforeEach(async () => {
    prisma = makePrisma()
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({})],
    }).compile()
    jwt = moduleRef.get(JwtService)
    service = new TokenService(env, prisma as unknown as PrismaService, jwt)
  })

  it('issueTokens returns a signed access + refresh pair and persists refresh', async () => {
    prisma.refreshToken.create.mockResolvedValue({})
    const result = await service.issueTokens({ id: 'u1', email: 'a@example.com', role: 'BUYER' })
    expect(result.accessToken).toMatch(/^eyJ/)
    expect(result.refreshToken).toMatch(/^eyJ/)
    const now = Date.now()
    expect(new Date(result.accessTokenExpiresAt).getTime()).toBeGreaterThan(now)
    expect(new Date(result.refreshTokenExpiresAt).getTime()).toBeGreaterThan(now)
    expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1)
    const call = prisma.refreshToken.create.mock.calls[0][0]
    expect(call.data.token).toBe(result.refreshToken)
    expect(call.data.userId).toBe('u1')
  })

  it('verifyAccess decodes a token signed with the access secret', async () => {
    prisma.refreshToken.create.mockResolvedValue({})
    const tokens = await service.issueTokens({ id: 'u1', email: 'a@example.com', role: 'BUYER' })
    const payload = service.verifyAccess(tokens.accessToken)
    expect(payload.sub).toBe('u1')
    expect(payload.role).toBe('BUYER')
  })

  it('verifyRefresh throws TOKEN_INVALID for a tampered token', () => {
    expect(() => service.verifyRefresh('not-a-jwt')).toThrow(/TOKEN_INVALID|invalid/i)
  })

  it('rotateRefresh deletes old row and creates a new one', async () => {
    prisma.refreshToken.create.mockResolvedValue({})
    const first = await service.issueTokens({ id: 'u1', email: 'a@example.com', role: 'BUYER' })
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'r1',
      token: first.refreshToken,
      userId: 'u1',
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
    })
    prisma.refreshToken.delete.mockResolvedValue({})
    const rotated = await service.rotateRefresh(first.refreshToken)
    expect(prisma.refreshToken.delete).toHaveBeenCalledWith({ where: { token: first.refreshToken } })
    expect(rotated.refreshToken).not.toBe(first.refreshToken)
  })

  it('rotateRefresh throws TOKEN_INVALID when row missing', async () => {
    prisma.refreshToken.create.mockResolvedValue({})
    const tokens = await service.issueTokens({ id: 'u1', email: 'a@example.com', role: 'BUYER' })
    prisma.refreshToken.findUnique.mockResolvedValue(null)
    await expect(service.rotateRefresh(tokens.refreshToken)).rejects.toMatchObject({
      code: 'TOKEN_INVALID',
    })
  })

  it('revokeAllForUser deletes all rows for a user', async () => {
    prisma.refreshToken.deleteMany.mockResolvedValue({ count: 3 })
    await service.revokeAllForUser('u1')
    expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } })
  })
})
```

- [ ] **Step 12.2: Run test, expect failure**

```bash
pnpm --filter=@kgm/api test -- token.service.spec
```

Expected: FAIL — module missing.

- [ ] **Step 12.3: Create `apps/api/src/auth/token.service.ts`**

```ts
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import type { UserRole } from '@prisma/client'

import { ApiException } from '../common/errors/api.exception'
import type { AuthUserPayload } from '../common/types/authenticated-request'
import type { Env } from '../config/env'
import { ENV_TOKEN } from '../config/env.token'
import { PrismaService } from '../prisma/prisma.service'

export interface IssuedTokens {
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt: string
  refreshTokenExpiresAt: string
}

export interface AccessTokenPayload {
  sub: string
  email: string
  role: UserRole
  iat: number
  exp: number
}

export interface RefreshTokenPayload {
  sub: string
  iat: number
  exp: number
}

@Injectable()
export class TokenService {
  constructor(
    @Inject(ENV_TOKEN) private readonly env: Env,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async issueTokens(user: AuthUserPayload): Promise<IssuedTokens> {
    const accessToken = this.jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      { secret: this.env.JWT_SECRET, expiresIn: this.env.JWT_ACCESS_EXPIRES_IN },
    )
    const refreshToken = this.jwt.sign(
      { sub: user.id },
      { secret: this.env.JWT_REFRESH_SECRET, expiresIn: this.env.JWT_REFRESH_EXPIRES_IN },
    )
    const accessPayload = this.jwt.decode(accessToken) as AccessTokenPayload
    const refreshPayload = this.jwt.decode(refreshToken) as RefreshTokenPayload
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(refreshPayload.exp * 1000),
      },
    })
    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt: new Date(accessPayload.exp * 1000).toISOString(),
      refreshTokenExpiresAt: new Date(refreshPayload.exp * 1000).toISOString(),
    }
  }

  verifyAccess(token: string): AccessTokenPayload {
    try {
      return this.jwt.verify<AccessTokenPayload>(token, { secret: this.env.JWT_SECRET })
    } catch (err) {
      throw new ApiException(
        'TOKEN_INVALID',
        err instanceof Error ? err.message : 'Invalid access token',
        HttpStatus.UNAUTHORIZED,
      )
    }
  }

  verifyRefresh(token: string): RefreshTokenPayload {
    try {
      return this.jwt.verify<RefreshTokenPayload>(token, { secret: this.env.JWT_REFRESH_SECRET })
    } catch (err) {
      throw new ApiException(
        'TOKEN_INVALID',
        err instanceof Error ? err.message : 'Invalid refresh token',
        HttpStatus.UNAUTHORIZED,
      )
    }
  }

  async rotateRefresh(oldToken: string): Promise<IssuedTokens> {
    const payload = this.verifyRefresh(oldToken)
    const row = await this.prisma.refreshToken.findUnique({ where: { token: oldToken } })
    if (!row || row.expiresAt.getTime() < Date.now()) {
      throw new ApiException(
        'TOKEN_INVALID',
        'Refresh token not recognized',
        HttpStatus.UNAUTHORIZED,
      )
    }
    await this.prisma.refreshToken.delete({ where: { token: oldToken } })
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } })
    if (!user || user.deletedAt !== null) {
      throw new ApiException('TOKEN_INVALID', 'User no longer exists', HttpStatus.UNAUTHORIZED)
    }
    return this.issueTokens({ id: user.id, email: user.email, role: user.role })
  }

  async revokeRefresh(token: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({ where: { token } })
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({ where: { userId } })
  }
}
```

Note: `rotateRefresh` now reads `user` via `prisma.user.findUnique`. Add the `user` mock helper to the spec before running:

Update `makePrisma()` in the test to include the `user` table:

```ts
function makePrisma(): MockPrisma {
  return {
    refreshToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'u1',
        email: 'a@example.com',
        role: 'BUYER',
        deletedAt: null,
      }),
    },
  }
}
```

and extend the `MockPrisma` type:

```ts
type MockPrisma = {
  refreshToken: {
    create: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
    deleteMany: ReturnType<typeof vi.fn>
  }
  user: { findUnique: ReturnType<typeof vi.fn> }
}
```

- [ ] **Step 12.4: Run test, expect pass**

```bash
pnpm --filter=@kgm/api test -- token.service.spec
```

Expected: PASS (6 tests).

- [ ] **Step 12.5: Commit**

```bash
git add apps/api/src/auth/token.service.ts apps/api/src/auth/token.service.spec.ts
git commit -m "feat(api): add TokenService for JWT issue, verify, rotate, and revoke"
```

---

## Task 13: `OtpService` — create + consume OTPs (with test)

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_add_otp_attempts/migration.sql` (Prisma-generated)
- Create: `apps/api/src/auth/otp.service.spec.ts`
- Create: `apps/api/src/auth/otp.service.ts`

- [ ] **Step 13.1: Add `attempts` column to the `OtpCode` model**

Edit `apps/api/prisma/schema.prisma`. Find the `OtpCode` model and add a single field between `consumedAt` and `createdAt`:

```prisma
model OtpCode {
  id         String     @id @default(cuid())
  code       String
  purpose    OtpPurpose
  userId     String?
  email      String?
  expiresAt  DateTime
  consumedAt DateTime?
  attempts   Int        @default(0)
  createdAt  DateTime   @default(now())

  user       User?      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, purpose])
  @@index([email, purpose])
  @@index([expiresAt])
}
```

- [ ] **Step 13.2: Generate and apply the migration**

Run from repo root:
```bash
pnpm --filter=@kgm/api db:migrate
```

At the prompt, name the migration: `add_otp_attempts`.

Expected: a new directory `apps/api/prisma/migrations/<timestamp>_add_otp_attempts/` appears containing `migration.sql` with an `ALTER TABLE "OtpCode" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;`. Prisma client regenerates automatically.

- [ ] **Step 13.3: Write failing tests**

Create `apps/api/src/auth/otp.service.spec.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

import type { Env } from '../config/env'
import type { PrismaService } from '../prisma/prisma.service'

import { OtpService } from './otp.service'

const env: Env = {
  OTP_REQUEST_COOLDOWN_SECONDS: 60,
  OTP_VERIFY_EXPIRES_MINUTES: 10,
  OTP_MAX_CONFIRM_ATTEMPTS: 5,
  PASSWORD_RESET_EXPIRES_MINUTES: 30,
} as Env

type MockPrisma = {
  otpCode: {
    create: ReturnType<typeof vi.fn>
    findFirst: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    count: ReturnType<typeof vi.fn>
  }
}

function makePrisma(): MockPrisma {
  return {
    otpCode: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  }
}

describe('OtpService', () => {
  let prisma: MockPrisma
  let service: OtpService

  beforeEach(() => {
    prisma = makePrisma()
    service = new OtpService(env, prisma as unknown as PrismaService)
  })

  describe('createPhoneOtp', () => {
    it('throws OTP_COOLDOWN when a recent unexpired OTP already exists', async () => {
      prisma.otpCode.findFirst.mockResolvedValue({
        id: 'o1',
        code: '123456',
        purpose: 'PHONE_VERIFY',
        userId: 'u1',
        expiresAt: new Date(Date.now() + 60_000),
        consumedAt: null,
        createdAt: new Date(Date.now() - 5_000),
      })
      await expect(service.createPhoneOtp('u1')).rejects.toMatchObject({ code: 'OTP_COOLDOWN' })
      expect(prisma.otpCode.create).not.toHaveBeenCalled()
    })

    it('creates a 6-digit code when no cooldown applies', async () => {
      prisma.otpCode.findFirst.mockResolvedValue(null)
      prisma.otpCode.create.mockImplementation(({ data }) => Promise.resolve({ id: 'o2', ...data }))
      const code = await service.createPhoneOtp('u1')
      expect(code).toMatch(/^\d{6}$/)
      expect(prisma.otpCode.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            purpose: 'PHONE_VERIFY',
            userId: 'u1',
            code,
          }),
        }),
      )
    })
  })

  describe('consumePhoneOtp', () => {
    it('throws OTP_INVALID when no matching OTP exists', async () => {
      prisma.otpCode.findFirst.mockResolvedValue(null)
      await expect(service.consumePhoneOtp('u1', '000000')).rejects.toMatchObject({
        code: 'OTP_INVALID',
      })
    })

    it('throws OTP_EXPIRED when the most recent OTP is past expiry', async () => {
      prisma.otpCode.findFirst.mockResolvedValue({
        id: 'o1',
        code: '123456',
        userId: 'u1',
        purpose: 'PHONE_VERIFY',
        expiresAt: new Date(Date.now() - 1000),
        consumedAt: null,
        attempts: 0,
        createdAt: new Date(Date.now() - 100_000),
      })
      await expect(service.consumePhoneOtp('u1', '123456')).rejects.toMatchObject({
        code: 'OTP_EXPIRED',
      })
    })

    it('marks OTP consumed when code matches and within expiry', async () => {
      prisma.otpCode.findFirst.mockResolvedValue({
        id: 'o1',
        code: '123456',
        userId: 'u1',
        purpose: 'PHONE_VERIFY',
        expiresAt: new Date(Date.now() + 60_000),
        consumedAt: null,
        attempts: 0,
        createdAt: new Date(),
      })
      prisma.otpCode.update.mockResolvedValue({})
      await service.consumePhoneOtp('u1', '123456')
      expect(prisma.otpCode.update).toHaveBeenCalledWith({
        where: { id: 'o1' },
        data: { consumedAt: expect.any(Date) },
      })
    })

    it('throws OTP_INVALID and increments attempts when code does not match', async () => {
      prisma.otpCode.findFirst.mockResolvedValue({
        id: 'o1',
        code: '123456',
        userId: 'u1',
        purpose: 'PHONE_VERIFY',
        expiresAt: new Date(Date.now() + 60_000),
        consumedAt: null,
        attempts: 0,
        createdAt: new Date(),
      })
      prisma.otpCode.update.mockResolvedValue({})
      await expect(service.consumePhoneOtp('u1', '999999')).rejects.toMatchObject({
        code: 'OTP_INVALID',
      })
      expect(prisma.otpCode.update).toHaveBeenCalledWith({
        where: { id: 'o1' },
        data: { attempts: { increment: 1 } },
      })
    })

    it('throws OTP_TOO_MANY_ATTEMPTS once the per-OTP limit is reached', async () => {
      prisma.otpCode.findFirst.mockResolvedValue({
        id: 'o1',
        code: '123456',
        userId: 'u1',
        purpose: 'PHONE_VERIFY',
        expiresAt: new Date(Date.now() + 60_000),
        consumedAt: null,
        attempts: 5, // already at limit (OTP_MAX_CONFIRM_ATTEMPTS=5)
        createdAt: new Date(),
      })
      await expect(service.consumePhoneOtp('u1', '123456')).rejects.toMatchObject({
        code: 'OTP_TOO_MANY_ATTEMPTS',
      })
      expect(prisma.otpCode.update).not.toHaveBeenCalled()
    })
  })

  describe('password reset OTP', () => {
    it('createPasswordResetOtp produces a hex token regardless of user existence', async () => {
      prisma.otpCode.create.mockImplementation(({ data }) => Promise.resolve({ id: 'o3', ...data }))
      const token = await service.createPasswordResetOtp('a@example.com')
      expect(token).toMatch(/^[a-f0-9]{64}$/)
      expect(prisma.otpCode.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            purpose: 'PASSWORD_RESET',
            email: 'a@example.com',
            code: token,
          }),
        }),
      )
    })

    it('consumePasswordResetOtp returns associated email and marks consumed', async () => {
      prisma.otpCode.findFirst.mockResolvedValue({
        id: 'o3',
        code: 'abc'.repeat(22),
        email: 'a@example.com',
        purpose: 'PASSWORD_RESET',
        expiresAt: new Date(Date.now() + 60_000),
        consumedAt: null,
        createdAt: new Date(),
      })
      prisma.otpCode.update.mockResolvedValue({})
      const result = await service.consumePasswordResetOtp('abc'.repeat(22))
      expect(result).toEqual({ email: 'a@example.com' })
      expect(prisma.otpCode.update).toHaveBeenCalled()
    })
  })
})
```

- [ ] **Step 13.4: Run test, expect failure**

```bash
pnpm --filter=@kgm/api test -- otp.service.spec
```

Expected: FAIL — module missing.

- [ ] **Step 13.5: Create `apps/api/src/auth/otp.service.ts`**

```ts
import { randomBytes, randomInt } from 'node:crypto'

import { HttpStatus, Inject, Injectable } from '@nestjs/common'

import { ApiException } from '../common/errors/api.exception'
import type { Env } from '../config/env'
import { ENV_TOKEN } from '../config/env.token'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class OtpService {
  constructor(
    @Inject(ENV_TOKEN) private readonly env: Env,
    private readonly prisma: PrismaService,
  ) {}

  async createPhoneOtp(userId: string): Promise<string> {
    const cooldownMs = this.env.OTP_REQUEST_COOLDOWN_SECONDS * 1000
    const recent = await this.prisma.otpCode.findFirst({
      where: {
        userId,
        purpose: 'PHONE_VERIFY',
        consumedAt: null,
        createdAt: { gte: new Date(Date.now() - cooldownMs) },
      },
      orderBy: { createdAt: 'desc' },
    })
    if (recent) {
      throw new ApiException(
        'OTP_COOLDOWN',
        'Please wait before requesting another code',
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0')
    const expiresAt = new Date(Date.now() + this.env.OTP_VERIFY_EXPIRES_MINUTES * 60_000)
    await this.prisma.otpCode.create({
      data: { code, purpose: 'PHONE_VERIFY', userId, expiresAt },
    })
    return code
  }

  async consumePhoneOtp(userId: string, code: string): Promise<void> {
    const otp = await this.prisma.otpCode.findFirst({
      where: { userId, purpose: 'PHONE_VERIFY', consumedAt: null },
      orderBy: { createdAt: 'desc' },
    })
    if (!otp) {
      throw new ApiException('OTP_INVALID', 'No pending code', HttpStatus.BAD_REQUEST)
    }
    if (otp.expiresAt.getTime() < Date.now()) {
      throw new ApiException('OTP_EXPIRED', 'Code has expired', HttpStatus.BAD_REQUEST)
    }
    if (otp.attempts >= this.env.OTP_MAX_CONFIRM_ATTEMPTS) {
      throw new ApiException(
        'OTP_TOO_MANY_ATTEMPTS',
        'Too many incorrect attempts — request a new code',
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }
    if (otp.code !== code) {
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      })
      throw new ApiException('OTP_INVALID', 'Code does not match', HttpStatus.BAD_REQUEST)
    }
    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    })
  }

  async createPasswordResetOtp(email: string): Promise<string> {
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + this.env.PASSWORD_RESET_EXPIRES_MINUTES * 60_000)
    await this.prisma.otpCode.create({
      data: { code: token, purpose: 'PASSWORD_RESET', email, expiresAt },
    })
    return token
  }

  async consumePasswordResetOtp(token: string): Promise<{ email: string }> {
    const otp = await this.prisma.otpCode.findFirst({
      where: { code: token, purpose: 'PASSWORD_RESET', consumedAt: null },
    })
    if (!otp) {
      throw new ApiException('OTP_INVALID', 'Reset token not recognized', HttpStatus.BAD_REQUEST)
    }
    if (otp.expiresAt.getTime() < Date.now()) {
      throw new ApiException('OTP_EXPIRED', 'Reset token has expired', HttpStatus.BAD_REQUEST)
    }
    if (!otp.email) {
      throw new ApiException('OTP_INVALID', 'Reset token malformed', HttpStatus.BAD_REQUEST)
    }
    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    })
    return { email: otp.email }
  }
}
```

- [ ] **Step 13.6: Run test, expect pass**

```bash
pnpm --filter=@kgm/api test -- otp.service.spec
```

Expected: PASS (8 tests).

- [ ] **Step 13.7: Commit**

```bash
git add apps/api/prisma/schema.prisma \
        apps/api/prisma/migrations \
        apps/api/src/auth/otp.service.ts \
        apps/api/src/auth/otp.service.spec.ts
git commit -m "feat(api): add OtpService for phone verification and password reset codes"
```

---

## Task 14: JWT strategy + JwtAuthGuard

**Files:**
- Create: `apps/api/src/auth/strategies/jwt.strategy.ts`
- Create: `apps/api/src/auth/guards/jwt-auth.guard.ts`

- [ ] **Step 14.1: Create `apps/api/src/auth/strategies/jwt.strategy.ts`**

```ts
import { HttpStatus, Inject, Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

import { ApiException } from '../../common/errors/api.exception'
import type { AuthUserPayload } from '../../common/types/authenticated-request'
import type { Env } from '../../config/env'
import { ENV_TOKEN } from '../../config/env.token'
import { UsersService } from '../../users/users.service'

interface JwtPayload {
  sub: string
  email: string
  role: AuthUserPayload['role']
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(ENV_TOKEN) env: Env,
    private readonly users: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: env.JWT_SECRET,
    })
  }

  async validate(payload: JwtPayload): Promise<AuthUserPayload> {
    const user = await this.users.findById(payload.sub)
    if (!user) {
      throw new ApiException('UNAUTHORIZED', 'User not found', HttpStatus.UNAUTHORIZED)
    }
    return { id: user.id, email: user.email, role: user.role }
  }
}
```

- [ ] **Step 14.2: Create `apps/api/src/auth/guards/jwt-auth.guard.ts`**

```ts
import { HttpStatus, Injectable } from '@nestjs/common'
import type { ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuthGuard } from '@nestjs/passport'

import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator'
import { ApiException } from '../../common/errors/api.exception'

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super()
  }

  override canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true
    return super.canActivate(context)
  }

  override handleRequest<TUser = unknown>(err: unknown, user: TUser): TUser {
    if (err || !user) {
      throw new ApiException(
        'UNAUTHORIZED',
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
      )
    }
    return user
  }
}
```

- [ ] **Step 14.3: Type-check**

```bash
pnpm --filter=@kgm/api type-check
```

Expected: exits 0.

- [ ] **Step 14.4: Commit**

```bash
git add apps/api/src/auth/strategies apps/api/src/auth/guards
git commit -m "feat(api): add JwtStrategy and JwtAuthGuard honoring @Public()"
```

---

## Task 15: `AuthService` — register, login, refresh, logout (with tests)

**Files:**
- Create: `apps/api/src/auth/auth.service.spec.ts`
- Create: `apps/api/src/auth/auth.service.ts`

- [ ] **Step 15.1: Write failing tests**

Create `apps/api/src/auth/auth.service.spec.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

import type { NotificationService } from '../common/services/notification.service'
import type { PasswordService } from '../common/services/password.service'
import type { Env } from '../config/env'
import type { UsersService } from '../users/users.service'

import { AuthService } from './auth.service'
import type { OtpService } from './otp.service'
import type { TokenService } from './token.service'

function makeDeps() {
  const users = {
    findByEmail: vi.fn(),
    findByPhone: vi.fn(),
    findByIdentifier: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    updatePassword: vi.fn(),
    setPhoneVerified: vi.fn(),
    toPublic: vi.fn((u: unknown) => u),
  } as unknown as UsersService
  const password = {
    hash: vi.fn(),
    compare: vi.fn(),
  } as unknown as PasswordService
  const tokens = {
    issueTokens: vi.fn(),
    rotateRefresh: vi.fn(),
    revokeRefresh: vi.fn(),
    revokeAllForUser: vi.fn(),
  } as unknown as TokenService
  const otp = {
    createPhoneOtp: vi.fn(),
    consumePhoneOtp: vi.fn(),
    createPasswordResetOtp: vi.fn(),
    consumePasswordResetOtp: vi.fn(),
  } as unknown as OtpService
  const notifier = {
    sendSmsOtp: vi.fn(),
    sendPasswordResetEmail: vi.fn(),
  } as unknown as NotificationService
  const env = { WEB_PUBLIC_URL: 'http://localhost:3000' } as Env
  return { users, password, tokens, otp, notifier, env }
}

function asMock<T>(fn: T): ReturnType<typeof vi.fn> {
  return fn as unknown as ReturnType<typeof vi.fn>
}

describe('AuthService', () => {
  let deps: ReturnType<typeof makeDeps>
  let service: AuthService

  beforeEach(() => {
    deps = makeDeps()
    service = new AuthService(
      deps.env,
      deps.users,
      deps.password,
      deps.tokens,
      deps.otp,
      deps.notifier,
    )
  })

  describe('register', () => {
    it('rejects when email exists', async () => {
      asMock(deps.users.findByEmail).mockResolvedValue({ id: 'existing' })
      await expect(
        service.register({
          email: 'a@example.com',
          phone: '+996700000000',
          password: 'pa$$word1',
          firstName: 'A',
          lastName: 'B',
        }),
      ).rejects.toMatchObject({ code: 'EMAIL_ALREADY_EXISTS' })
    })

    it('rejects when phone exists', async () => {
      asMock(deps.users.findByEmail).mockResolvedValue(null)
      asMock(deps.users.findByPhone).mockResolvedValue({ id: 'existing' })
      await expect(
        service.register({
          email: 'a@example.com',
          phone: '+996700000000',
          password: 'pa$$word1',
          firstName: 'A',
          lastName: 'B',
        }),
      ).rejects.toMatchObject({ code: 'PHONE_ALREADY_EXISTS' })
    })

    it('creates user and issues tokens on happy path', async () => {
      asMock(deps.users.findByEmail).mockResolvedValue(null)
      asMock(deps.users.findByPhone).mockResolvedValue(null)
      asMock(deps.password.hash).mockResolvedValue('$2b$12$x')
      const created = { id: 'u1', email: 'a@example.com', role: 'BUYER' as const }
      asMock(deps.users.create).mockResolvedValue(created)
      asMock(deps.tokens.issueTokens).mockResolvedValue({
        accessToken: 'a',
        refreshToken: 'r',
        accessTokenExpiresAt: '2030-01-01T00:00:00.000Z',
        refreshTokenExpiresAt: '2030-01-01T00:00:00.000Z',
      })
      const result = await service.register({
        email: 'a@example.com',
        phone: '+996700000000',
        password: 'pa$$word1',
        firstName: 'A',
        lastName: 'B',
      })
      expect(deps.password.hash).toHaveBeenCalledWith('pa$$word1')
      expect(deps.users.create).toHaveBeenCalledWith({
        email: 'a@example.com',
        phone: '+996700000000',
        passwordHash: '$2b$12$x',
        firstName: 'A',
        lastName: 'B',
      })
      expect(deps.tokens.issueTokens).toHaveBeenCalledWith({
        id: 'u1',
        email: 'a@example.com',
        role: 'BUYER',
      })
      expect(result.tokens.accessToken).toBe('a')
      expect(result.user).toBe(created)
    })
  })

  describe('login', () => {
    it('returns INVALID_CREDENTIALS when user missing', async () => {
      asMock(deps.users.findByIdentifier).mockResolvedValue(null)
      await expect(service.login({ identifier: 'a@example.com', password: 'x' })).rejects.toMatchObject({
        code: 'INVALID_CREDENTIALS',
      })
    })

    it('returns INVALID_CREDENTIALS when password wrong', async () => {
      asMock(deps.users.findByIdentifier).mockResolvedValue({
        id: 'u1',
        email: 'a@example.com',
        role: 'BUYER',
        passwordHash: 'h',
        deletedAt: null,
      })
      asMock(deps.password.compare).mockResolvedValue(false)
      await expect(service.login({ identifier: 'a@example.com', password: 'x' })).rejects.toMatchObject({
        code: 'INVALID_CREDENTIALS',
      })
    })

    it('returns INVALID_CREDENTIALS when user is soft-deleted', async () => {
      asMock(deps.users.findByIdentifier).mockResolvedValue({
        id: 'u1',
        email: 'a@example.com',
        role: 'BUYER',
        passwordHash: 'h',
        deletedAt: new Date('2026-04-01'),
      })
      await expect(service.login({ identifier: 'a@example.com', password: 'x' })).rejects.toMatchObject({
        code: 'INVALID_CREDENTIALS',
      })
      expect(deps.password.compare).not.toHaveBeenCalled()
    })

    it('issues tokens on correct credentials', async () => {
      asMock(deps.users.findByIdentifier).mockResolvedValue({
        id: 'u1',
        email: 'a@example.com',
        role: 'BUYER',
        passwordHash: 'h',
        deletedAt: null,
      })
      asMock(deps.password.compare).mockResolvedValue(true)
      asMock(deps.tokens.issueTokens).mockResolvedValue({
        accessToken: 'a',
        refreshToken: 'r',
        accessTokenExpiresAt: '2030-01-01T00:00:00.000Z',
        refreshTokenExpiresAt: '2030-01-01T00:00:00.000Z',
      })
      const result = await service.login({ identifier: 'a@example.com', password: 'x' })
      expect(result.tokens.accessToken).toBe('a')
    })
  })

  describe('refresh', () => {
    it('delegates to tokenService.rotateRefresh', async () => {
      asMock(deps.tokens.rotateRefresh).mockResolvedValue({
        accessToken: 'a',
        refreshToken: 'r',
        accessTokenExpiresAt: '2030-01-01T00:00:00.000Z',
        refreshTokenExpiresAt: '2030-01-01T00:00:00.000Z',
      })
      const result = await service.refresh('old')
      expect(deps.tokens.rotateRefresh).toHaveBeenCalledWith('old')
      expect(result.accessToken).toBe('a')
    })
  })

  describe('logout', () => {
    it('revokes the provided refresh token', async () => {
      await service.logout('some-token')
      expect(deps.tokens.revokeRefresh).toHaveBeenCalledWith('some-token')
    })
  })
})
```

- [ ] **Step 15.2: Run test, expect failure**

```bash
pnpm --filter=@kgm/api test -- auth.service.spec
```

Expected: FAIL — module missing.

- [ ] **Step 15.3: Create `apps/api/src/auth/auth.service.ts`**

```ts
import type { AuthResponse, PublicUser, RegisterInput, LoginInput } from '@kgm/types'
import { HttpStatus, Inject, Injectable } from '@nestjs/common'

import { ApiException } from '../common/errors/api.exception'
import { NotificationService } from '../common/services/notification.service'
import { PasswordService } from '../common/services/password.service'
import type { Env } from '../config/env'
import { ENV_TOKEN } from '../config/env.token'
import { UsersService } from '../users/users.service'

import type { IssuedTokens } from './token.service'
import { OtpService } from './otp.service'
import { TokenService } from './token.service'

@Injectable()
export class AuthService {
  constructor(
    @Inject(ENV_TOKEN) private readonly env: Env,
    private readonly users: UsersService,
    private readonly password: PasswordService,
    private readonly tokens: TokenService,
    private readonly otp: OtpService,
    private readonly notifier: NotificationService,
  ) {}

  async register(input: RegisterInput): Promise<AuthResponse> {
    if (await this.users.findByEmail(input.email)) {
      throw new ApiException(
        'EMAIL_ALREADY_EXISTS',
        'Email already registered',
        HttpStatus.CONFLICT,
      )
    }
    if (await this.users.findByPhone(input.phone)) {
      throw new ApiException(
        'PHONE_ALREADY_EXISTS',
        'Phone already registered',
        HttpStatus.CONFLICT,
      )
    }
    const passwordHash = await this.password.hash(input.password)
    const user = await this.users.create({
      email: input.email,
      phone: input.phone,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
    })
    const tokens = await this.tokens.issueTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    })
    return { user: this.users.toPublic(user) as PublicUser, tokens }
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await this.users.findByIdentifier(input.identifier)
    if (!user || user.deletedAt !== null) {
      throw new ApiException(
        'INVALID_CREDENTIALS',
        'Invalid credentials',
        HttpStatus.UNAUTHORIZED,
      )
    }
    const ok = await this.password.compare(input.password, user.passwordHash)
    if (!ok) {
      throw new ApiException(
        'INVALID_CREDENTIALS',
        'Invalid credentials',
        HttpStatus.UNAUTHORIZED,
      )
    }
    const tokens = await this.tokens.issueTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    })
    return { user: this.users.toPublic(user) as PublicUser, tokens }
  }

  refresh(refreshToken: string): Promise<IssuedTokens> {
    return this.tokens.rotateRefresh(refreshToken)
  }

  logout(refreshToken: string): Promise<void> {
    return this.tokens.revokeRefresh(refreshToken)
  }

  async requestPhoneVerify(userId: string, phone: string): Promise<void> {
    const code = await this.otp.createPhoneOtp(userId)
    await this.notifier.sendSmsOtp(phone, code)
  }

  async confirmPhoneVerify(userId: string, code: string): Promise<void> {
    await this.otp.consumePhoneOtp(userId, code)
    await this.users.setPhoneVerified(userId)
  }

  async requestPasswordReset(email: string): Promise<void> {
    const normalized = email.toLowerCase().trim()
    const user = await this.users.findByEmail(normalized)
    if (!user) return // deliberate no-op — don't disclose email existence
    const token = await this.otp.createPasswordResetOtp(normalized)
    const resetUrl = `${this.env.WEB_PUBLIC_URL}/reset-password?token=${token}`
    await this.notifier.sendPasswordResetEmail(normalized, resetUrl)
  }

  async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    const { email } = await this.otp.consumePasswordResetOtp(token)
    const user = await this.users.findByEmail(email)
    if (!user) {
      throw new ApiException('OTP_INVALID', 'Reset target no longer exists', HttpStatus.BAD_REQUEST)
    }
    const passwordHash = await this.password.hash(newPassword)
    await this.users.updatePassword(user.id, passwordHash)
    await this.tokens.revokeAllForUser(user.id)
  }
}
```

- [ ] **Step 15.4: Run register/login/refresh/logout tests, expect pass**

```bash
pnpm --filter=@kgm/api test -- auth.service.spec
```

Expected: PASS (8 tests — the ones written so far; phone/reset tests come in the next task).

- [ ] **Step 15.5: Commit**

```bash
git add apps/api/src/auth/auth.service.ts apps/api/src/auth/auth.service.spec.ts
git commit -m "feat(api): add AuthService register/login/refresh/logout"
```

---

## Task 16: Extend AuthService tests — phone verification + password reset

**Files:**
- Modify: `apps/api/src/auth/auth.service.spec.ts`

- [ ] **Step 16.1: Append phone-verify tests**

Append to the `describe('AuthService', ...)` block in `auth.service.spec.ts`:

```ts
  describe('requestPhoneVerify', () => {
    it('creates code and sends SMS', async () => {
      asMock(deps.otp.createPhoneOtp).mockResolvedValue('123456')
      await service.requestPhoneVerify('u1', '+996700111222')
      expect(deps.otp.createPhoneOtp).toHaveBeenCalledWith('u1')
      expect(deps.notifier.sendSmsOtp).toHaveBeenCalledWith('+996700111222', '123456')
    })
  })

  describe('confirmPhoneVerify', () => {
    it('consumes OTP and marks user verified', async () => {
      await service.confirmPhoneVerify('u1', '123456')
      expect(deps.otp.consumePhoneOtp).toHaveBeenCalledWith('u1', '123456')
      expect(deps.users.setPhoneVerified).toHaveBeenCalledWith('u1')
    })
  })

  describe('requestPasswordReset', () => {
    it('is a silent no-op when email not found', async () => {
      asMock(deps.users.findByEmail).mockResolvedValue(null)
      await service.requestPasswordReset('a@example.com')
      expect(deps.otp.createPasswordResetOtp).not.toHaveBeenCalled()
      expect(deps.notifier.sendPasswordResetEmail).not.toHaveBeenCalled()
    })

    it('creates token and sends email when user exists', async () => {
      asMock(deps.users.findByEmail).mockResolvedValue({ id: 'u1', email: 'a@example.com' })
      asMock(deps.otp.createPasswordResetOtp).mockResolvedValue('tok123')
      await service.requestPasswordReset('A@Example.com')
      expect(deps.otp.createPasswordResetOtp).toHaveBeenCalledWith('a@example.com')
      expect(deps.notifier.sendPasswordResetEmail).toHaveBeenCalledWith(
        'a@example.com',
        'http://localhost:3000/reset-password?token=tok123',
      )
    })
  })

  describe('confirmPasswordReset', () => {
    it('updates password hash and revokes refresh tokens', async () => {
      asMock(deps.otp.consumePasswordResetOtp).mockResolvedValue({ email: 'a@example.com' })
      asMock(deps.users.findByEmail).mockResolvedValue({ id: 'u1', email: 'a@example.com' })
      asMock(deps.password.hash).mockResolvedValue('$2b$12$new')
      await service.confirmPasswordReset('tok123', 'newpass1234')
      expect(deps.password.hash).toHaveBeenCalledWith('newpass1234')
      expect(deps.users.updatePassword).toHaveBeenCalledWith('u1', '$2b$12$new')
      expect(deps.tokens.revokeAllForUser).toHaveBeenCalledWith('u1')
    })

    it('throws OTP_INVALID when target user no longer exists', async () => {
      asMock(deps.otp.consumePasswordResetOtp).mockResolvedValue({ email: 'a@example.com' })
      asMock(deps.users.findByEmail).mockResolvedValue(null)
      await expect(service.confirmPasswordReset('tok', 'newpass1234')).rejects.toMatchObject({
        code: 'OTP_INVALID',
      })
    })
  })
```

- [ ] **Step 16.2: Run full auth.service.spec — expect pass**

```bash
pnpm --filter=@kgm/api test -- auth.service.spec
```

Expected: PASS (14 tests total).

- [ ] **Step 16.3: Commit**

```bash
git add apps/api/src/auth/auth.service.spec.ts
git commit -m "test(api): cover AuthService phone-verify and password-reset flows"
```

---

## Task 17: `AuthController` — 8 endpoints (with tests)

**Files:**
- Create: `apps/api/src/auth/auth.controller.spec.ts`
- Create: `apps/api/src/auth/auth.controller.ts`

- [ ] **Step 17.1: Write failing tests**

Create `apps/api/src/auth/auth.controller.spec.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

import type { UsersService } from '../users/users.service'
import type { AuthUserPayload } from '../common/types/authenticated-request'

import { AuthController } from './auth.controller'
import type { AuthService } from './auth.service'

function makeSvc(): AuthService {
  return {
    register: vi.fn(),
    login: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
    requestPhoneVerify: vi.fn(),
    confirmPhoneVerify: vi.fn(),
    requestPasswordReset: vi.fn(),
    confirmPasswordReset: vi.fn(),
  } as unknown as AuthService
}

function makeUsers(): UsersService {
  return {
    findById: vi.fn().mockResolvedValue({ id: 'u1', phone: '+996700111222' }),
  } as unknown as UsersService
}

function asMock<T>(fn: T): ReturnType<typeof vi.fn> {
  return fn as unknown as ReturnType<typeof vi.fn>
}

const authUser: AuthUserPayload = { id: 'u1', email: 'a@example.com', role: 'BUYER' }

describe('AuthController', () => {
  let svc: AuthService
  let users: UsersService
  let controller: AuthController

  beforeEach(() => {
    svc = makeSvc()
    users = makeUsers()
    controller = new AuthController(svc, users)
  })

  it('register delegates to service', async () => {
    const response = { user: { id: 'u1' }, tokens: {} }
    asMock(svc.register).mockResolvedValue(response)
    const result = await controller.register({
      email: 'a@example.com',
      phone: '+996700111222',
      password: 'pa$$word1',
      firstName: 'A',
      lastName: 'B',
    })
    expect(svc.register).toHaveBeenCalled()
    expect(result).toBe(response)
  })

  it('login delegates to service', async () => {
    const response = { user: {}, tokens: {} }
    asMock(svc.login).mockResolvedValue(response)
    const result = await controller.login({ identifier: 'a@example.com', password: 'x' })
    expect(result).toBe(response)
  })

  it('refresh delegates to service and returns tokens', async () => {
    const tokens = { accessToken: 'a', refreshToken: 'r' }
    asMock(svc.refresh).mockResolvedValue(tokens)
    const result = await controller.refresh({ refreshToken: 'old' })
    expect(svc.refresh).toHaveBeenCalledWith('old')
    expect(result).toEqual({ tokens })
  })

  it('logout returns null', async () => {
    const result = await controller.logout({ refreshToken: 'r' })
    expect(svc.logout).toHaveBeenCalledWith('r')
    expect(result).toBeNull()
  })

  it('verify-phone request looks up phone and calls service', async () => {
    const result = await controller.requestPhoneVerify(authUser)
    expect(users.findById).toHaveBeenCalledWith('u1')
    expect(svc.requestPhoneVerify).toHaveBeenCalledWith('u1', '+996700111222')
    expect(result).toBeNull()
  })

  it('verify-phone confirm calls service with code', async () => {
    const result = await controller.confirmPhoneVerify(authUser, { code: '123456' })
    expect(svc.confirmPhoneVerify).toHaveBeenCalledWith('u1', '123456')
    expect(result).toBeNull()
  })

  it('password-reset request always returns null (no disclosure)', async () => {
    const result = await controller.requestPasswordReset({ email: 'a@example.com' })
    expect(svc.requestPasswordReset).toHaveBeenCalledWith('a@example.com')
    expect(result).toBeNull()
  })

  it('password-reset confirm returns null on success', async () => {
    const result = await controller.confirmPasswordReset({
      token: 'tok',
      newPassword: 'newpass1234',
    })
    expect(svc.confirmPasswordReset).toHaveBeenCalledWith('tok', 'newpass1234')
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 17.2: Run test, expect failure**

```bash
pnpm --filter=@kgm/api test -- auth.controller.spec
```

Expected: FAIL — module missing.

- [ ] **Step 17.3: Create `apps/api/src/auth/auth.controller.ts`**

```ts
import {
  ConfirmPasswordResetSchema,
  ConfirmPhoneVerifySchema,
  LoginSchema,
  LogoutSchema,
  RefreshTokenSchema,
  RegisterSchema,
  RequestPasswordResetSchema,
} from '@kgm/types'
import type {
  AuthResponse,
  ConfirmPasswordResetInput,
  ConfirmPhoneVerifyInput,
  LoginInput,
  LogoutInput,
  RefreshTokenInput,
  RegisterInput,
  RequestPasswordResetInput,
  Tokens,
} from '@kgm/types'
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { ZodValidationPipe } from 'nestjs-zod'

import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Public } from '../common/decorators/public.decorator'
import { ApiException } from '../common/errors/api.exception'
import type { AuthUserPayload } from '../common/types/authenticated-request'
import { UsersService } from '../users/users.service'

import { AuthService } from './auth.service'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}

  @Public()
  @Post('register')
  register(
    @Body(new ZodValidationPipe(RegisterSchema)) input: RegisterInput,
  ): Promise<AuthResponse> {
    return this.auth.register(input)
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body(new ZodValidationPipe(LoginSchema)) input: LoginInput): Promise<AuthResponse> {
    return this.auth.login(input)
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body(new ZodValidationPipe(RefreshTokenSchema)) input: RefreshTokenInput,
  ): Promise<{ tokens: Tokens }> {
    const tokens = await this.auth.refresh(input.refreshToken)
    return { tokens }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body(new ZodValidationPipe(LogoutSchema)) input: LogoutInput,
  ): Promise<null> {
    await this.auth.logout(input.refreshToken)
    return null
  }

  @Post('verify-phone/request')
  @HttpCode(HttpStatus.OK)
  async requestPhoneVerify(@CurrentUser() auth: AuthUserPayload): Promise<null> {
    const user = await this.users.findById(auth.id)
    if (!user?.phone) {
      throw new ApiException(
        'NOT_FOUND',
        'No phone number on file',
        HttpStatus.BAD_REQUEST,
      )
    }
    await this.auth.requestPhoneVerify(auth.id, user.phone)
    return null
  }

  @Post('verify-phone/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmPhoneVerify(
    @CurrentUser() auth: AuthUserPayload,
    @Body(new ZodValidationPipe(ConfirmPhoneVerifySchema)) input: ConfirmPhoneVerifyInput,
  ): Promise<null> {
    await this.auth.confirmPhoneVerify(auth.id, input.code)
    return null
  }

  @Public()
  @Post('password-reset/request')
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(
    @Body(new ZodValidationPipe(RequestPasswordResetSchema)) input: RequestPasswordResetInput,
  ): Promise<null> {
    await this.auth.requestPasswordReset(input.email)
    return null
  }

  @Public()
  @Post('password-reset/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmPasswordReset(
    @Body(new ZodValidationPipe(ConfirmPasswordResetSchema)) input: ConfirmPasswordResetInput,
  ): Promise<null> {
    await this.auth.confirmPasswordReset(input.token, input.newPassword)
    return null
  }
}
```

- [ ] **Step 17.4: Run test, expect pass**

```bash
pnpm --filter=@kgm/api test -- auth.controller.spec
```

Expected: PASS (8 tests).

- [ ] **Step 17.5: Commit**

```bash
git add apps/api/src/auth/auth.controller.ts apps/api/src/auth/auth.controller.spec.ts
git commit -m "feat(api): add AuthController with all 8 endpoints"
```

---

## Task 18: Wire `AuthModule` + global guard

**Files:**
- Create: `apps/api/src/auth/auth.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/main.ts`

- [ ] **Step 18.1: Create `apps/api/src/auth/auth.module.ts`**

```ts
import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'

import { PrismaModule } from '../prisma/prisma.module'
import { UsersModule } from '../users/users.module'

import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { OtpService } from './otp.service'
import { JwtStrategy } from './strategies/jwt.strategy'
import { TokenService } from './token.service'

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenService, OtpService, JwtStrategy, JwtAuthGuard],
  exports: [AuthService, TokenService, JwtAuthGuard],
})
export class AuthModule {}
```

- [ ] **Step 18.2: Replace `apps/api/src/app.module.ts`**

```ts
import { Module } from '@nestjs/common'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'

import { AuthModule } from './auth/auth.module'
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard'
import { CommonModule } from './common/common.module'
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter'
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor'
import { HealthModule } from './health/health.module'
import { PrismaModule } from './prisma/prisma.module'
import { UsersModule } from './users/users.module'

@Module({
  imports: [CommonModule, PrismaModule, HealthModule, UsersModule, AuthModule],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseEnvelopeInterceptor },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
```

- [ ] **Step 18.3: Update `apps/api/src/main.ts`**

Replace the entire file:

```ts
import 'reflect-metadata'

import { NestFactory } from '@nestjs/core'
import { ZodValidationPipe } from 'nestjs-zod'

import { AppModule } from './app.module'
import { loadEnv } from './config/env'

async function bootstrap() {
  const env = loadEnv()
  const app = await NestFactory.create(AppModule)
  app.setGlobalPrefix('api/v1')
  app.useGlobalPipes(new ZodValidationPipe())
  app.enableCors({ origin: true, credentials: true })
  await app.listen(env.API_PORT)
  // eslint-disable-next-line no-console
  console.warn(`[api] listening on http://localhost:${env.API_PORT}/api/v1`)
}

bootstrap()
```

- [ ] **Step 18.4: Mark `/health` as public**

Modify `apps/api/src/health/health.controller.ts` to mark the endpoint public (otherwise the new global guard blocks it):

Replace its contents with:

```ts
import type { HealthResponse } from '@kgm/types'
import { Controller, Get } from '@nestjs/common'

import { Public } from '../common/decorators/public.decorator'

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check(): HealthResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    }
  }
}
```

Also update its spec if it previously inspected the raw return value only — it's still a plain object, so the existing assertions hold. No test change needed.

- [ ] **Step 18.5: Update the health controller test to account for the envelope interceptor**

The controller-level test calls `controller.check()` directly (not through the interceptor chain), so the response is still `{ status, timestamp, uptime }`. **No change required.** But a new end-to-end expectation: through HTTP, responses are now `{ data: { status, ... } }`. This is validated in Task 20.

- [ ] **Step 18.6: Type-check and run full test suite**

```bash
pnpm --filter=@kgm/api type-check
pnpm --filter=@kgm/api test
```

Expected: type-check exits 0; all tests pass (health + common filter/interceptor + password + notification + users service/controller + token + otp + auth service/controller).

- [ ] **Step 18.7: Commit**

```bash
git add apps/api/src/auth/auth.module.ts apps/api/src/app.module.ts apps/api/src/main.ts apps/api/src/health/health.controller.ts
git commit -m "feat(api): wire AuthModule with global JWT guard, filter, and response interceptor"
```

---

## Task 19: Update lint + root type-check; check full `@kgm/api` build

**Files:** none (verification only)

- [ ] **Step 19.1: Run lint**

```bash
pnpm --filter=@kgm/api lint
```

Expected: exits 0. If `import/order` fails, reorder imports per the convention block at the top of this plan and re-run.

- [ ] **Step 19.2: Run type-check across workspaces**

```bash
pnpm type-check
```

Expected: exits 0 everywhere.

- [ ] **Step 19.3: Build API**

```bash
pnpm --filter=@kgm/api build
```

Expected: `apps/api/dist/` rebuilt without error.

- [ ] **Step 19.4: Run full test suite across workspaces**

```bash
pnpm test
```

Expected: all suites pass. `@kgm/utils` 10 tests + `@kgm/types` no tests + `@kgm/api` all new + existing health.

- [ ] **Step 19.5: Commit any formatting fixes (if any)**

```bash
git status
git add -A   # only if lint fixes were made
git commit -m "chore(api): lint fixes from phase 1b wiring"   # only if needed
```

---

## Task 20: End-to-end smoke test (manual, recorded in plan)

**Files:** none (runtime check)

- [ ] **Step 20.1: Reset database and start the stack**

```bash
cd /Users/ruwuioli/Documents/kgm
docker compose up -d
pnpm db:reset
pnpm --filter=@kgm/api dev
```

In a second terminal, keep the API running and execute the following curl commands.

- [ ] **Step 20.2: Register a new user**

```bash
curl -s -X POST http://localhost:3001/api/v1/auth/register \
  -H 'content-type: application/json' \
  -d '{"email":"smoke@example.com","phone":"+996700999888","password":"testpass1234","firstName":"Smoke","lastName":"Test"}' | jq .
```

Expected JSON:
```json
{
  "data": {
    "user": { "id": "...", "email": "smoke@example.com", "role": "BUYER", "status": "PENDING_VERIFICATION", "...": "..." },
    "tokens": { "accessToken": "eyJ...", "refreshToken": "eyJ...", "...": "..." }
  }
}
```

Save `accessToken` and `refreshToken` to shell variables:
```bash
ACCESS=$(curl -s -X POST http://localhost:3001/api/v1/auth/login -H 'content-type: application/json' \
  -d '{"identifier":"smoke@example.com","password":"testpass1234"}' | jq -r '.data.tokens.accessToken')
REFRESH=$(curl -s -X POST http://localhost:3001/api/v1/auth/login -H 'content-type: application/json' \
  -d '{"identifier":"smoke@example.com","password":"testpass1234"}' | jq -r '.data.tokens.refreshToken')
```

- [ ] **Step 20.3: Fetch `/users/me` with access token**

```bash
curl -s http://localhost:3001/api/v1/users/me -H "authorization: Bearer $ACCESS" | jq .
```

Expected: `{ "data": { "id": "...", "email": "smoke@example.com", "isPhoneVerified": false, ... } }`.

- [ ] **Step 20.4: Update profile**

```bash
curl -s -X PATCH http://localhost:3001/api/v1/users/me \
  -H "authorization: Bearer $ACCESS" -H 'content-type: application/json' \
  -d '{"firstName":"Smoky","bio":"Just testing."}' | jq .
```

Expected: `data.firstName === "Smoky"`, `data.bio === "Just testing."`.

- [ ] **Step 20.5: Request phone verification and inspect API console**

```bash
curl -s -X POST http://localhost:3001/api/v1/auth/verify-phone/request \
  -H "authorization: Bearer $ACCESS" | jq .
```

Expected response: `{ "data": null }`. API console shows `[SMS STUB] +996700999888: Your verification code is 123456` (random 6 digits).

- [ ] **Step 20.6: Confirm phone verification**

Take the printed code and:
```bash
curl -s -X POST http://localhost:3001/api/v1/auth/verify-phone/confirm \
  -H "authorization: Bearer $ACCESS" -H 'content-type: application/json' \
  -d '{"code":"<6-digit>"}' | jq .
```

Expected: `{ "data": null }`. A follow-up `/users/me` now shows `isPhoneVerified: true`.

- [ ] **Step 20.7: Rotate the refresh token**

```bash
curl -s -X POST http://localhost:3001/api/v1/auth/refresh \
  -H 'content-type: application/json' \
  -d "{\"refreshToken\":\"$REFRESH\"}" | jq .
```

Expected: `data.tokens.accessToken` and `data.tokens.refreshToken` are both different strings from before. A second call with the same (now-revoked) `$REFRESH` returns `401 { error: { code: "TOKEN_INVALID", ... } }`.

- [ ] **Step 20.8: Password reset flow**

```bash
curl -s -X POST http://localhost:3001/api/v1/auth/password-reset/request \
  -H 'content-type: application/json' \
  -d '{"email":"smoke@example.com"}' | jq .
```

Expected: `{ "data": null }`. API console prints `[EMAIL STUB] To smoke@example.com: reset link http://localhost:3000/reset-password?token=<64-hex>`.

Copy the `<64-hex>` token and:
```bash
curl -s -X POST http://localhost:3001/api/v1/auth/password-reset/confirm \
  -H 'content-type: application/json' \
  -d '{"token":"<64-hex>","newPassword":"newpass9999"}' | jq .
```

Expected: `{ "data": null }`. Logging in with the old password now returns `401 INVALID_CREDENTIALS`; logging in with `newpass9999` succeeds.

- [ ] **Step 20.9: Verify unknown email returns 200 without disclosure**

```bash
curl -s -X POST http://localhost:3001/api/v1/auth/password-reset/request \
  -H 'content-type: application/json' \
  -d '{"email":"does-not-exist@example.com"}' | jq .
```

Expected: `{ "data": null }` (no email sent — API console is silent).

- [ ] **Step 20.10: Stop the stack**

```bash
# In the API terminal, Ctrl+C
docker compose down
```

- [ ] **Step 20.11: Commit the plan completion note (optional)**

No code changes. If no changes need a commit, skip.

---

## Self-Review Checklist

After completing all 20 tasks, verify:

- [ ] All 8 auth endpoints from spec §5 are present and behaviourally correct.
- [ ] `/users/me` GET and PATCH work with real JWT access tokens.
- [ ] Avatar upload (`POST /users/me/avatar`) is explicitly **deferred** — this plan does not add it (documented at the top).
- [ ] Global response envelope: every successful response has shape `{ data: ... }`. Confirmed via smoke test.
- [ ] Global error envelope: every failure has shape `{ error: { code, message, details? } }`. Confirmed via `TOKEN_INVALID` case.
- [ ] OTP rate-limit (one per 60s) is enforced — second `verify-phone/request` within the cooldown returns `429 OTP_COOLDOWN`.
- [ ] Refresh rotation deletes the old row and inserts a new one — reusing an old refresh token returns `401 TOKEN_INVALID`.
- [ ] Password reset revokes **all** refresh tokens for the user — a previously-issued access token continues to work until its 15m expiry (acceptable per spec; revocation is refresh-side only).
- [ ] `[SMS STUB]` and `[EMAIL STUB]` lines appear in the API console at the expected moments.
- [ ] `pnpm lint`, `pnpm type-check`, `pnpm test`, `pnpm build` all exit 0.

If any check fails, fix and re-run the relevant task's tests before marking the plan complete.
