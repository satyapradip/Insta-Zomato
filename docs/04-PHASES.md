# 🚀 Engineering Phases & Roadmap — Insta-Zomato

> **Document:** 04-PHASES.md  
> **Total Planned Phases:** 18 Phases grouped into 7 Major Milestones  
> **Target Release:** Beta v1.0.0  
> **Status:** Milestones 1, 2 & Phase 6 Completed ✅ | Ready for Milestone 3 (Phase 7: Order FSM & Razorpay) 🚀

---

## 1. Roadmap Overview & Milestones

```mermaid
gantt
    title Insta-Zomato Engineering Timeline
    dateFormat  YYYY-MM-DD
    section Milestone 1: Security & Auth
    Phase 1: Project Setup & Middleware      :done,    p1, 2026-03-01, 2026-03-05
    Phase 2: Multi-Role Auth & JWT Rotation  :done,    p2, 2026-03-06, 2026-03-12
    Phase 3: Profiles & Address Book         :         p3, 2026-03-13, 2026-03-17

    section Milestone 2: Media & Discovery
    Phase 4: Food Catalog & Video Pipeline   :done,    p4, 2026-03-18, 2026-03-24
    Phase 5: Reels Feed & Social Engagement  :done,    p5, 2026-03-25, 2026-03-31

    section Milestone 3: Commerce & Real-Time
    Phase 6: Single-Restaurant Cart          :done,    p6, 2026-04-01, 2026-04-05
    Phase 7: Order FSM & State Machine       :active,  p7, 2026-04-06, 2026-04-12
    Phase 8: Razorpay & Wallet Payments      :         p8, 2026-04-13, 2026-04-18
    Phase 10: Socket.io Real-Time Hub        :         p10, 2026-04-19, 2026-04-24

    section Milestone 4: Logistics & Dispatch
    Phase 9: Geospatial & Distance Matrix    :         p9, 2026-04-25, 2026-04-30
    Phase 12: Multi-Channel Notifications    :         p12, 2026-05-01, 2026-05-05
    Phase 13: Delivery Partner System        :         p13, 2026-05-06, 2026-05-12

    section Milestone 5: Scale & Admin
    Phase 11: Search & Recommendations       :         p11, 2026-05-13, 2026-05-17
    Phase 14: SuperAdmin Moderation Portal   :         p14, 2026-05-18, 2026-05-22
    Phase 15: Redis Caching Layer            :         p15, 2026-05-23, 2026-05-27
    Phase 16: DB Optimization & Indexes      :         p16, 2026-05-28, 2026-05-31

    section Milestone 6: Frontend & DevOps
    Phase 17: End-to-End Testing             :         p17, 2026-06-01, 2026-06-07
    Phase 18: Docker, CI/CD & Cloud Launch   :         p18, 2026-06-08, 2026-06-15
```

---

## 2. Detailed Milestone Breakdown

### 🎯 Milestone 1: Security Foundation & Multi-Role Authentication

#### Phase 1: Security & Middleware Foundation *(Completed)*
- **Deliverables:**
  - Standardized error handling: `ApiError.js`, `ApiResponse.js`, `asyncHandler.js`.
  - Rate limiters: `globalLimiter`, `authLimiter`, `uploadLimiter`, `orderLimiter`.
  - Input sanitization: `express-mongo-sanitize`, `xss-clean`, `helmet`, `cors`.
  - Centralized Zod environment variable validation (`src/config/index.js`).
  - Winston rotating file logger (`src/config/logger.js`).
- **DoD:** Server boots without errors, validates all env vars, and blocks malicious payload injections.

#### Phase 2: Multi-Role Auth & JWT Rotation System *(Completed)*
- **Deliverables:**
  - Customer registration, login, logout, and token revocation.
  - Food Partner registration with FSSAI license field & GeoJSON `2dsphere` location.
  - Delivery Partner registration with vehicle details, driving license, and live `2dsphere` GPS coords.
  - Dual JWT mechanism: 15-minute Access Token + 7-day Refresh Token with database bcrypt hashing and token reuse revocation.
  - Role-Based Access Control (RBAC) middlewares: `requireAuth`, `requireCustomer`, `requireFoodPartner`, `requireDeliveryPartner`, `requireAdmin`.
- **DoD:** Authenticated routes enforce strict role checks; expired access tokens refresh transparently via HTTP-only cookie.

#### Phase 3: User Profile & Geospatial Address Book
- **Deliverables:**
  - Customer profile CRUD & dietary preferences (`isVegOnly`, `spiceLevel`, `allergies`).
  - Address book with labeled addresses and geospatial coordinates (`[lng, lat]`).
  - Default address selection.
- **DoD:** Users can store multiple labeled addresses with validated geospatial coordinates.

---

### 🎯 Milestone 2: Media Ingestion & Visual Discovery Engine

#### Phase 4: Restaurant Menu & Video Ingestion *(Completed)*
- **Deliverables:**
  - FoodPartner model with restaurant name, opening hours, isOpen, and geo-location.
  - Food Item creation endpoint with Multer memory buffer + Cloudinary streaming pipeline.
  - Automatic WebP poster thumbnail generation at 0.5s frame.
  - Flipkart-style portion variants (`variants: [{ name, price }]`) and paid toppings (`addOns: [{ name, price }]`).
  - Dietary flags (`isVeg`), spice levels (`mild`/`medium`/`hot`), prep time, calories, and stock availability toggle (`PATCH /api/food/:id/availability`).
- **DoD:** Restaurant can upload food reel videos and instantly retrieve streaming Cloudinary URLs and thumbnails.

#### Phase 5: Reels Feed & Social Engagement System *(Completed)*
- **Deliverables:**
  - Cursor-based paginated Feed endpoint (`GET /api/feed?cursor=...&limit=10&sort=for_you|trending|latest`).
  - Real-time road proximity calculation (Haversine formula in km) comparing user GPS with restaurant location.
  - Social interactions: Idempotent Likes, Saves/Wishlist collections, and 2-level nested Comments.
  - User history endpoints (`GET /api/users/me/likes`, `GET /api/users/me/saved`).
  - Atomic view count incrementer (`POST /api/feed/:id/view`).
- **DoD:** Client can smoothly scroll through infinite video reels with real-time like/comment counts and distance badges.

---

### 🎯 Milestone 3: Commerce, Order Engine & Real-Time Sync

#### Phase 6: Single-Restaurant Cart System *(Completed)*
- **Deliverables:**
  - Cart model with single-restaurant enforcement (returns `409 Conflict` if cross-restaurant items are added, supports `forceClear=true`).
  - Add to cart, update quantity, remove item, and clear cart endpoints.
  - Dynamic server-side price recalculation (Subtotal, ₹30 Delivery, ₹5 Platform Fee, 5% GST, Rider Tip).
  - Coupon engine supporting percentage / flat discounts with `minOrderValue` and `maxDiscount` limits.
  - Delivery instructions pill selection (`Leave at door`, `Don't ring bell`).
- **DoD:** Cart guarantees zero client-side price tampering and strictly preserves single-restaurant integrity.

#### Phase 7: Order Lifecycle & State Machine *(Completed)*
- **Deliverables:**
  - Order model with complete status transitions (`PENDING` $\to$ `CONFIRMED` $\to$ `PREPARING` $\to$ `READY_FOR_PICKUP` $\to$ `PICKED_UP` $\to$ `OUT_FOR_DELIVERY` $\to$ `DELIVERED`).
  - 4-digit cryptographically generated Delivery OTP.
  - Cancellation & partial refund handlers.
  - Customer order history & detailed timeline view.
- **DoD:** State machine prevents invalid transitions (e.g. cannot mark `DELIVERED` without OTP verification).

#### Phase 8: Razorpay Payments & Wallet System *(Completed ✅)*
- **Deliverables:**
  - Razorpay order creation and HMAC-SHA256 signature verification.
  - Asynchronous webhook processor with idempotency keys (`payment.captured`, `payment.failed`, `refund.processed`).
  - User in-app wallet for instant cancellation refunds and 1-tap checkout.
- **DoD:** Paid orders update state automatically upon signature verification and webhook receipt.

#### Phase 10: Real-Time Event Architecture (Socket.io) *(Completed ✅)*
- **Deliverables:**
  - Socket.io server mounted on HTTP instance with JWT handshake authentication.
  - Room management: `user:<id>`, `partner:<id>`, `delivery:<id>`, `order:<id>`, `food:<id>`, `riders:online`.
  - Event broadcasts for order state changes, partner kitchen alerts, reel social updates, and live rider GPS coordinates.
- **DoD:** Status changes made by the restaurant or rider reflect instantly on the customer's screen in < 50ms.

---

### 🎯 Milestone 4: Logistics, Dispatch & Multi-Channel Notifications

#### Phase 9: Maps & Geospatial Routing *(Completed ✅)*
- **Deliverables:**
  - Haversine distance algorithm & urban road routing approximation ($1.25\times$).
  - Dynamic delivery fee engine (tiered rates: base ₹30 for $\le 3\text{km}$, ₹10/km, surge multiplier).
  - Address geocoding, reverse geocoding, and places autocomplete.
  - Nearby restaurant discovery query with distance in km and ETA.

#### Phase 12: Multi-Channel Notification Engine *(Completed ✅)*
- **Deliverables:**
  - In-app notification center with read/unread tracking and pagination (`/api/notifications`).
  - Real-time Socket.io instant push (`notification:new` events).
  - Nodemailer responsive HTML email invoice and delivery confirmation templates.
  - SMS & Doorstep Delivery OTP dispatch service interface.
- **DoD:** Notifications persist reliably in PostgreSQL, broadcast instantaneously across WebSockets, and dispatch async emails/SMS.

#### Phase 13: Delivery Partner App & Auto-Dispatch Engine *(Completed ✅)*
- **Deliverables:**
  - Rider duty status toggle (`isOnline: true / false`).
  - Automated dispatch algorithm: queries nearest idle riders within 5km radius with 30s accept timer and candidate cascading.
  - Rider GPS pinging endpoint (`PUT /api/delivery/location`) with dynamic ETA and speed tracking.
  - Rider earnings calculator (base ₹30 + distance ₹12/km + surge + 100% tips pass-through) with period summaries.
- **DoD:** Orders trigger automated candidate matching and cascade offers across WebSockets with real-time tracking and earnings ledger.

---

### 🎯 Milestone 5: Intelligence, Caching & Platform Hardening

#### Phase 11: Search & Discovery Engine
- **Deliverables:**
  - Full-text search on dishes, cuisines, and restaurants with MongoDB text indexes.
  - Dynamic filter builder (Veg, Rating, Price Range, Distance).
  - Trending search suggestions with Redis autocomplete caching.

#### Phase 14: SuperAdmin Moderation & Analytics Portal
- **Deliverables:**
  - Platform KPIs dashboard (GMV, active orders, live riders, partner approvals).
  - Restaurant KYC & FSSAI document verification panel.
  - Video content moderation and user suspension tools.

#### Phase 15 & 16: Redis Caching & Database Optimization
- **Deliverables:**
  - Cache middleware for trending feed, restaurant menus, and static categories.
  - Compound indexes on MongoDB collections (`like: (user, food)`, `order: (user, status)`).
  - Database connection pooling and query optimization.

---

### 🎯 Milestone 6 & 7: Frontend Application, Testing & Cloud Launch

#### Next.js 16 Frontend Implementation (shadcn/ui) *(Completed ✅)*
- **Deliverables:**
  - Full-screen vertical swipe Reels player with prefetching & double-tap heart burst.
  - Flipkart-style Sticky CTA (`+ Add to Cart` & `⚡ Buy Now`) with Vaul Customization Drawer.
  - Single-Restaurant Cart, coupon engine, and 1-tap Slide-to-Pay.
  - Real-time Interactive Delivery Tracking HUD with vector map & live rider path animation.
  - Restaurant Studio POS with 3-stage incoming orders Kanban queue and audio alerts.
  - Explore, Cuisines grid, Orders history, Wishlist, and Profile preferences.

#### Phase 17 & 18: Testing, DevOps & Production Launch
- **Deliverables:**
  - Jest & Supertest integration test suite covering auth, cart, order FSM, and payment verification.
  - Multi-stage Docker containerization and Docker Compose setup.
  - GitHub Actions CI/CD pipeline deploying backend to Render/AWS EC2 and frontend to Vercel.
  - Cloudflare SSL, Nginx reverse proxy, and Sentry error tracking.
