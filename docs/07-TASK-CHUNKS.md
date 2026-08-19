# 📋 Actionable Task Chunks — Insta-Zomato

> **Document:** 07-TASK-CHUNKS.md  
> **Purpose:** Granular, self-contained engineering tasks with clear input/output contracts for rapid, error-free execution.  
> **Status:** Sprints 1, 2, 3 Completed ✅ | Sprint 4 (Order FSM & Razorpay) is Next 🚀  

---

## ✅ Sprint 1: Auth Hardening, Refresh Tokens & RBAC *(Completed)*

### 🔹 Task Chunk 1.1: Dual JWT & Refresh Token Rotation `[COMPLETED]`
- **Files Involved:**
  - `[MODIFIED]` `backend/src/models/user.models.js`
  - `[MODIFIED]` `backend/src/models/foodpartner.models.js`
  - `[CREATED]` `backend/src/models/deliverypartner.models.js`
  - `[MODIFIED]` `backend/src/controllers/auth.controllers.js`
  - `[MODIFIED]` `backend/src/routes/auth.routes.js`
- **Delivered:**
  - Added `refreshToken` (hashed with bcrypt) to User, FoodPartner, and DeliveryPartner models.
  - On login: Generate Access Token (15m expiration) and Refresh Token (7d expiration).
  - Store Refresh Token in DB and set as HTTP-only cookie `refreshToken`.
  - Implemented `POST /api/auth/refresh`: Validate refresh token cookie, verify against DB hash, detect reuse attacks, and issue new Access Token.
  - Implemented `POST /api/auth/logout`: Clear cookie and delete refresh token from DB.

### 🔹 Task Chunk 1.2: Role-Based Access Control (RBAC) Middlewares `[COMPLETED]`
- **Files Involved:**
  - `[MODIFIED]` `backend/src/middlewares/auth.middlewares.js`
- **Delivered:**
  - Created middlewares: `requireAuth` (verifies access token), `requireCustomer`, `requireFoodPartner`, `requireDeliveryPartner`, `requireAdmin`.
  - Attach decoded user object and role to `req.user` / `req.customer` / `req.foodPartner` / `req.deliveryPartner`.

---

## ✅ Sprint 2: Culinary Catalog & Video Reels Discovery Engine *(Completed)*

### 🔹 Task Chunk 2.1: Model Schema Expansion & Media Ingestion `[COMPLETED]`
- **Files Involved:**
  - `[MODIFIED]` `backend/src/models/food.models.js`
  - `[MODIFIED]` `backend/src/services/storage.services.js`
  - `[MODIFIED]` `backend/src/controllers/food.controllers.js`
  - `[MODIFIED]` `backend/src/routes/food.routes.js`
- **Delivered:**
  - Added fields to `food.models.js`: `thumbnailUrl`, `isVeg`, `spiceLevel`, `preparationTime`, `discountedPrice`, `variants: [{ name, price }]`, `addOns: [{ name, price }]`, `likeCount`, `saveCount`, `commentCount`, `viewCount`, `isAvailable`.
  - Updated `storage.services.js` to automatically extract 0.5s WebP poster thumbnails and stream responsive videos from Cloudinary.

### 🔹 Task Chunk 2.2: Cursor-Based Reels Feed API `[COMPLETED]`
- **Files Involved:**
  - `[CREATED]` `backend/src/controllers/feed.controllers.js`
  - `[CREATED]` `backend/src/routes/feed.routes.js`
- **Delivered:**
  - Implemented `GET /api/feed?cursor=<lastId>&limit=10&sort=for_you|trending|latest&lat=&lng=`.
  - Ultra-fast `_id < cursor` pagination with proximity calculations (Haversine formula in km).
  - Populates restaurant name, logo, distance, and batch-hydrates current user's like/save status.
  - Implemented `POST /api/feed/:id/view` for atomic view count recording.

### 🔹 Task Chunk 2.3: Social Engagement (Likes, Saves, Comments) `[COMPLETED]`
- **Files Involved:**
  - `[CREATED]` `backend/src/models/like.models.js`
  - `[CREATED]` `backend/src/models/save.models.js`
  - `[CREATED]` `backend/src/models/comment.models.js`
  - `[CREATED]` `backend/src/controllers/social.controllers.js`
  - `[CREATED]` `backend/src/routes/user.routes.js`
- **Delivered:**
  - `POST /api/food/:id/like`: Idempotent toggle like with atomic `$inc`.
  - `POST /api/food/:id/save`: Bookmark reel to user collection/wishlist.
  - `POST /api/food/:id/comments`: Add comment or nested reply.
  - `GET /api/food/:id/comments`: Paginated comment list.
  - `GET /api/users/me/likes` & `GET /api/users/me/saved`: User interaction history.

---

## ✅ Sprint 3: Single-Restaurant Cart & Dynamic Pricing *(Completed)*

### 🔹 Task Chunk 3.1: Cart Engine & Single-Restaurant Lock `[COMPLETED]`
- **Files Involved:**
  - `[CREATED]` `backend/src/models/cart.models.js`
  - `[CREATED]` `backend/src/models/coupon.models.js`
  - `[CREATED]` `backend/src/validators/cart.validators.js`
  - `[CREATED]` `backend/src/controllers/cart.controllers.js`
  - `[CREATED]` `backend/src/routes/cart.routes.js`
- **Delivered:**
  - Implemented `GET /api/cart`, `POST /api/cart/add`, `PUT /api/cart/items/:itemId`, `DELETE /api/cart/items/:itemId`, `DELETE /api/cart`.
  - Flipkart-style portion variants (`selectedVariant`) and custom toppings (`selectedAddOns`).
  - Enforced Single-Restaurant Rule: Returns `HTTP 409 Conflict` asking for confirmation or accepts `forceClear=true`.
  - Server-side price recalculation (Subtotal, ₹30 Delivery, ₹5 Platform Fee, 5% GST, Rider Tip).
  - Coupon discount engine (`POST /api/cart/coupon` & `DELETE /api/cart/coupon`).
  - Delivery instruction pills & tip updater (`PUT /api/cart/instructions`).

---

## 🚀 Sprint 4: Order FSM, Delivery OTP & Razorpay Payments *(START HERE TOMORROW)*

### 🔹 Task Chunk 4.1: Order Finite State Machine
- **Files Involved:**
  - `[NEW]` `backend/src/models/order.models.js`
  - `[NEW]` `backend/src/controllers/order.controllers.js`
  - `[NEW]` `backend/src/routes/order.routes.js`
- **Specification:**
  - Implement `POST /api/orders`: Converts cart items into an active Order, creates 4-digit crypto Delivery OTP, and sets status to `PENDING`.
  - Store delivery snapshot (items, pricing, instructions, recipient address, restaurant location).
  - Implement status update handlers:
    - Partner: `PUT /api/orders/:id/confirm`, `PUT /api/orders/:id/ready`
    - Rider: `PUT /api/orders/:id/pickup`, `PUT /api/orders/:id/deliver` (Validates OTP)
    - Customer: `POST /api/orders/:id/cancel`
- **Acceptance Criteria:** Attempting to transition directly from `CONFIRMED` to `DELIVERED` without pickup or OTP fails with `400 Bad Request`.

### 🔹 Task Chunk 4.2: Razorpay Payment & Webhook Verification
- **Files Involved:**
  - `[NEW]` `backend/src/services/payment.services.js`
  - `[NEW]` `backend/src/controllers/payment.controllers.js`
  - `[NEW]` `backend/src/routes/payment.routes.js`
- **Specification:**
  - `POST /api/payment/create-order`: Generates Razorpay Order ID with exact subtotal + taxes + delivery fee.
  - `POST /api/payment/verify`: Verifies HMAC-SHA256 signature (`razorpay_order_id|razorpay_payment_id`).
  - `POST /api/payment/webhook`: Asynchronous webhook handler for payment capture and refund events.
- **Acceptance Criteria:** Tampered signature fails verification and flags order payment as failed.

---

## 🚀 Sprint 5: Real-Time Event Hub (Socket.io) & Live Tracking

### 🔹 Task Chunk 5.1: Socket.io Architecture & Room Topology
- **Files Involved:**
  - `[NEW]` `backend/src/socket/index.js`
  - `[NEW]` `backend/src/socket/events.js`
  - `[MODIFY]` `backend/server.js`
- **Specification:**
  - Mount Socket.io on Express HTTP server with JWT handshake authentication.
  - Create room topology: `order:<orderId>`, `partner:<partnerId>`, `rider:<riderId>`, `customer:<customerId>`.
  - Emit real-time events: `order:status_changed`, `kitchen:new_order`, `rider:location_update`.

---

## 🚀 Sprint 6: Next.js 16 + shadcn/ui Frontend (Tri-Hybrid Experience)

### 🔹 Task Chunk 6.1: Next.js 16 Workspace Setup & Design Tokens
- **Files Involved:**
  - `[NEW]` `frontend/` (Next.js 16 App Router, Tailwind CSS, shadcn/ui primitives)
- **Specification:**
  - Initialize workspace with Dark-mode glassmorphic theme tokens.
  - Install shadcn/ui components (`Drawer` / `Sheet` via Vaul, `Button`, `Badge`, `Progress`, `Accordion`, `Sonner`, `Tabs`).
  - Configure Zustand stores for Cart & Auth.
