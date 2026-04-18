# Architecture Overview

## System Diagram

```
                        ┌─────────────────────────────────┐
                        │           Cloudflare CDN         │
                        └──────────────┬──────────────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              │                        │                        │
    ┌─────────▼──────────┐  ┌──────────▼─────────┐  ┌─────────▼──────────┐
    │   apps/web         │  │   apps/admin        │  │   React Native     │
    │   Next.js 15       │  │   Next.js 15        │  │   (Phase 4)        │
    │   (buyer/seller)   │  │   (internal ops)    │  │                    │
    └─────────┬──────────┘  └──────────┬──────────┘  └─────────┬──────────┘
              │                        │                        │
              └────────────────────────┼────────────────────────┘
                                       │ REST + WebSocket
                              ┌────────▼────────┐
                              │   apps/api      │
                              │   NestJS        │
                              └────────┬────────┘
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
          ┌─────────▼──────┐ ┌────────▼──────┐ ┌────────▼──────┐
          │   PostgreSQL   │ │    Redis       │ │  Meilisearch  │
          │   (primary DB) │ │  (cache/queue) │ │   (search)    │
          └────────────────┘ └───────────────┘ └───────────────┘
                                       │
                              ┌────────▼────────┐
                              │  Cloudflare R2  │
                              │  (file storage) │
                              └─────────────────┘
```

## Request Flow — Listing Browse

1. User opens `/` on `apps/web`
2. Next.js Server Component fetches featured listings via `apps/api` REST
3. User searches → Next.js Route Handler proxies to `apps/api /search`
4. API queries Meilisearch, hydrates with Postgres data, returns paginated results
5. User clicks listing → Server Component SSR with listing detail + seller info
6. Images served from R2 via Cloudflare CDN

## Request Flow — Send Message

1. Buyer opens listing, clicks "Send Message"
2. WebSocket connection established to `apps/api` (Socket.IO)
3. Message persisted to Postgres via `messaging` service
4. Real-time delivery to seller via Socket.IO room
5. If seller offline → push notification queued in BullMQ → delivered async

## Data Model (Core Entities)

```
User ──< Listing ──< ListingImage
 │           │
 │           └──< Order ──< Payment
 │
 ├──< Message (sender)
 ├──< Message (receiver)
 ├──< Review (reviewer)
 └──< Review (reviewed)
```

## ADRs

See `CLAUDE.md` → Architecture Decisions section for ADR-001 through ADR-005.
