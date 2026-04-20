# Phase 1d — Web Frontend Design

**Status:** Approved (pending user review)
**Date:** 2026-04-20
**Prior phases:** 1a (spine), 1b (auth & users), 1c (categories + listings + storage) — all merged.
**Next:** `docs/superpowers/plans/2026-04-20-phase-1d-web-frontend.md`

---

## Goal

Ship a browser-usable portal for the listings API built in Phase 1c. A user can:

- Browse listings with category filter and cursor pagination.
- View a listing's detail page with an image gallery.
- Create a listing, upload images, and publish it.
- Manage their own listings from a dashboard (counts, edit, delete, status transitions).

Real auth UI (register / login / forgot-password) is deferred to a later plan. A one-click "Dev login" against a seeded account unlocks authed pages in this phase.

## Scope

### In scope

- Pages: `/`, `/listings`, `/listings/[id]`, `/sell/new`, `/sell/[id]/images`, `/dashboard`, `/dashboard/listings/[id]/edit`.
- Dev-login button backed by a seeded test user; cookie-based session (no refresh).
- i18n scaffold via `next-intl` with `ru` populated, `ky` stubbed.
- UI kit: shadcn/ui init + core components; `react-hook-form` + `zod` resolver; `lucide-react`.
- Category filter on `/listings` (single-category, from `categoryId` query param).
- Image upload (drag/drop + file picker) with 10-image cap and MIME/size validation.
- Status transitions via dropdown, enforcing `ALLOWED_TRANSITIONS` from the API.
- Error boundaries, 404, loading skeletons, empty states.
- Smoke-style tests per Q6 and a final manual walkthrough.

### Out of scope (deferred)

- Register / login / forgot-password UI (mock dev-login only).
- Price range and condition filters (API doesn't support them yet; add in Phase 2 with search).
- Token refresh (15-min sessions; user re-clicks dev-login).
- Messaging, favorites, reviews, payments.
- Kyrgyz translation (catalog keys present, Russian values).
- Admin app.
- Playwright E2E.
- Seller profile / contact page.

## Architecture

### Rendering model

Server-first. All pages default to Server Components. Client islands only for interactivity:

- Dev-login button and logout button.
- `<ListingFilters>` category dropdown (pushes URL → SSR re-renders).
- `<LoadMoreButton>` (holds client-side cursor, appends fetched pages).
- `<ListingForm>` (RHF-controlled form).
- `<ImageUploader>` (drag/drop, per-file progress).
- `<StatusDropdown>` (enforces allowed transitions).
- Locale switcher in the site header.
- Image gallery thumbnail swap-on-click.

### Two write paths for the client

1. **`/api/web/session` (Next route handler)** — `POST` for dev-login (calls API `/auth/login`, sets httpOnly cookies). `DELETE` for logout (calls API `/auth/logout`, clears cookies).
2. **`/api/proxy/[...path]` (existing, extended)** — pass-through for all other browser-originated writes (create listing, patch, delete, image multipart upload). The route handler reads the `kgm_access` cookie and sets `Authorization: Bearer <jwt>` on the forwarded request.

### Server-side fetches

Pages use `apiFetch(path, opts)` from `lib/api.ts`, which reads the cookie via `next/headers.cookies()` and attaches `Authorization` directly — no local HTTP hop.

### Response envelope reminder

From Phase 1c: list endpoints return `{ data: { data: [...], nextCursor } }`. Any consumer of `GET /listings` or `GET /listings/mine` must read `.data.data` for the array. `apiFetch` does not unwrap this shape — that's the caller's job. Documented in `apiFetch` JSDoc.

## File Structure

```
apps/web/
├── messages/
│   ├── ru.json                                  # populated
│   └── ky.json                                  # stubbed (same values as ru)
├── middleware.ts                                # next-intl locale routing
├── src/
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── layout.tsx                       # NextIntlClientProvider + <html lang={locale}>
│   │   │   ├── page.tsx                         # home: hero + featured grid
│   │   │   ├── error.tsx                        # generic error boundary
│   │   │   ├── not-found.tsx
│   │   │   ├── loading.tsx
│   │   │   ├── listings/
│   │   │   │   ├── page.tsx                     # browse
│   │   │   │   ├── loading.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx                 # detail
│   │   │   │       └── loading.tsx
│   │   │   ├── sell/
│   │   │   │   ├── new/page.tsx                 # create form
│   │   │   │   └── [id]/images/page.tsx         # upload + publish
│   │   │   └── dashboard/
│   │   │       ├── page.tsx                     # counts + my-listings table
│   │   │       ├── error.tsx                    # offers dev-login on 401
│   │   │       ├── loading.tsx
│   │   │       └── listings/[id]/edit/page.tsx
│   │   └── api/
│   │       ├── proxy/[...path]/route.ts         # existing; extended to forward auth cookie
│   │       └── web/session/route.ts             # POST dev-login, DELETE logout
│   ├── components/
│   │   ├── ui/                                  # shadcn: button, input, textarea, select,
│   │   │                                        #   dialog, card, toast, badge, label, form
│   │   ├── auth/
│   │   │   ├── dev-login-button.tsx
│   │   │   └── logout-button.tsx
│   │   ├── listings/
│   │   │   ├── listing-card.tsx
│   │   │   ├── listings-grid.tsx                # + load-more client island
│   │   │   ├── listing-filters.tsx
│   │   │   ├── listing-form.tsx
│   │   │   ├── image-uploader.tsx
│   │   │   └── status-dropdown.tsx
│   │   ├── layout/
│   │   │   ├── site-header.tsx                  # nav, locale switcher, auth state
│   │   │   └── site-footer.tsx
│   │   └── common/
│   │       ├── price.tsx
│   │       └── empty-state.tsx
│   ├── lib/
│   │   ├── api.ts                               # apiFetch (server) + apiFetchClient (client)
│   │   ├── session.ts                           # cookie helpers
│   │   ├── auth-guard.ts                        # requireAuth()
│   │   ├── i18n.ts                              # next-intl config
│   │   └── listing-transitions.ts               # shared ALLOWED_TRANSITIONS mirror
│   └── test/
│       ├── setup.ts                             # vitest + Testing Library setup
│       └── mocks/                               # fixture listings, categories
└── package.json                                  # + new deps

apps/api/prisma/seed.ts                           # add dev user + 3 sample listings
```

Root `app/layout.tsx` and `app/page.tsx` are removed — everything lives under `[locale]/`.

## Auth Flow (mock)

1. **Seed.** `apps/api/prisma/seed.ts` upserts a dev user on every run:
   - email: `dev@kgm.local`
   - phone: `+996700000000`
   - password: `devpass123` (bcrypt-hashed; upsert uses `passwordHash`)
   - `phoneVerifiedAt` set, `isActive: true`
   - Also upserts 3 ACTIVE sample listings owned by this user.
2. **Dev login.** `POST /api/web/session` (no body):
   - Reads credentials from env: `DEV_USER_EMAIL` (default `dev@kgm.local`), `DEV_USER_PASSWORD` (default `devpass123`).
   - Calls API `POST /auth/login` → on 200, sets two httpOnly cookies:
     - `kgm_access` — 15 min, `SameSite=Lax`, `Secure` in prod.
     - `kgm_refresh` — 30 days, `SameSite=Lax`, `Secure` in prod, `HttpOnly` true.
   - Returns 204. On API error, returns the API error envelope with same status.
3. **Logout.** `DELETE /api/web/session`:
   - Reads `kgm_refresh`, calls API `POST /auth/logout` (swallows errors).
   - Clears both cookies with `Max-Age=0`.
   - Returns 204.
4. **Auth guard.** `lib/auth-guard.ts` exports `requireAuth()` for Server Components:
   - Reads `kgm_access` via `cookies()`.
   - If missing, `redirect('/')`.
5. **`apiFetch` / `apiFetchClient`.**
   - `apiFetch(path, opts)` (server): pulls cookie, sets `Authorization: Bearer <jwt>`. Throws `ApiError` on non-2xx (with parsed envelope).
   - `apiFetchClient(path, opts)` (client): calls `/api/proxy/<path>`. The proxy reads the cookie server-side and adds the header. Same `ApiError` shape.
6. **401 handling.** No refresh.
   - Server-side 401 → bounces to nearest `error.tsx` boundary. `dashboard/error.tsx` offers "Dev login again".
   - Client-side 401 → toast + `router.push('/')`.
7. **Header state.** `site-header.tsx` is a Server Component: if `kgm_access` cookie present → show "Dashboard" link + logout button; else → show "Dev login" button.

## i18n Scaffold (minimal)

- **Dep:** `next-intl@3`.
- **Locale segment.** Root `app/layout.tsx` and `app/page.tsx` removed; replaced by `app/[locale]/layout.tsx` and `app/[locale]/page.tsx`. Layout sets `<html lang={locale}>`, wraps children in `NextIntlClientProvider` with messages for the current locale.
- **Middleware.** `middleware.ts`:
  ```ts
  import createMiddleware from 'next-intl/middleware'
  export default createMiddleware({
    locales: ['ru', 'ky'],
    defaultLocale: 'ru',
    localePrefix: 'always',
  })
  export const config = { matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'] }
  ```
  Root `/` redirects to `/ru`. `/api/*` bypassed.
- **Catalogs.**
  - `messages/ru.json` — populated with every key the app uses. Top-level keys: `common`, `home`, `listings`, `sell`, `dashboard`, `auth`, `errors`.
  - `messages/ky.json` — same keys, same Russian values. Header comment via adjacent `ky.README.md`: "Placeholder — translate to Kyrgyz in Phase 2." (JSON has no comments.)
- **Category names.** Rendered directly from the `nameRu` / `nameKy` fields on the category model. No catalog translation of user content. Helper in `common/price.tsx` sibling (new `common/category-name.tsx`): `categoryName(category, locale)`.
- **Locale switcher.** `<LocaleSwitch>` in `site-header.tsx` — client component using `useRouter` and `usePathname` from `next-intl/client`. Switches path while preserving pathname + search.
- **Config.** `lib/i18n.ts` exports `getRequestConfig` used by `next-intl/server`.

## Pages (detail)

### `/[locale]/` — home

- Server Component. No auth.
- `GET /listings?limit=8` → featured grid.
- Hero: heading, subheading, CTA "Sell something" → `/[locale]/sell/new`.
- If featured grid empty → empty-state CTA.

### `/[locale]/listings` — browse

- Server Component. No auth.
- Reads `?categoryId` from `searchParams`.
- Calls `GET /listings?categoryId=X&limit=20` and `GET /categories` (both in parallel).
- Renders:
  - `<ListingFilters categories={tree} selected={categoryId}>` (client) — category `<Select>` driven by flat list of leaf categories; on change, `router.push` with new search param.
  - `<ListingsGrid initialListings={rows} initialCursor={nextCursor} categoryId={categoryId}>` (server wrapper + client island for load-more).
- Client-side load-more: `apiFetchClient` hits `/listings?cursor=...&categoryId=...&limit=20`; appends results. Filter change re-mounts the grid (key by categoryId) and resets client state.
- Empty state: "Nothing here yet." / "No results in this category."

### `/[locale]/listings/[id]` — detail

- Server Component. No auth.
- `GET /listings/:id` — 404 → Next `notFound()`.
- Renders:
  - Image gallery: main image + thumbnail strip (`<GalleryThumbs>` client island for swap-on-click).
  - Title, formatted price (`formatKgs`), condition badge, location, category breadcrumb.
  - Description.
  - View count, created date (locale-aware via `Intl.DateTimeFormat`).
  - Disabled "Contact seller" button with `title="Coming soon"`.
- Seller identity: render generic "Продавец" (Russian) / "Сатуучу" (Kyrgyz) label. API does not include seller info on public detail today; do not change the API in 1d.

### `/[locale]/sell/new` — create

- Server Component. `requireAuth()`. Calls `GET /categories`.
- Renders `<ListingForm mode="create" categories={tree}>`.
- Fields (validated against `CreateListingSchema` from `@kgm/types`):
  - `title` — text, 3–200 chars.
  - `description` — textarea, 10–5000 chars.
  - `price` — text input, string, regex `/^\d+(\.\d{1,2})?$/`, > 0.
  - `currency` — read-only, `KGS`.
  - `condition` — radio group: NEW / USED / REFURBISHED (labels localized).
  - `categoryId` — two cascading `<Select>`s: root → child. Root list derived from `tree`; child list updates on root change.
  - `location` — text, optional.
- Submit: `apiFetchClient('/listings', { method: 'POST', body: JSON.stringify(values) })` → on success, `router.push('/[locale]/sell/<id>/images')`.
- On error, render message above submit button.

### `/[locale]/sell/[id]/images` — images + publish

- Server Component. `requireAuth()`. Fetches `GET /listings/mine?limit=100` and finds the listing by id (ensures ownership + returns DRAFT). If not found → `notFound()`.
- Renders:
  - Image list (from current `images[]` on listing) with per-image delete button.
  - `<ImageUploader listingId={id} currentCount={images.length}>` — drag/drop + file picker. Per-file client-side checks before POST: size ≤ 5MB, MIME in `['image/jpeg','image/png','image/webp']`, remaining slots > 0. Uploads serially, `apiFetchClient` multipart to `/listings/:id/images`. After each upload, `router.refresh()`.
  - "Publish" button: disabled when `images.length === 0`. On click, `apiFetchClient('/listings/<id>', { method: 'PATCH', body: JSON.stringify({ status: 'ACTIVE' }) })` → `router.push('/[locale]/listings/<id>')`.
  - "Save for later" link → `/[locale]/dashboard`.

### `/[locale]/dashboard` — my listings

- Server Component. `requireAuth()`.
- `GET /listings/mine?limit=100`.
- Counts header (card of stats): active, draft, sold, paused, total views. Derived from the array.
- Table columns: title (link to detail or edit depending on status), status badge, price, views, createdAt, actions (Edit link, Delete button with confirm `<Dialog>`).
- Status badge colors: ACTIVE green, DRAFT slate, SOLD blue, PAUSED amber, REJECTED/EXPIRED red.
- Empty state: "You haven't listed anything yet" + CTA to `/[locale]/sell/new`.
- Delete: confirm dialog → `apiFetchClient('/listings/<id>', { method: 'DELETE' })` → `router.refresh()`.

### `/[locale]/dashboard/listings/[id]/edit` — edit

- Server Component. `requireAuth()`. `GET /listings/mine?limit=100` → find by id or `notFound()`.
- Renders:
  - `<ListingForm mode="edit" initialValues={listing} categories={tree}>`.
  - `<ImageUploader>` (same component as upload page).
  - Per-image delete button.
  - `<StatusDropdown currentStatus={listing.status}>` — offers only `ALLOWED_TRANSITIONS[currentStatus]`. SOLD transition shows a confirm `<Dialog>` ("This cannot be undone").
- Field save: PATCH with changed fields only (RHF `formState.dirtyFields`).
- Status change: separate PATCH with `{ status }` on select.

## Error Handling

- API error envelope: `{ error: { code, message, details? } }`. `apiFetch` parses and throws `ApiError` with those fields plus HTTP status.
- Specific code → UX mapping:
  - `LISTING_IMAGE_LIMIT_EXCEEDED` (409) → toast "errors.imageLimit" (RU: "Максимум 10 изображений на объявление").
  - `LISTING_IMAGE_INVALID_TYPE` (415) → toast "errors.imageType" (RU: "Допустимы только JPEG, PNG, WebP").
  - 413 (any code) → toast "errors.imageSize" (RU: "Файл превышает 5 МБ").
  - `INVALID_STATUS_TRANSITION` (409) → toast with server message.
  - `NOT_FOUND` on detail → Next `notFound()`.
  - `FORBIDDEN` on edit → Next `notFound()` (do not leak existence).
- Boundaries:
  - `app/[locale]/error.tsx` — generic; shows `error.digest` + "Back to home".
  - `app/[locale]/not-found.tsx` — 404.
  - `app/[locale]/dashboard/error.tsx` — offers dev-login recovery.
- Forms: field-level zod errors inline; form-level server errors above submit button.

## UX Details

- **Images.** `<Image>` from `next/image` with `remotePatterns` in `next.config.ts` allowing MinIO (`http://localhost:9000`) in dev and R2 origin in prod (env-driven).
- **Upload previews.** `URL.createObjectURL` before POST; revoked on unmount / after upload.
- **Date formatting.** `new Intl.DateTimeFormat(locale === 'ky' ? 'ky-KG' : 'ru-RU', { dateStyle: 'medium' })`.
- **Price formatting.** `formatKgs(price)` from `@kgm/utils` (already built).
- **Phone display.** `formatKgPhone(user.phone)` from `@kgm/utils` — used in header if we ever show the user's phone; not on public pages.
- **Accessibility.** Rely on shadcn's ARIA; explicit `<label>` for every input (no placeholder-as-label); focus ring visible.
- **Seller display.** "Продавец" / "Сатуучу" generic label only.

## Shared Utility: `listing-transitions.ts`

Both the API and web need to agree on valid status transitions. The API has `ALLOWED_TRANSITIONS` as a private const in `listings.service.ts`. To avoid drift:

- Option A (chosen): duplicate the constant at `apps/web/src/lib/listing-transitions.ts` with a `// MUST MATCH apps/api/src/listings/listings.service.ts` comment. Web uses it purely for dropdown filtering; API remains the source of truth on enforcement. If they drift, web offers an invalid option and API rejects — acceptable failure mode for an internal tool.
- Option B (rejected for 1d): move to `packages/types` as `LISTING_TRANSITIONS`. Adds a dependency on `@kgm/types` in `listings.service.ts` where today it uses local Prisma types. Low-value churn in 1d scope.

## Testing

- **Vitest config.** `vitest.config.ts` updated to use `jsdom` environment + Testing Library setup file.
- **Smoke tests (component level):**
  - `listing-card.test.tsx` — renders title, price, first image.
  - `listings-grid.test.tsx` — renders N cards; hides load-more when cursor null.
  - `listing-form.test.tsx` — required-field zod errors on empty submit.
  - `image-uploader.test.tsx` — rejects >5MB; rejects wrong MIME; rejects when at 10-image cap.
  - `status-dropdown.test.tsx` — shows only allowed transitions per current status.
  - `dev-login-button.test.tsx` — POSTs to `/api/web/session`.
- **Route handler test.**
  - `app/api/web/session/route.test.ts` — POST sets both cookies when API 200; DELETE clears cookies.
- **Page smoke tests (render with minimal mock data).**
  - One per route. Using `next/headers` requires stubbing `cookies()` — covered in `test/setup.ts`.
- **Manual end-of-plan walkthrough.** Captured as a final plan task with explicit steps: `db:reset && db:seed` → start stack → dev-login → browse → open detail → create draft → upload 2 images → publish → open detail → edit → change status → delete from dashboard. Each step lists expected visible result.

## Dependencies Added

- Production:
  - `next-intl@^3`
  - `react-hook-form@^7`
  - `@hookform/resolvers@^3`
  - `lucide-react@^0.400`
  - `class-variance-authority@^0.7` (shadcn)
  - `clsx@^2`
  - `tailwind-merge@^2`
  - `tailwindcss-animate@^1` (shadcn)
  - `@radix-ui/react-dialog`, `@radix-ui/react-select`, `@radix-ui/react-label`, `@radix-ui/react-slot`, `@radix-ui/react-toast` (shadcn primitives)
- Dev:
  - `@testing-library/react@^16`
  - `@testing-library/jest-dom@^6`
  - `@testing-library/user-event@^14`
  - `jsdom@^25`

Versions are indicative; final versions resolve against the workspace registry at install time.

## API Changes (minimal)

- `apps/api/prisma/seed.ts` — add dev user upsert + 3 sample listings owned by the dev user (DRAFT-then-ACTIVE flow, skip image requirement by manually setting ACTIVE).

No new API endpoints, no schema changes, no DTO changes.

## Env Additions

- `.env.example` — add `DEV_USER_EMAIL` (default `dev@kgm.local`), `DEV_USER_PASSWORD` (default `devpass123`), `NEXT_PUBLIC_DEFAULT_LOCALE` (default `ru`).

## Task Phasing (preview — ~20 tasks)

1. Install deps (shadcn core + RHF + next-intl + testing libs).
2. Seed: dev user + 3 sample listings.
3. i18n scaffold: `[locale]` move, middleware, catalogs, config.
4. `lib/api.ts`, `lib/session.ts`, `lib/auth-guard.ts`, `lib/listing-transitions.ts`.
5. `POST /api/web/session` + `DELETE` route handler and test.
6. Extend `/api/proxy/[...path]` to forward auth cookie.
7. `site-header`, `site-footer`, dev-login and logout buttons.
8. Home page with featured grid.
9. `listing-card`, `listings-grid`, `listing-filters`.
10. `/listings` browse page with filter + load-more.
11. `/listings/[id]` detail page with gallery.
12. `listing-form` component.
13. `/sell/new` create page.
14. `image-uploader` component.
15. `/sell/[id]/images` page with Publish.
16. `status-dropdown`.
17. `/dashboard` page (counts + table + delete).
18. `/dashboard/listings/[id]/edit` page.
19. Error boundaries, not-found, loading skeletons.
20. Manual end-to-end smoke walkthrough.

## Success Criteria

- All pages render in `ru` and `ky` locales (ky shows ru strings, which is expected).
- With a fresh `db:reset && db:seed`, a user can: dev-login → create listing → upload 2 images → publish → see it on `/listings` → open detail → edit → change status to SOLD → delete from dashboard. Every step works without a console error and with correct empty/populated states.
- `pnpm lint`, `pnpm type-check`, `pnpm test`, and `pnpm build` all green at the end of the plan.
- No hardcoded RU strings in page / component JSX (except ARIA labels where `t()` is awkward — call out if any).

## Open Questions

None — all resolved during brainstorming (Q1–Q9, approach choice).
