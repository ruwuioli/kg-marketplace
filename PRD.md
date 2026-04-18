## 1. Project Overview & Objectives
**Concept:** A free online marketplace connecting all sellers (from small entrepreneurs to large retail chains) with buyers across Kyrgyzstan.
**Core Philosophy:** "Mobile-first" design, high performance under unstable internet conditions, and zero cost for initial seller entry.

---

## 2. User Roles & Permissions
The system must support four distinct roles:

* **Guest:** Can browse products, search, and view shop profiles without registration.
* **Buyer:** Can manage a profile, use a persistent cart, place orders, write reviews, and chat with sellers.
* **Seller:** Can manage multiple shops, list products with variants, view sales analytics, and process orders.
* **Administrator:** Responsible for user management, shop verification, content moderation, and platform-wide analytics.

---

## 3. Functional Requirements

### 3.1 Authentication & Profile
* **Registration:** Support for Phone (SMS OTP), Email, and Google OAuth 2.0.
* **Security:** Implement JWT with a 15-minute access token lifespan and a refresh mechanism.
* **Verification:** Sellers must upload documents (INN/OGRN) for manual admin approval.

### 3.2 Seller Dashboard (Management)
* **Shop Customization:** Unique slugs (e.g., `/shop/name`), logo/banner cropping, and integrated maps (Yandex/OSM).
* **Inventory:** CRUD for products with multi-photo drag-and-drop (up to 10 images).
* **Media Optimization:** Automatic compression and conversion of all images to **WebP**.
* **Variants:** Support for SKUs with different attributes (size, color) and individual pricing/stock.

### 3.3 Catalog, Search & Product Page
* **Search Engine:** Utilize **Meilisearch** for full-text search with Cyrillic support and a 300ms debounce for auto-suggestions.
* **Filtering:** Filter by category, price (range slider), city, and stock status; filters must sync with the URL.
* **Product UI:** Gallery with zoom, variant selectors, and a direct "Write to Seller" button.

### [cite_start]3.4 Order Lifecycle & Payments [cite: 132, 145]
* **Cart:** Persistent cart synchronized across devices upon login.
* **Payment Priorities (P0):** Integration with **Elsom**, **MBank**, and Cash on Delivery.
* **Communication:** Real-time chat via **Socket.io** with "read/delivered" statuses and push notifications.

---

## 4. Technical Stack & Architecture

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend** | Next.js 14 (App Router) | SSR/SSG for SEO and performance. |
| **Backend** | NestJS (Node.js) | Scalable, modular TypeScript architecture. |
| **Database** | PostgreSQL 15 | Robust relational data with JSON support. |
| **Mobile** | React Native (Expo) | Unified codebase for iOS and Android. |
| **Real-time** | Socket.io + Redis | Chat and live notification delivery. |
| **Search** | Meilisearch | High-speed, localized search. |

**Architecture Style:** Modular Monolith (Phase 1) with a roadmap to transition into Microservices (Auth, Product, Order, etc.) in Phase 2.

---

## 5. Non-Functional Requirements & Performance
* **Speed:** Time to First Byte (TTFB) < 200ms; page load < 2s on 4G.
* **SEO:** Full SSR support, dynamic `sitemap.xml`, and Schema.org structured data (Product, Store, Review).
* **Localization:** I18n support for Russian (primary), Kyrgyz, and English.
* **Offline:** PWA functionality for viewing cached pages without a connection.
* **Security:** Bcrypt (12 rounds) for passwords and rate limiting for all APIs.

---

## 6. Acceptance Criteria for Code Generation
1.  **Code Coverage:** Unit tests must cover at least 70% of business logic.
2.  **Performance:** Lighthouse scores must exceed 85 for Performance and 90 for SEO/Accessibility.
3.  **Documentation:** All API endpoints must be documented via **Swagger/OpenAPI 3.0**.
4.  **Deployment:** Provide a `docker-compose.up` configuration for a single-command environment launch.

---

## 7. Development Roadmap
* **Phase 0:** CI/CD, Environment setup, and Design System (2 weeks).
* **Phase 1:** MVP (Auth, Shops, Products, Cash Payments) (8 weeks).
* **Phase 2:** Digital Payments (Elsom/MBank) and SMS notifications (4 weeks).
* **Phase 3:** Social features (Chat, Reviews, Favorites) (4 weeks).