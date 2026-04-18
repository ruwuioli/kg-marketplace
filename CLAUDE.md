# CLAUDE.md — KG Marketplace

> Governance document for AI-assisted development of the KG Marketplace project.
> All contributors (human and AI) must read this file before making changes.

---

## Project Overview

**KG Marketplace** is a unified digital trading platform for Kyrgyzstan — a multi-vendor marketplace where individuals and businesses can list, discover, and transact goods and services. Think Avito/OLX adapted for the KG market with local payment rails, Russian/Kyrgyz i18n, and mobile-first UX.

---

## Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript | SSR/SSG for SEO, fast TTFB |
| Styling | Tailwind CSS + shadcn/ui | Rapid UI, accessible components |
| Backend | NestJS + TypeScript | Modular, scalable, decorator-driven DI |
| ORM | Prisma | Type-safe DB access, migrations |
| Primary DB | PostgreSQL 16 | Relational, JSONB for flexible attrs |
| Cache / Queue | Redis + BullMQ | Sessions, rate-limiting, job queues |
| Search | Meilisearch | Typo-tolerant, CIS language support |
| File Storage | Cloudflare R2 (or MinIO self-hosted) | S3-compatible, cheap egress |
| Auth | JWT (access + refresh) + bcrypt | Stateless API auth |
| Payments | Mbank, O!Денги, ElCat adapters | Local KG payment gateways |
| Monorepo | pnpm workspaces + Turborepo | Shared types/utils, fast builds |
| Containerization | Docker Compose (dev) / Kubernetes (prod) | Environment parity |
| CI/CD | GitHub Actions | Lint → test → build → deploy |
| i18n | next-intl (ru, ky) | Russian + Kyrgyz language support |

---

## Monorepo Directory Tree

```
kgm/
├── apps/
│   ├── web/                        # Next.js 15 — buyer & seller portal
│   │   ├── app/
│   │   │   ├── (auth)/             # login, register, forgot-password
│   │   │   ├── (marketplace)/      # browse, search, listing detail
│   │   │   ├── (dashboard)/        # seller dashboard, my listings
│   │   │   ├── (checkout)/         # cart, payment, order confirmation
│   │   │   └── api/                # Next.js route handlers (BFF layer)
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── messages/               # i18n: ru.json, ky.json
│   │   ├── public/
│   │   └── next.config.ts
│   │
│   ├── admin/                      # Next.js 15 — internal admin panel
│   │   ├── app/
│   │   │   ├── users/
│   │   │   ├── listings/
│   │   │   ├── categories/
│   │   │   ├── orders/
│   │   │   └── analytics/
│   │   └── next.config.ts
│   │
│   └── api/                        # NestJS — core REST + WS API
│       ├── src/
│       │   ├── auth/               # JWT auth, guards, strategies
│       │   ├── users/              # user CRUD, profiles, verification
│       │   ├── listings/           # listing CRUD, images, moderation
│       │   ├── categories/         # category tree management
│       │   ├── search/             # Meilisearch indexing + query
│       │   ├── messaging/          # real-time chat (WebSockets)
│       │   ├── orders/             # order lifecycle management
│       │   ├── payments/           # payment gateway adapters
│       │   ├── notifications/      # push, email, SMS
│       │   ├── reviews/            # buyer/seller ratings
│       │   ├── storage/            # R2/MinIO file upload
│       │   ├── common/             # filters, guards, interceptors, pipes
│       │   ├── config/             # env validation (Zod)
│       │   └── main.ts
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── migrations/
│       └── test/
│
├── packages/
│   ├── types/                      # Shared TypeScript interfaces & DTOs
│   │   └── src/
│   │       ├── user.ts
│   │       ├── listing.ts
│   │       ├── order.ts
│   │       └── index.ts
│   │
│   ├── ui/                         # Shared React component library
│   │   └── src/
│   │       ├── components/
│   │       └── index.ts
│   │
│   ├── utils/                      # Shared pure utilities (formatting, validation)
│   │   └── src/
│   │       ├── currency.ts         # KGS formatting
│   │       ├── phone.ts            # KG phone number utils (+996)
│   │       └── index.ts
│   │
│   └── config/                     # Shared tooling configs
│       ├── eslint-base.js
│       ├── tsconfig.base.json
│       └── tailwind.base.ts
│
├── infrastructure/
│   ├── docker/
│   │   ├── docker-compose.yml      # Full local dev stack
│   │   ├── docker-compose.test.yml # Test environment
│   │   └── dockerfiles/
│   │       ├── api.Dockerfile
│   │       └── web.Dockerfile
│   ├── k8s/                        # Kubernetes manifests (prod)
│   │   ├── deployments/
│   │   ├── services/
│   │   └── ingress/
│   └── terraform/                  # IaC for cloud resources
│
├── docs/
│   ├── architecture.md             # System design decisions & ADRs
│   ├── api.md                      # API conventions & examples
│   ├── deployment.md               # Deployment runbook
│   └── payments.md                 # Payment gateway integration notes
│
├── .github/
│   └── workflows/
│       ├── ci.yml                  # Lint, test, type-check on PR
│       └── deploy.yml              # Deploy on merge to main
│
├── .env.example                    # All required env vars documented
├── .eslintrc.js
├── .prettierrc
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── CLAUDE.md                       ← this file
└── PRD.md
```

---

## Development Roadmap

### Phase 1 — Foundation (Weeks 1–4)
> Goal: Running monorepo with auth, basic listing CRUD, and local dev environment.

- [ ] Initialize monorepo (pnpm workspaces + Turborepo)
- [ ] Bootstrap `apps/api` — NestJS + Prisma + PostgreSQL
- [ ] Bootstrap `apps/web` — Next.js 15 + Tailwind + shadcn/ui
- [ ] Define Prisma schema: `User`, `Listing`, `Category`, `Image`
- [ ] Auth module: register, login, JWT refresh, password reset
- [ ] User profiles: avatar upload, phone verification (+996)
- [ ] Category tree: seeded with KG marketplace categories
- [ ] Listing CRUD: create, edit, delete, image upload to R2
- [ ] Docker Compose dev stack (Postgres, Redis, Meilisearch, API, Web)
- [ ] GitHub Actions CI: lint + type-check + unit tests
- [ ] `packages/types` shared DTOs between api ↔ web

### Phase 2 — Core Marketplace (Weeks 5–10)
> Goal: End-to-end buy/sell flow with search and messaging.

- [ ] Meilisearch integration: index listings, full-text + faceted search
- [ ] Search UI: filters by category, price range, location, condition
- [ ] Real-time messaging (WebSockets): buyer ↔ seller chat per listing
- [ ] Order lifecycle: inquiry → offer → accepted → completed/cancelled
- [ ] Payment gateway adapters: Mbank, O!Денги (sandbox)
- [ ] Seller dashboard: my listings, stats, messages, orders
- [ ] Listing moderation queue in admin panel
- [ ] Email notifications (Resend or SMTP)
- [ ] i18n: Russian (ru) + Kyrgyz (ky) via next-intl
- [ ] SEO: dynamic sitemap, structured data (Product schema)

### Phase 3 — Trust & Growth (Weeks 11–16)
> Goal: Build trust signals, improve retention.

- [ ] Review & rating system (buyer rates seller and vice versa)
- [ ] Verified seller badges (ID verification flow)
- [ ] Saved searches + watchlist (favorites)
- [ ] Push notifications (web push + FCM for mobile)
- [ ] Featured/promoted listings (paid placement)
- [ ] Fraud detection: duplicate listings, suspicious activity flags
- [ ] Analytics dashboard (admin): MAU, GMV, conversion funnel
- [ ] SMS notifications via local KG SMS gateway

### Phase 4 — Scale & Mobile (Weeks 17–24)
> Goal: Mobile app, performance at scale, advanced features.

- [ ] React Native app (Expo) sharing `packages/types` and `packages/utils`
- [ ] Horizontal scaling: Redis cluster, read replicas
- [ ] CDN for images (Cloudflare)
- [ ] AI-powered listing suggestions (auto-fill title/description/category)
- [ ] Recommendation engine: "similar listings", "recently viewed"
- [ ] B2B tier: business accounts, bulk listing tools, invoicing
- [ ] Multi-region readiness (Bishkek edge node)

---

## Coding Conventions

### General
- All code in **TypeScript strict mode** — no `any` except at external API boundaries.
- Prefer `const` and immutability. No `var`.
- Functions over classes where there is no state.
- Maximum function length: ~50 lines. Extract if longer.
- No commented-out code in commits.

### API (NestJS)
- One module per domain feature (`listings/`, `users/`, etc.).
- DTOs validated with `class-validator` + `class-transformer`.
- All endpoints require explicit auth guard unless decorated `@Public()`.
- Database queries go in service layer — never in controllers or resolvers.
- All Prisma calls wrapped in try/catch with `PrismaClientErrorHandler`.
- Pagination: cursor-based for feeds, offset-based for admin tables.

### Frontend (Next.js)
- Server Components by default; add `'use client'` only when needed (interactivity, hooks).
- Data fetching in Server Components or Route Handlers — never `useEffect` for initial load.
- Form state with `react-hook-form` + `zod` resolver.
- All user-visible strings must use `t()` from next-intl — no hardcoded text.
- Image optimization: always use `next/image`.

### Database
- All schema changes via Prisma migrations — never manual SQL edits.
- Indexes on all foreign keys and any column used in `WHERE` clauses.
- Soft deletes (`deletedAt DateTime?`) on User, Listing, Order.
- No nullable columns on frequently-queried fields — use explicit defaults.

### Testing
- Unit tests co-located: `foo.service.spec.ts` next to `foo.service.ts`.
- Integration tests in `apps/api/test/` using real Postgres (Docker).
- Frontend: component tests with Testing Library, E2E with Playwright.
- Minimum coverage targets: 80% for services, 60% for controllers.

### Git
- Branch naming: `feat/`, `fix/`, `chore/`, `docs/` prefixes.
- Commit style: Conventional Commits (`feat: add listing image upload`).
- PRs require passing CI + 1 review before merge.
- Squash merge to `main`. No direct pushes to `main`.

---

## Environment Variables

All secrets live in `.env` (never committed). See `.env.example` for required keys.

Key variables:
```
DATABASE_URL          # PostgreSQL connection string
REDIS_URL             # Redis connection string
JWT_SECRET            # Access token secret
JWT_REFRESH_SECRET    # Refresh token secret
R2_ACCOUNT_ID         # Cloudflare R2
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
MEILISEARCH_HOST
MEILISEARCH_API_KEY
MBANK_API_KEY         # Payment gateway
ODENGI_API_KEY
ELCAT_API_KEY
NEXT_PUBLIC_API_URL   # Public API base URL
```

---

## Architecture Decisions

### ADR-001: Monorepo with pnpm + Turborepo
Shared types between API and frontend eliminate runtime mismatches. Turborepo's remote cache speeds up CI significantly for a multi-app repo.

### ADR-002: NestJS over Express
Structured modules and DI make onboarding faster and enforce consistent patterns across feature teams. Decorator-based validation reduces boilerplate.

### ADR-003: Meilisearch over Elasticsearch
Meilisearch is operationally simpler, has better CIS language tokenization out of the box, and is sufficient for marketplace-scale search volumes.

### ADR-004: Cursor-based pagination for listing feeds
Offset pagination breaks when new listings are inserted mid-scroll. Cursor-based ensures stable, non-duplicate feeds.

### ADR-005: Soft deletes on core entities
Legal/compliance requirements may require data retention. Soft deletes allow data recovery and audit trails without complex archival systems.

---

## Local Development

```bash
# Prerequisites: Node 20+, pnpm 9+, Docker Desktop

pnpm install                    # install all workspace deps
docker compose up -d            # start Postgres, Redis, Meilisearch
pnpm db:migrate                 # run Prisma migrations
pnpm db:seed                    # seed categories + test data
pnpm dev                        # start all apps in parallel (Turborepo)

# Individual apps
pnpm --filter=api dev
pnpm --filter=web dev
pnpm --filter=admin dev

# Tests
pnpm test                       # all unit tests
pnpm test:e2e                   # Playwright E2E (requires running stack)
```
