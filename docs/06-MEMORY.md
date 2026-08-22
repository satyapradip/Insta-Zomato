# 🧠 Project Brain & Context Memory — Insta-Zomato

> **Document:** 06-MEMORY.md  
> **Last Updated:** 2026-08-19  
> **Status:** Active Development (Sprints 1, 2, 3 Completed ✅ · Ready for Sprint 4: Order FSM & Razorpay)  
> **UX Archetype:** Tri-Hybrid (**Zomato** Food Logistics + **Instagram** Reels Video + **Flipkart** E-Commerce Conversion)  

---

## 1. Project Overview & Repository Context

**Insta-Zomato** is a high-octane visual food discovery and hyper-local delivery platform combining vertical short-form video reels with a fast ordering, payment, and real-time GPS tracking system.

### Workspace Structure:
```
e:/Insta_Zomato/
├── backend/                  # Node.js + Express v5 API Server
│   ├── src/
│   │   ├── config/           # Centralized Zod env, Winston logger, Rate limiters
│   │   ├── controllers/      # Auth, Food, Feed, Social, Cart controllers
│   │   ├── db/               # MongoDB connection
│   │   ├── middlewares/      # Error, Auth (RBAC), Validate, RateLimit middlewares
│   │   ├── models/           # User, FoodPartner, DeliveryPartner, Food, Like, Save, Comment, Cart, Coupon
│   │   ├── routes/           # Auth, Food, Feed, User, Cart express routes
│   │   ├── services/         # Cloudinary storage, Razorpay, Maps, Notifications
│   │   ├── utils/            # ApiError, ApiResponse, asyncHandler
│   │   └── validators/       # Express-validator schema chains (Auth, Food, Cart)
│   ├── server.js             # HTTP server entry point with uncaught exception listeners
│   ├── TODO.md               # Granular checkbox checklist
│   └── package.json
├── frontend/                 # Next.js 16 App Router Frontend (shadcn/ui + Tailwind)
├── docs/                     # Comprehensive Architecture & Engineering Documentation
│   ├── 01-PRD.md
│   ├── 02-ARCHITECTURE.md
│   ├── 03-DESIGN.md
│   ├── 04-PHASES.md
│   ├── 05-RULES.md
│   ├── 06-MEMORY.md
│   ├── 07-TASK-CHUNKS.md
│   └── 08-DEPLOYMENT.md
└── uploads/                  # Temporary staging for local file chunks
```

---

## 2. Active Tech Stack & Dependencies

### Backend Dependencies (`backend/package.json`):
- **Runtime:** Node.js v22+
- **Framework:** Express.js `^5.2.1` (Promise-native routing)
- **Database:** PostgreSQL (via Neon Serverless) & Prisma ORM `^6.4.1` (with optional MongoDB Mongoose backwards compatibility)
- **Security & Headers:** Helmet `^8.1.0`, CORS `^2.8.6`, Express Mongo Sanitize `^2.2.0`, XSS Clean `^0.1.4`
- **Rate Limiting:** Express Rate Limit `^8.3.0`
- **Validation:** Zod `^4.3.6` (Config startup), Express Validator `^7.3.1` (Route inputs)
- **Authentication:** JSON Web Tokens `^9.0.3`, Bcrypt `^6.0.0`, Cookie Parser `^1.4.7`
- **Media Ingestion:** Multer `^2.0.2`, Cloudinary `^2.9.0`, UUID `^13.0.0`
- **Logging & Diagnostics:** Winston `^3.19.0`, Winston Daily Rotate File `^5.0.0`, Morgan `^1.10.1`, Compression `^1.8.1`

### Frontend Stack (Planned):
- **Framework:** Next.js 16 (React 19 / App Router / TypeScript)
- **Component Library:** **shadcn/ui** (Radix UI Primitives + Tailwind CSS + Lucide Icons)
- **Drawer Primitives:** Vaul (`shadcn/ui Drawer`) for mobile-first bottom sheets
- **Styling:** Tailwind CSS + PostCSS + `tailwind-merge` + `clsx`
- **Animations:** Framer Motion (Reel swipe gestures, particle burst, slide-to-pay)
- **Toasts:** Sonner (`shadcn/ui Sonner`)
- **State Management:** Zustand (Cart & Auth) + TanStack Query v5 (Server cache)
- **Maps:** Leaflet / React-Leaflet or Mapbox GL
- **Real-Time Client:** Socket.io-client `^4.8.x`
- **Payments:** Razorpay Checkout.js wrapper

---

## 3. Environment Variables Directory

All variables are validated at startup via [`src/config/index.js`](file:///e:/Insta_Zomato/backend/src/config/index.js).

| Variable Name | Type | Required? | Purpose | Default / Example |
|---|---|---|---|---|
| `NODE_ENV` | Enum | Yes | Environment mode | `development` \| `production` \| `test` |
| `PORT` | Number | Yes | HTTP listening port | `3000` |
| `MONGO_URI` | String | Yes | MongoDB connection string | `mongodb://127.0.0.1:27017/insta-zomato` |
| `JWT_SECRET` | String (min 32) | Yes | Access token signing key (15m expiry) | Long cryptographic random string |
| `JWT_REFRESH_SECRET` | String (min 32) | No | Refresh token signing key (7d expiry) | Fallback to `JWT_SECRET` |
| `ALLOWED_ORIGINS` | String | No | Comma-separated CORS origins | `http://localhost:3000,http://localhost:3001` |
| `CLOUDINARY_CLOUD_NAME` | String | Yes | Cloudinary account name | `demo_cloud` |
| `CLOUDINARY_API_KEY` | String | Yes | Cloudinary API Key | `1234567890` |
| `CLOUDINARY_API_SECRET` | String | Yes | Cloudinary API Secret | `secret_abcdef` |
| `RAZORPAY_KEY_ID` | String | Phase 8 | Razorpay public key | `rzp_test_xxxx` |
| `RAZORPAY_KEY_SECRET` | String | Phase 8 | Razorpay secret key | `xxxx` |
| `REDIS_URL` | String | Phase 15 | Redis instance connection URI | `redis://127.0.0.1:6379` |
| `GOOGLE_MAPS_API_KEY` | String | Phase 9 | Geocoding & Distance Matrix API | `AIzaSyxxxx` |
| `SMTP_HOST` | String | Phase 12 | Email server host | `smtp.gmail.com` |
| `SMTP_PORT` | Number | Phase 12 | Email server port | `587` |
| `SMTP_USER` | String | Phase 12 | Email username | `alerts@instazomato.com` |
| `SMTP_PASS` | String | Phase 12 | App password | `xxxx` |

---

## 4. Architectural Decision Records (ADR)

### ADR-001: Stream Direct-to-Cloudinary via Memory Buffers
- **Context:** Saving multi-megabyte video files to the backend server's local disk creates I/O bottlenecks and disk-space exhaustion risks on stateless container hosts.
- **Decision:** Multer is configured with `memoryStorage()`. Buffers are stream-piped straight into Cloudinary's `upload_stream` with automatic 0.5s WebP poster thumbnail generation.
- **Status:** Implemented in `src/services/storage.services.js`.

### ADR-002: Fail-Fast Startup with Zod Config Validation
- **Context:** Missing environment variables previously caused silent failures or runtime crashes deep inside business logic.
- **Decision:** Implemented `src/config/index.js` using Zod schemas. If any required variable is missing on boot, the server logs a formatted diagnostic table and terminates immediately with exit code 1.
- **Status:** Implemented.

### ADR-003: Strict Single-Restaurant Cart Rule
- **Context:** Multi-restaurant delivery orders complicate kitchen dispatch, rider routing, and delivery guarantees.
- **Decision:** A cart can only contain dishes from a single food partner. Attempting to add an item from another restaurant returns `HTTP 409 Conflict` asking the user to confirm clearing the cart or passes `forceClear=true`.
- **Status:** Implemented in `src/controllers/cart.controllers.js`.

### ADR-004: Dual JWT with Database-Backed Refresh Token Rotation
- **Context:** Long-lived access tokens cannot be revoked if compromised; short-lived tokens without refresh tokens ruin user experience.
- **Decision:** Access token expires in 15 minutes. Refresh token expires in 7 days, stored in an HTTP-only SameSite cookie and hashed with bcrypt in the database. Token reuse attacks trigger instant session revocation across all devices.
- **Status:** Implemented in `src/controllers/auth.controllers.js`.

### ADR-005: shadcn/ui Component Architecture for Next.js Frontend
- **Context:** Building complex accessible mobile drawers, accordions, and dialogs from scratch increases frontend bugs and slows velocity.
- **Decision:** Adopt shadcn/ui with Radix primitives and Vaul mobile drawers across all user-facing views.
- **Status:** Approved in `03-DESIGN.md`.

### ADR-006: Cryptographic Delivery OTP & Strict Finite State Machine (FSM)
- **Context:** Order status tampering and unverified delivery claims lead to fraudulent order completion and customer disputes.
- **Decision:** Orders follow a strict linear state transition graph (`PENDING` $\to$ `CONFIRMED` $\to$ `PREPARING` $\to$ `READY_FOR_PICKUP` $\to$ `PICKED_UP` $\to$ `OUT_FOR_DELIVERY` $\to$ `DELIVERED`). Terminal states (`DELIVERED`, `CANCELLED`, `FAILED`) are permanently immutable. A cryptographically generated 4-digit OTP (`crypto.randomInt(1000, 10000)`) is hashed with bcrypt before database storage and revealed exclusively to the ordering customer. Transition to `DELIVERED` strictly requires the delivery partner to submit and cryptographically match the customer's OTP.
- **Status:** Implemented in `src/services/orderStateMachine.services.js` and `src/models/order.models.js`.

### ADR-007: Relational Database Migration to PostgreSQL & Prisma ORM via Neon
- **Context:** MongoDB SRV records caused ISP-level DNS resolution failures and required manual schema maintenance. Relational integrity (Foreign Keys, Cascade Deletes, Enums, Transactions) is critical for order financial states and delivery fleet operations.
- **Decision:** Migrated database layer to Serverless PostgreSQL (Neon) with Prisma ORM `v6.4.1`. All 16 entity tables, composite unique indexes, relations, and enums are defined in `prisma/schema.prisma`. Controllers utilize type-safe PrismaClient queries and Prisma Studio visual UI.
- **Status:** Implemented in `prisma/schema.prisma`, `src/db/prisma.js`, and verified across all controllers.

### ADR-008: Cryptographic HMAC Payment Signatures & In-App Double-Entry Wallet Ledger
- **Context:** Reliance solely on client-side checkout responses leaves payment states vulnerable to forgery/tampering. Additionally, standard bank gateway refunds take 5–7 days, causing poor customer experience upon pre-cooking cancellations.
- **Decision:** All Razorpay payments require HMAC-SHA256 constant-time signature verification (`crypto.timingSafeEqual`). Server-to-server Webhooks (`payment.captured`, `payment.failed`, `refund.processed`) provide network-failure resilience. An In-App Digital Wallet (`Wallet` & `WalletTransaction` ledger) enables instantaneous 1-tap checkouts and sub-second auto-refunds upon order cancellation.
- **Status:** Implemented in `src/services/payment.services.js`, `src/services/wallet.services.js`, `src/controllers/payment.controllers.js`, `src/controllers/wallet.controllers.js`.

---

## 5. API Route Status & Endpoints Inventory

```
Implemented & Verified:
  [POST]   /api/auth/user/register       -> User registration
  [POST]   /api/auth/user/login          -> User login
  [POST]   /api/auth/user/logout         -> Clear user session & cookie
  [POST]   /api/auth/foodpartner/register-> Restaurant partner signup
  [POST]   /api/auth/foodpartner/login   -> Partner login
  [POST]   /api/auth/foodpartner/logout  -> Clear partner session
  [POST]   /api/auth/delivery/register   -> Delivery rider signup
  [POST]   /api/auth/delivery/login      -> Delivery rider login
  [POST]   /api/auth/delivery/logout     -> Clear rider session
  [POST]   /api/auth/refresh             -> Universal dual JWT refresh token rotation
  [GET]    /api/auth/me                  -> Authenticated profile inspection

  [POST]   /api/food/                    -> Upload video reel & create food item with variants (Partner only)
  [GET]    /api/food/                    -> Fetch food items with search & category filter
  [GET]    /api/food/:id                 -> Single food item details with restaurant profile
  [PUT]    /api/food/:id                 -> Update food item (Partner owner only)
  [PATCH]  /api/food/:id/availability    -> Toggle dish stock availability (Partner owner only)
  [DELETE] /api/food/:id                 -> Delete dish & purge video from Cloudinary (Partner owner only)

  [GET]    /api/feed                     -> Cursor-paginated Reels Video Stream (?cursor=&limit=&sort=&lat=&lng=)
  [POST]   /api/feed/:id/view            -> Record reel video view

  [POST]   /api/food/:id/like            -> Toggle like on food reel (idempotent, atomic $inc)
  [POST]   /api/food/:id/save            -> Bookmark reel to wishlist/collection
  [POST]   /api/food/:id/comments        -> Post comment or nested reply on food reel
  [GET]    /api/food/:id/comments        -> Paginated comments list for food reel
  [GET]    /api/users/me/likes           -> List all food reels liked by current user
  [GET]    /api/users/me/saved           -> List all food reels saved by current user

  [POST]   /api/users/addresses          -> Save delivery address (Home/Work/Other)
  [GET]    /api/users/addresses          -> List saved delivery addresses
  [DELETE] /api/users/addresses/:id      -> Delete saved address
  [PUT]    /api/users/addresses/:id/default -> Set default delivery address

  [GET]    /api/cart                     -> Get current user cart with live pricing and itemized breakdown
  [POST]   /api/cart/add                 -> Add item/variant/addons to cart with single-restaurant lock
  [PUT]    /api/cart/items/:itemId       -> Update item quantity in cart (0 to remove)
  [DELETE] /api/cart/items/:itemId       -> Remove item from cart
  [DELETE] /api/cart                     -> Clear entire cart
  [POST]   /api/cart/coupon              -> Apply discount coupon (percentage / flat)
  [DELETE] /api/cart/coupon              -> Remove applied coupon
  [PUT]    /api/cart/instructions        -> Update delivery instruction pills & tip amount

  [POST]   /api/orders                   -> Create order from cart, snapshot pricing, generate crypto OTP
  [GET]    /api/orders                   -> Paginated customer order history (sorted newest first)
  [GET]    /api/orders/:id               -> Detailed order view with 7-stage audit timeline
  [POST]   /api/orders/:id/cancel        -> Customer cancellation (auto-refunds to Wallet if paid)
  [GET]    /api/orders/:id/track         -> Real-time order tracking (rider GPS, restaurant, timeline)
  [GET]    /api/orders/partner/orders    -> Partner kitchen incoming and active orders queue
  [PUT]    /api/orders/:id/confirm       -> Partner confirms order with estimated prep time
  [PUT]    /api/orders/:id/preparing     -> Partner marks cooking in progress
  [PUT]    /api/orders/:id/ready         -> Partner marks food packed (READY_FOR_PICKUP)
  [PUT]    /api/orders/:id/partner-cancel-> Partner cancels order (auto-refunds to Wallet if paid)
  [GET]    /api/orders/rider/available   -> Query open ready orders for delivery dispatch
  [POST]   /api/orders/:id/accept-delivery -> Rider claims/accepts delivery assignment
  [PUT]    /api/orders/:id/pickup        -> Rider picks up food from restaurant
  [PUT]    /api/orders/:id/out-for-delivery -> Rider marks transit to customer
  [PUT]    /api/orders/:id/deliver       -> Rider verifies 4-digit OTP & completes delivery
  [PUT]    /api/orders/:id/delivery-failed -> Rider marks delivery failed with reason
  [GET]    /api/orders/admin/all         -> Global order stream for admin panel

  [POST]   /api/payment/create-order     -> Generate Razorpay order (paise conversion)
  [POST]   /api/payment/verify           -> Verify Razorpay HMAC-SHA256 signature
  [POST]   /api/payment/webhook          -> Razorpay asynchronous webhook processor
  [POST]   /api/payment/wallet-pay       -> 1-tap checkout via In-App Digital Wallet
  [GET]    /api/wallet                   -> View user wallet balance & transaction ledger
  [POST]   /api/wallet/topup/create-order-> Generate Razorpay top-up order
  [POST]   /api/wallet/topup/verify      -> Verify signature & credit wallet balance

### ADR-009: Real-Time Event Bus with Socket.io & JWT Handshake Authentication
- **Context:** Mobile clients require instant notifications (<50ms) for order lifecycle transitions, kitchen sound alerts, live rider GPS map tracking, and video reels social interactions without battery-draining HTTP polling.
- **Decision:** Built a centralized WebSocket hub using `Socket.io` mounted on the Node.js HTTP server. Connection handshakes require valid JWT authentication via `io.use()`. Sockets are automatically assigned to role-isolated rooms (`user:<id>`, `partner:<id>`, `delivery:<id>`, `riders:online`, `order:<id>`, `food:<id>`). Decoupled emitter helpers (`emitToUser`, `emitToPartner`, `emitToOrder`, etc.) allow standard REST controllers to fire real-time broadcasts synchronously.
- **Status:** Implemented in `src/services/socket.services.js`, `server.js`, `src/controllers/order.controllers.js`, `src/controllers/social.controllers.js`, `src/controllers/delivery.controllers.js`.

---

## 5. API Route Status & Endpoints Inventory

```
Implemented & Verified:
  [POST]   /api/auth/user/register       -> User registration
  [POST]   /api/auth/user/login          -> User login
  [POST]   /api/auth/user/logout         -> Clear user session & cookie
  [POST]   /api/auth/foodpartner/register-> Restaurant partner signup
  [POST]   /api/auth/foodpartner/login   -> Partner login
  [POST]   /api/auth/foodpartner/logout  -> Clear partner session
  [POST]   /api/auth/delivery/register   -> Delivery rider signup
  [POST]   /api/auth/delivery/login      -> Delivery rider login
  [POST]   /api/auth/delivery/logout     -> Clear rider session
  [POST]   /api/auth/refresh             -> Universal dual JWT refresh token rotation
  [GET]    /api/auth/me                  -> Authenticated profile inspection

  [POST]   /api/food/                    -> Upload video reel & create food item with variants (Partner only)
  [GET]    /api/food/                    -> Fetch food items with search & category filter
  [GET]    /api/food/:id                 -> Single food item details with restaurant profile
  [PUT]    /api/food/:id                 -> Update food item (Partner owner only)
  [PATCH]  /api/food/:id/availability    -> Toggle dish stock availability (Partner owner only)
  [DELETE] /api/food/:id                 -> Delete dish & purge video from Cloudinary (Partner owner only)

  [GET]    /api/feed                     -> Cursor-paginated Reels Video Stream (?cursor=&limit=&sort=&lat=&lng=)
  [POST]   /api/feed/:id/view            -> Record reel video view

  [POST]   /api/food/:id/like            -> Toggle like on food reel (real-time broadcast)
  [POST]   /api/food/:id/save            -> Bookmark reel to wishlist/collection
  [POST]   /api/food/:id/comments        -> Post comment or nested reply (real-time broadcast)
  [GET]    /api/food/:id/comments        -> Paginated comments list for food reel
  [GET]    /api/users/me/likes           -> List all food reels liked by current user
  [GET]    /api/users/me/saved           -> List all food reels saved by current user

  [POST]   /api/users/addresses          -> Save delivery address (Home/Work/Other)
  [GET]    /api/users/addresses          -> List saved delivery addresses
  [DELETE] /api/users/addresses/:id      -> Delete saved address
  [PUT]    /api/users/addresses/:id/default -> Set default delivery address

  [GET]    /api/cart                     -> Get current user cart with live pricing and itemized breakdown
  [POST]   /api/cart/add                 -> Add item/variant/addons to cart with single-restaurant lock
  [PUT]    /api/cart/items/:itemId       -> Update item quantity in cart (0 to remove)
  [DELETE] /api/cart/items/:itemId       -> Remove item from cart
  [DELETE] /api/cart                     -> Clear entire cart
  [POST]   /api/cart/coupon              -> Apply discount coupon (percentage / flat)
  [DELETE] /api/cart/coupon              -> Remove applied coupon
  [PUT]    /api/cart/instructions        -> Update delivery instruction pills & tip amount

  [POST]   /api/orders                   -> Create order from cart, snapshot pricing, generate crypto OTP (emits order:new)
  [GET]    /api/orders                   -> Paginated customer order history (sorted newest first)
  [GET]    /api/orders/:id               -> Detailed order view with 7-stage audit timeline
  [POST]   /api/orders/:id/cancel        -> Customer cancellation (auto-refunds to Wallet + emits order:cancelled)
  [GET]    /api/orders/:id/track         -> Real-time order tracking (rider GPS, restaurant, timeline)
  [GET]    /api/orders/partner/orders    -> Partner kitchen incoming and active orders queue
  [PUT]    /api/orders/:id/confirm       -> Partner confirms order with prep time (emits order:status_update)
  [PUT]    /api/orders/:id/preparing     -> Partner marks cooking in progress (emits order:status_update)
  [PUT]    /api/orders/:id/ready         -> Partner marks food packed (emits order:status_update + dispatch broadcast)
  [PUT]    /api/orders/:id/partner-cancel-> Partner cancels order (auto-refunds to Wallet + emits order:cancelled)
  [GET]    /api/orders/rider/available   -> Query open ready orders for delivery dispatch
  [POST]   /api/orders/:id/accept-delivery -> Rider claims/accepts delivery assignment (emits delivery:assigned)
  [PUT]    /api/orders/:id/pickup        -> Rider picks up food from restaurant (emits order:status_update)
  [PUT]    /api/orders/:id/out-for-delivery -> Rider marks transit to customer (emits order:status_update)
  [PUT]    /api/orders/:id/deliver       -> Rider verifies 4-digit OTP & completes delivery (emits DELIVERED)
  [PUT]    /api/orders/:id/delivery-failed -> Rider marks delivery failed with reason
  [GET]    /api/orders/admin/all         -> Global order stream for admin panel

  [POST]   /api/payment/create-order     -> Generate Razorpay order (paise conversion)
  [POST]   /api/payment/verify           -> Verify Razorpay HMAC-SHA256 signature
  [POST]   /api/payment/webhook          -> Razorpay asynchronous webhook processor
  [POST]   /api/payment/wallet-pay       -> 1-tap checkout via In-App Digital Wallet
  [GET]    /api/wallet                   -> View user wallet balance & transaction ledger
  [POST]   /api/wallet/topup/create-order-> Generate Razorpay top-up order
  [POST]   /api/wallet/topup/verify      -> Verify signature & credit wallet balance

  [PUT]    /api/delivery/location        -> Rider updates real-time GPS (emits order:location_update)
  [PUT]    /api/delivery/toggle-online   -> Rider toggles availability status (ONLINE / OFFLINE)
  [GET]    /api/delivery/profile         -> Rider profile and active delivery order details

WebSocket Channels (Socket.io):
  - user:<userId>                        -> Direct alerts to customer
  - partner:<partnerId>                  -> Kitchen order display ding & cancellation alerts
  - delivery:<riderId>                   -> Rider assignment alerts
  - riders:online                        -> Broadcast channel for open delivery dispatch
  - order:<orderId>                      -> Real-time tracking room (status, timeline, GPS updates)
  - food:<foodId>                        -> Real-time reels social room (live likes & comments)
```

---

## 6. Session Checkpoint & Next Steps

### What We Completed:
1. **Sprint 1 (Auth & RBAC):** Dual JWT with token reuse revocation, Bcrypt refresh token database hashing, RBAC middlewares, and multi-role models.
2. **Sprint 2 (Media & Discovery Feed):** Food model with variants & add-ons, Cloudinary poster generation, cursor-based video discovery feed, and social interactions.
3. **Sprint 3 (Cart & Pricing Engine):** Single-restaurant lock, coupon discount calculator, itemized bills (GST, delivery fee, platform fee, rider tip).
4. **Sprint 4 / Phase 7 (Order FSM & Lifecycle):** Finite state machine with role-based transitions, 4-digit Delivery OTP, address book system, and full lifecycle endpoints.
5. **Phase 8 (Razorpay Payments & Wallet Ledger):** Razorpay order creation in paise, cryptographic HMAC-SHA256 signature verification, server-to-server webhooks, in-app double-entry digital wallet ledger, 1-tap wallet checkout, and instant cancellation refunds.
6. **Phase 10 (Real-Time Event Architecture - Socket.io):** Socket.io WebSocket server, JWT handshake authentication, dynamic room routing (`user`, `partner`, `delivery`, `order`, `food`), live GPS location streaming (`order:location_update`), kitchen alerts (`order:new`), and live reel social stream (`food:like_update`, `food:comment_new`).

### Next Starting Point:
👉 **Phase 9: Maps & Geospatial Routing** or **Frontend Workspace Setup (Next.js 16 + shadcn/ui)**
- Haversine distance, travel ETA, dynamic delivery fee calculation, and geocoding.
- Frontend: Next.js 16 App Router with mobile-first vertical reels stream and 1-tap checkout drawers.

