# 🍕 Insta-Zomato — Backend TODO
> Full-featured food delivery + reels app. Check off as you build.
> Stack: Node.js v22 · Express v5 · MongoDB · Redis · Socket.io · Cloudinary · Razorpay

---

## 📦 PHASE 1 — Project Setup & Security Foundation

### 1.1 Core Middleware
- [ ] Add `helmet` — security headers (XSS, CSP, HSTS, etc.)
- [ ] Add `cors` with origin whitelist from `.env`
- [ ] Add `morgan` — HTTP request logging
- [ ] Add `compression` — gzip responses
- [ ] Add `express.json({ limit: '10mb' })` and `express.urlencoded()`
- [ ] Create global error handler middleware `src/middlewares/error.middleware.js`
- [ ] Create `ApiError.js` and `ApiResponse.js` utility classes
- [ ] Create `asyncHandler.js` wrapper (no try/catch in every controller)

### 1.2 Rate Limiting
- [ ] Install `express-rate-limit`
- [ ] Global limiter — 100 req / 15 min per IP
- [ ] Auth limiter — 10 req / 15 min (login, register, forgot-password)
- [ ] Upload limiter — 5 req / hour (video/image uploads)
- [ ] Order limiter — 20 req / min per user
- [ ] Attach limiters in `app.js` per route group

### 1.3 Input Validation & Sanitization
- [ ] Install `express-validator`
- [ ] Install `express-mongo-sanitize` — prevent NoSQL injection
- [ ] Install `xss-clean` — sanitize input against XSS
- [ ] Create `src/validators/auth.validators.js`
- [ ] Create `src/validators/food.validators.js`
- [ ] Create `src/validators/order.validators.js`
- [ ] Create `src/validators/user.validators.js`
- [ ] Create `src/validators/address.validators.js`
- [ ] Create shared `validate.middleware.js` to run validator chains

### 1.4 Environment Config
- [ ] Install `zod` or `joi` — validate all `.env` variables on startup, crash if missing
- [ ] Add to `.env`: `NODE_ENV`, `PORT`, `MONGO_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `REDIS_URL`, `CLOUDINARY_*`, `RAZORPAY_*`, `SMTP_*`, `GOOGLE_MAPS_API_KEY`
- [ ] Create `src/config/index.js` — centralized config object (no `process.env` scattered everywhere)

### 1.5 Logging
- [ ] Install `winston` + `winston-daily-rotate-file`
- [ ] Create `src/config/logger.js` — info, warn, error levels
- [ ] Log to console (dev) and rotating files (prod)
- [ ] Log all unhandled promise rejections and uncaught exceptions in `server.js`

--- Done Phase 1, 10.03.26 

## 🔐 PHASE 2 — Authentication & Authorization

### 2.1 JWT — Refresh Token System
- [x] Add `refreshToken` (hashed) field to `user.models.js` and `foodpartner.models.js` and `deliverypartner.models.js`
- [x] On login: generate accessToken (15m) + refreshToken (7d), store hashed refresh in DB
- [x] `POST /api/auth/refresh` — validate refresh token → issue new access token
- [x] `POST /api/auth/logout` — clear both cookies + delete refresh token from DB
- [x] HTTP-only, Secure, SameSite=Strict on all auth cookies

### 2.2 User Auth Endpoints
- [x] `POST /api/auth/user/register` — register with name, email, password, phone
- [x] `POST /api/auth/user/login`
- [x] `POST /api/auth/user/logout`
- [x] `POST /api/auth/refresh`
- [ ] `POST /api/auth/forgot-password` — send reset email with signed token
- [ ] `POST /api/auth/reset-password/:token` — validate token, update password
- [ ] `POST /api/auth/verify-email/:token` — verify email on register
- [ ] `POST /api/auth/resend-verification` — resend verification email

### 2.3 Food Partner Auth
- [x] `POST /api/auth/foodpartner/register` — name, email, password, phone, restaurantName, FSSAI license number
- [x] `POST /api/auth/foodpartner/login`
- [x] `POST /api/auth/foodpartner/logout`
- [ ] Admin approval flow — partner is `isPending` until admin approves

### 2.4 Delivery Partner Auth
- [x] `POST /api/auth/delivery/register` — name, email, phone, vehicleType, vehicleNumber, drivingLicense
- [x] `POST /api/auth/delivery/login`
- [x] `POST /api/auth/delivery/logout`
- [ ] Admin approval required before they can accept orders

### 2.5 OAuth (Optional but impressive)
- [ ] Install `passport` + `passport-google-oauth20`
- [ ] `GET /api/auth/google` — redirect to Google
- [ ] `GET /api/auth/google/callback` — handle OAuth callback
- [ ] Link OAuth to existing account if email matches

### 2.6 Role-Based Access Control (RBAC)
- [x] Middleware: `requireAuth` — verify access token
- [x] Middleware: `requireCustomer` / `requireUser` — only users
- [x] Middleware: `requireFoodPartner` — only food partners
- [x] Middleware: `requireDeliveryPartner` — only delivery partners
- [x] Middleware: `requireAdmin` — only admin
- [ ] Middleware: `requireOwner(model)` — must own the resource

---

## 👤 PHASE 3 — User Profile & Preferences

### 3.1 User Profile
- [ ] `GET /api/users/me` — get own full profile
- [ ] `PUT /api/users/me` — update name, phone, preferences
- [ ] `PUT /api/users/me/avatar` — upload profile picture to Cloudinary
- [ ] `DELETE /api/users/me` — soft delete account
- [ ] `GET /api/users/:id` — public profile (name, avatar, saved reels count)

### 3.2 Address Book
- [ ] Address model: `{ user, label (Home/Work/Other), street, city, state, pincode, landmark, coordinates: { lat, lng }, isDefault }`
- [ ] `POST /api/users/addresses` — add new address (reverse geocode via Google Maps)
- [ ] `GET /api/users/addresses` — list all addresses
- [ ] `PUT /api/users/addresses/:id` — update address
- [ ] `DELETE /api/users/addresses/:id` — delete address
- [ ] `PUT /api/users/addresses/:id/default` — set as default

### 3.3 User Preferences
- [ ] Add to user model: `preferences { isVeg, spiceLevel, cuisine[], allergies[] }`
- [ ] `PUT /api/users/me/preferences` — update food preferences
- [ ] Use preferences to personalize feed ranking

---

## 🍔 PHASE 4 — Food Partner & Restaurant

### 4.1 Partner Profile
- [x] FoodPartner model fields: `{ name, email, phone, restaurantName, description, logo, coverImage, FSSAI, cuisine[], address, coordinates, openingHours: { mon: { open, close }, ... }, isOpen, avgRating, totalOrders, isApproved, isActive }`
- [ ] `GET /api/partners/:id` — public restaurant profile
- [ ] `PUT /api/partners/me` — update restaurant details
- [ ] `PUT /api/partners/me/logo` — upload logo
- [ ] `PUT /api/partners/me/cover` — upload cover image
- [ ] `PUT /api/partners/me/hours` — set opening hours per day
- [ ] `PUT /api/partners/me/toggle-open` — manually toggle open/closed
- [ ] `GET /api/partners/me/analytics` — views, orders, revenue, top items

### 4.2 Menu / Food Items
- [x] Food model fields: `{ partner, title, description, price, discountedPrice, category, tags[], thumbnailUrl, videoUrl, cloudinaryPublicId, isVeg, isAvailable, spiceLevel, preparationTime, calories, variants[], addOns[], likeCount, viewCount, orderCount, ratings: { avg, count } }`
- [x] `POST /api/food` — create food item (video reel upload to Cloudinary with auto-poster extraction)
- [x] `GET /api/food/:id` — single food item detail
- [x] `PUT /api/food/:id` — update food item (partner only, owns it)
- [x] `DELETE /api/food/:id` — delete food item + purge from Cloudinary
- [x] `PATCH /api/food/:id/availability` — mark unavailable without deleting
- [ ] `GET /api/partners/:id/menu` — all food items of a restaurant (grouped by category)
- [ ] `GET /api/partners/me/foods` — partner's own food items management view

### 4.3 Categories
- [ ] Category model: `{ name, slug, icon, image, isActive }`
- [ ] Pre-seed categories: Pizza, Burgers, Biryani, Chinese, Desserts, Beverages, etc.
- [ ] `GET /api/categories` — list all categories
- [ ] Admin: `POST /api/admin/categories` — create category
- [ ] Admin: `PUT /api/admin/categories/:id` — update
- [ ] Admin: `DELETE /api/admin/categories/:id` — delete

---

## 🎬 PHASE 5 — Reels / Feed System

### 5.1 Feed
- [x] `GET /api/feed` — main reel feed (cursor-based pagination)
  - [x] Query params: `?cursor=<lastId>&limit=10&sort=latest|trending|nearby`
  - [x] Response: `{ data: [], nextCursor, hasMore }`
  - [x] Populate: partner info, like count, is liked by me, is saved by me, comment count
  - [x] Filter out unavailable/deleted items
- [x] `GET /api/feed` with proximity — distance in km calculated based on user coordinates `?lat=&lng=`
- [x] Increment `viewCount` on food item when reel is viewed (`POST /api/feed/:id/view`)

### 5.2 Likes
- [x] Like model: `{ user, food, createdAt }` — unique index on `(user, food)`
- [x] `POST /api/food/:id/like` — toggle like (idempotent, atomic `$inc`)
- [ ] `GET /api/food/:id/likes` — list users who liked (paginated)
- [x] `GET /api/users/me/likes` — all food items I've liked

### 5.3 Save / Bookmark
- [x] Save model: `{ user, food, collection, createdAt }` — unique index on `(user, food)`
- [x] `POST /api/food/:id/save` — toggle save
- [x] `GET /api/users/me/saved` — all saved reels (paginated)
- [ ] Collections (optional): `POST /api/users/me/collections` — create named collection (like "Weekend cravings")
- [ ] `POST /api/food/:id/save?collection=<id>` — save to specific collection

### 5.4 Comments
- [x] Comment model: `{ user, food, text, parentComment (for replies), likeCount, isDeleted, createdAt }`
- [x] `POST /api/food/:id/comments` — add comment or reply
- [x] `GET /api/food/:id/comments` — paginated top-level comments
- [ ] `GET /api/food/:id/comments/:commentId/replies` — replies to a comment
- [ ] `PUT /api/food/:id/comments/:commentId` — edit own comment
- [ ] `DELETE /api/food/:id/comments/:commentId` — soft delete own comment
- [ ] `POST /api/food/:id/comments/:commentId/like` — like a comment

### 5.5 Ratings
- [ ] Rating model: `{ user, food, partner, order, stars (1-5), review, images[], createdAt }` — can only rate after ordering
- [ ] `POST /api/orders/:orderId/rate` — submit rating (verify order delivered and belongs to user)
- [ ] `GET /api/food/:id/ratings` — ratings for a food item
- [ ] `GET /api/partners/:id/ratings` — ratings for a restaurant
- [ ] Auto-update `food.ratings.avg` and `partner.avgRating` using aggregation

---

## 🛒 PHASE 6 — Cart System

### 6.1 Cart Model
- [x] Cart model: `{ user, partner, items: [{ food, name, thumbnailUrl, isVeg, selectedVariant, selectedAddOns, unitPrice, quantity, itemTotal }], deliveryInstructions[], tipAmount, appliedCoupon, pricing: { subtotal, deliveryFee, platformFee, taxes, discountAmount, grandTotal } }`
- [x] One cart per user (upsert pattern)
- [x] Enforce single-restaurant rule (409 Conflict if adding from different partner, optional forceClear)

### 6.2 Cart Endpoints
- [x] `GET /api/cart` — get cart with computed totals and fresh prices
- [x] `POST /api/cart/add` — add item with variants, add-ons, and single-restaurant lock
- [x] `PUT /api/cart/items/:itemId` — update quantity (0 = remove)
- [x] `DELETE /api/cart/items/:itemId` — remove item
- [x] `DELETE /api/cart` — clear entire cart
- [x] `POST /api/cart/coupon` — validate and apply coupon code (percentage / flat with maxDiscount & minOrderValue)
- [x] `DELETE /api/cart/coupon` — remove coupon
- [x] `PUT /api/cart/instructions` — update delivery instructions pills and rider tip
- [x] Dynamic pricing: recalculates GST (5%), delivery fee (₹30), platform fee (₹5), discount, and grand total

---

## 📋 PHASE 7 — Order System *(Completed)*

### 7.1 Order Model
- [x] Order model: `{ user, partner, deliveryPartner, items: [...snapshot], deliveryAddress, restaurantSnapshot, status, paymentStatus, paymentMethod, pricing, deliveryOtp, timeline: [{ status, timestamp, note, actorRole }], cancellation, estimatedDeliveryTime, actualDeliveryTime, createdAt }`
- [x] Status enum: `PENDING → CONFIRMED → PREPARING → READY_FOR_PICKUP → PICKED_UP → OUT_FOR_DELIVERY → DELIVERED → CANCELLED → FAILED`

### 7.2 Order Endpoints (User)
- [x] `POST /api/orders` — place order from cart (snapshots items, pricing, delivery address, creates hashed OTP, clears cart)
- [x] `GET /api/orders` — order history (paginated, most recent first)
- [x] `GET /api/orders/:id` — order detail with full timeline
- [x] `POST /api/orders/:id/cancel` — cancel (only if `pending` or `confirmed`)
- [ ] `POST /api/orders/:id/rate` — submit rating after delivery (Phase 5 / 11)
- [x] `GET /api/orders/:id/track` — live tracking data (partner & delivery partner coordinates, address, status timeline)

### 7.3 Order Endpoints (Food Partner)
- [x] `GET /api/orders/partner/orders` — incoming orders (filter by status, paginated)
- [x] `PUT /api/orders/:id/confirm` — confirm order, set prep time
- [x] `PUT /api/orders/:id/preparing` — mark cooking in progress
- [x] `PUT /api/orders/:id/ready` — mark ready for pickup
- [x] `PUT /api/orders/:id/partner-cancel` — cancel with mandatory reason

### 7.4 Order Endpoints (Delivery Partner)
- [x] `GET /api/orders/rider/available` — nearby ready-for-pickup orders
- [x] `POST /api/orders/:id/accept-delivery` — accept delivery assignment
- [x] `PUT /api/orders/:id/pickup` — mark picked up from restaurant
- [x] `PUT /api/orders/:id/out-for-delivery` — mark en route to customer
- [x] `PUT /api/orders/:id/deliver` — mark delivered (strictly validates 4-digit cryptographic OTP from user)
- [x] `PUT /api/orders/:id/delivery-failed` — failed delivery with reason

### 7.5 Cryptographic OTP for Delivery Confirmation
- [x] Cryptographically generated 4-digit numeric OTP (1000 - 9999) using `crypto.randomInt`
- [x] Hashed with bcrypt before storage in database
- [x] Returned only to the placing customer, hidden from rider/partner
- [x] Delivery partner must submit matching OTP to conclude delivery and transition order to `DELIVERED`

---

## 💳 PHASE 8 — Payments *(Completed ✅)*

### 8.1 Razorpay Integration
- [x] Install `razorpay`
- [x] `POST /api/payment/create-order` — create Razorpay order, return `orderId` + `amount` in paise
- [x] `POST /api/payment/verify` — verify `razorpay_payment_id`, `razorpay_order_id`, `razorpay_signature`
  - [x] Use HMAC-SHA256 constant-time comparison to verify signature
  - [x] Update order `paymentStatus` to `PAID` & timeline entry
- [x] `POST /api/payment/webhook` — Razorpay webhook for async payment events
  - [x] Validate webhook signature with rawBody buffer
  - [x] Handle: `payment.captured`, `payment.failed`, `refund.processed`

### 8.2 Wallet System
- [x] Wallet model & WalletTransaction ledger model in PostgreSQL (Prisma)
- [x] `GET /api/wallet` — get balance and paginated transaction history
- [x] `POST /api/wallet/topup/create-order` & `verify` — add money via Razorpay
- [x] `POST /api/payment/wallet-pay` — 1-tap checkout with atomic wallet debit
- [x] Auto-refund to wallet on order cancellation by customer or food partner

### 8.3 Coupons & Offers
- [x] Coupon model in PostgreSQL (Prisma)
- [x] `POST /api/cart/coupon` — validate and apply discount
- [x] Dynamic discount calculation (flat / percent with minOrderValue & maxDiscount)


---

## 🗺️ PHASE 9 — Maps & Location

### 9.1 Setup
- [ ] Install `@googlemaps/google-maps-services-js`
- [ ] Create `src/services/maps.service.js`
- [ ] Store `GOOGLE_MAPS_API_KEY` in `.env`

### 9.2 Geocoding
- [ ] `POST /api/location/geocode` — address string → `{ lat, lng }` (used when user types address)
- [ ] `POST /api/location/reverse-geocode` — `{ lat, lng }` → formatted address (used for GPS auto-detect)
- [ ] `POST /api/location/autocomplete` — address autocomplete suggestions (for address search UI)

### 9.3 Nearby Restaurants
- [ ] Add `coordinates: { type: 'Point', coordinates: [lng, lat] }` to FoodPartner model
- [ ] Create 2dsphere index: `foodPartnerSchema.index({ coordinates: '2dsphere' })`
- [ ] `GET /api/partners/nearby?lat=&lng=&radius=5` — MongoDB `$near` query
- [ ] Return distance in km for each restaurant

### 9.4 Delivery Distance & Fee
- [ ] `GET /api/delivery/estimate?from=<partnerId>&to=<addressId>` — estimate delivery time and fee
  - [ ] Use Google Distance Matrix API for road distance and duration
  - [ ] Calculate fee: base fee + per km charge
- [ ] Store delivery fee on cart and order

### 9.5 Delivery Partner Location Tracking
- [ ] DeliveryPartner model: `{ ...auth fields, currentLocation: { type: 'Point', coordinates: [] }, isOnline, vehicleType, vehicleNumber, rating, totalDeliveries }`
- [ ] Create 2dsphere index on `currentLocation`
- [ ] `PUT /api/delivery/location` — delivery partner updates GPS every 5s (called from app)
- [ ] `GET /api/orders/:id/track` — user polls this for live delivery location
  - [ ] Returns: delivery partner location, ETA, current status
- [ ] Find nearest online delivery partner when assigning orders (auto-assign or manual accept)

---

## ⚡ PHASE 10 — Real-Time with Socket.io *(Completed ✅)*

### 10.1 Setup
- [x] Install `socket.io` & `socket.io-client`
- [x] Create `src/services/socket.services.js` — initialize on HTTP server
- [x] Authenticate socket connections with JWT (middleware on `io.use(...)`)
- [x] Organize into rooms: `user:<userId>`, `partner:<partnerId>`, `delivery:<deliveryId>`, `order:<orderId>`, `food:<foodId>`, `riders:online`

### 10.2 Order Real-Time Events
- [x] Emit `order:new` to partner room when user places order
- [x] Emit `order:status_update` to user and order room on every status change (`CONFIRMED`, `PREPARING`, `READY_FOR_PICKUP`, `PICKED_UP`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`)
- [x] Emit `order:location_update` to user and order room when delivery partner streams GPS
- [x] Emit `order:available_for_pickup` to online riders broadcast pool

### 10.3 Partner & Rider Real-Time Events
- [x] Emit `order:new` with sound alert payload to partner kitchen dashboard
- [x] Emit `delivery:assigned` to customer & partner when rider accepts order
- [x] Emit `order:cancelled` with refund details to partner and user rooms

### 10.4 Feed Real-Time Events
- [x] Emit `food:like_update` — broadcast updated like count to everyone viewing that reel
- [x] Emit `food:comment_new` — push new comment object to all viewers of that reel

---

## 🔍 PHASE 11 — Search & Discovery

### 11.1 Search Endpoints
- [ ] Add MongoDB text index on food: `{ title: 'text', description: 'text', tags: 'text' }` with weights
- [ ] `GET /api/search?q=<query>&type=food|restaurant|all` — full-text search
- [ ] `GET /api/search/suggestions?q=<query>` — autocomplete suggestions (debounce on frontend)
- [ ] Log search queries for analytics (what users search for)

### 11.2 Filters
- [ ] `GET /api/food?category=&isVeg=&minPrice=&maxPrice=&spiceLevel=&minRating=&sort=&cursor=&limit=`
- [ ] `GET /api/partners?cuisine=&isOpen=&minRating=&sort=rating|distance|newest&lat=&lng=`
- [ ] Build a reusable filter builder utility in `src/utils/queryBuilder.js`

### 11.3 Trending & Recommendations
- [ ] `GET /api/feed/trending` — most liked + viewed in last 24h (cache in Redis, refresh every 15min)
- [ ] `GET /api/feed/recommended` — personalized based on user's order history + likes + preferences
  - [ ] Simple version: food from categories the user orders most
  - [ ] Advanced: collaborative filtering
- [ ] `GET /api/partners/:id/related` — similar restaurants (same cuisine)

---

## 🔔 PHASE 12 — Notifications

### 12.1 In-App Notifications
- [ ] Notification model: `{ recipient, recipientType, type, title, body, data, isRead, createdAt }`
- [ ] Types: `order_confirmed`, `order_preparing`, `order_out_for_delivery`, `order_delivered`, `order_cancelled`, `new_comment`, `new_like`, `rating_received`, `promo`
- [ ] `GET /api/notifications` — paginated list (unread first)
- [ ] `PUT /api/notifications/:id/read` — mark as read
- [ ] `PUT /api/notifications/read-all` — mark all as read
- [ ] `GET /api/notifications/unread-count` — badge count for UI
- [ ] Trigger notifications from order controllers

### 12.2 Push Notifications
- [ ] Install `firebase-admin`
- [ ] Store `fcmToken` on user/partner/delivery models (updated on each app open)
- [ ] Create `src/services/notification.service.js` — `sendPush(tokens, title, body, data)`
- [ ] Send push on: order status changes, new order for partner, delivery assignment
- [ ] Handle token refresh and invalid token cleanup

### 12.3 Email Notifications
- [ ] Install `nodemailer`
- [ ] Create `src/services/email.service.js`
- [ ] HTML email templates (use `handlebars` or `ejs`):
  - [ ] Welcome email on register
  - [ ] Email verification
  - [ ] Password reset
  - [ ] Order confirmation with items, total, address
  - [ ] Order delivered
  - [ ] Refund processed

### 12.4 SMS Notifications
- [ ] Install `twilio`
- [ ] SMS on: order OTP for delivery, order delivered confirmation, promo (optional)

---

## 🚴 PHASE 13 — Delivery Partner System

### 13.1 Delivery Partner Profile
- [ ] `GET /api/delivery/me` — own profile
- [ ] `PUT /api/delivery/me` — update details
- [ ] `PUT /api/delivery/me/toggle-online` — go online/offline
- [ ] `GET /api/delivery/me/earnings` — daily/weekly/monthly earnings breakdown
- [ ] `GET /api/delivery/me/history` — past deliveries

### 13.2 Auto-Assignment Engine
- [ ] When order is `ready_for_pickup`, find nearest online delivery partner
  - [ ] `$near` query on `currentLocation` within 5km
  - [ ] Filter: `isOnline: true, currentOrder: null`
  - [ ] Send socket event `delivery:request` to nearest partner with 30s to accept
  - [ ] If rejected/timeout, try next nearest partner
- [ ] `POST /api/delivery/orders/:id/accept` — accept the request
- [ ] `POST /api/delivery/orders/:id/reject` — reject (try next partner)

### 13.3 Delivery Earnings
- [ ] Earning model: `{ deliveryPartner, order, amount, type (delivery_fee/tip/bonus), date }`
- [ ] Calculate: base pay per delivery + distance bonus + peak hour bonus
- [ ] `GET /api/delivery/me/earnings/summary` — today, this week, this month

---

## 👑 PHASE 14 — Admin Panel APIs

### 14.1 Dashboard
- [ ] `GET /api/admin/stats` — platform overview: total users, partners, orders today, revenue today, active delivery partners

### 14.2 User Management
- [ ] `GET /api/admin/users` — list with search/filter/pagination
- [ ] `PUT /api/admin/users/:id/ban` — ban user with reason
- [ ] `PUT /api/admin/users/:id/unban`

### 14.3 Partner Management
- [ ] `GET /api/admin/partners` — list pending + approved partners
- [ ] `PUT /api/admin/partners/:id/approve` — approve food partner
- [ ] `PUT /api/admin/partners/:id/reject` — reject with reason
- [ ] `PUT /api/admin/partners/:id/suspend` — suspend active partner

### 14.4 Delivery Partner Management
- [ ] `GET /api/admin/delivery-partners` — list with status
- [ ] `PUT /api/admin/delivery-partners/:id/approve`
- [ ] `PUT /api/admin/delivery-partners/:id/suspend`

### 14.5 Order Management
- [ ] `GET /api/admin/orders` — all orders with filters (status, date range, partner)
- [ ] `PUT /api/admin/orders/:id/refund` — process manual refund
- [ ] `GET /api/admin/orders/disputes` — flagged/disputed orders

### 14.6 Content Moderation
- [ ] `GET /api/admin/food` — all food reels, flag suspicious
- [ ] `DELETE /api/admin/food/:id` — remove violating content
- [ ] `GET /api/admin/comments/flagged` — reported comments
- [ ] `DELETE /api/admin/comments/:id`

---

## ⚡ PHASE 15 — Caching with Redis

- [ ] Install `ioredis`
- [ ] Create `src/config/redis.js`
- [ ] Cache: `GET /api/feed` — TTL 30s (invalidate on new food item)
- [ ] Cache: `GET /api/categories` — TTL 1 hour
- [ ] Cache: `GET /api/partners/:id` — TTL 5 min (invalidate on update)
- [ ] Cache: `GET /api/feed/trending` — TTL 15 min
- [ ] Cache: `GET /api/search/suggestions?q=` — TTL 1 hour
- [ ] Session store: use Redis for express-session (if needed)
- [ ] Create cache middleware: `src/middlewares/cache.middleware.js`
- [ ] Cache invalidation: delete keys on create/update/delete in controllers

---

## 🗄️ PHASE 16 — Database & Models Checklist

### Models to Create/Update
- [ ] `user.models.js` — add: `refreshToken`, `fcmToken`, `isEmailVerified`, `emailVerifyToken`, `passwordResetToken`, `passwordResetExpires`, `isBanned`, `preferences`, `wallet`
- [ ] `foodpartner.models.js` — add: `refreshToken`, `fcmToken`, `isApproved`, `isActive`, `coordinates`, `openingHours`, `avgRating`, `cuisine[]`, `FSSAI`, `coverImage`, `logo`
- [ ] `deliverypartner.models.js` — CREATE: full schema (see Phase 13)
- [ ] `food.models.js` — add: `category`, `tags[]`, `thumbnailUrl`, `isVeg`, `spiceLevel`, `preparationTime`, `calories`, `isAvailable`, `likeCount`, `viewCount`, `orderCount`
- [ ] `order.models.js` — CREATE: full schema (see Phase 7)
- [ ] `cart.models.js` — CREATE
- [ ] `address.models.js` — CREATE
- [ ] `like.models.js` — CREATE
- [ ] `save.models.js` — CREATE
- [ ] `comment.models.js` — CREATE
- [ ] `rating.models.js` — CREATE
- [ ] `notification.models.js` — CREATE
- [ ] `coupon.models.js` — CREATE
- [ ] `category.models.js` — CREATE
- [ ] `earning.models.js` — CREATE (delivery partner earnings)
- [ ] `wallet.models.js` — CREATE (optional)

### Indexes to Add
- [ ] `user`: `email` (unique), `phone` (unique)
- [ ] `food`: `{ title: 'text', description: 'text', tags: 'text' }`, `partner`, `category`
- [ ] `foodpartner`: `coordinates` (2dsphere), `email` (unique)
- [ ] `deliverypartner`: `currentLocation` (2dsphere), `email` (unique)
- [ ] `order`: `user`, `partner`, `deliveryPartner`, `status`
- [ ] `like`: `(user, food)` unique compound
- [ ] `save`: `(user, food)` unique compound
- [ ] `comment`: `food`, `user`
- [ ] `notification`: `recipient`, `isRead`

---

## 🧪 PHASE 17 — Testing

- [ ] Install `jest`, `supertest`, `@types/jest`
- [ ] Setup `jest.config.js` — separate test DB, env
- [ ] Create `src/tests/` folder
- [ ] Auth tests: register, login, refresh token, logout, forgot password
- [ ] User tests: profile CRUD, address CRUD
- [ ] Food tests: create, update, delete, like, save, comment
- [ ] Cart tests: add, update, clear, coupon
- [ ] Order tests: place, cancel, status flow
- [ ] Payment tests: mock Razorpay, verify signature
- [ ] Feed tests: pagination, filters, trending
- [ ] Search tests: full-text, suggestions
- [ ] Target: 70%+ coverage (`jest --coverage`)

---

## 🐳 PHASE 18 — DevOps & Deployment

### Docker
- [ ] `Dockerfile` for backend (multi-stage build)
- [ ] `docker-compose.yml` — services: backend, mongodb, redis
- [ ] `.dockerignore`
- [ ] Test: `docker-compose up` runs everything locally

### CI/CD (GitHub Actions)
- [ ] `.github/workflows/ci.yml`:
  - [ ] Trigger on push to `main` and PRs
  - [ ] Steps: install → lint → test → build docker image
- [ ] `.github/workflows/deploy.yml`:
  - [ ] Trigger on push to `main`
  - [ ] Deploy to Railway / Render / EC2

### Production Checklist
- [ ] `NODE_ENV=production` — disables stack traces in error responses
- [ ] Enable MongoDB Atlas IP whitelist
- [ ] Set up Cloudinary upload presets with size/type restrictions
- [ ] SSL/TLS — HTTPS only (Let's Encrypt or platform handles it)
- [ ] `pm2` for process management if self-hosting
- [ ] Health check: `GET /api/health` — returns uptime, DB status, Redis status
- [ ] Set up Sentry for error monitoring (`@sentry/node`)

---

## 📁 Final Folder Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── index.js          → all env vars validated + exported
│   │   ├── db.js             → mongoose connection
│   │   ├── redis.js          → ioredis client
│   │   ├── cloudinary.js     → cloudinary setup
│   │   └── logger.js         → winston logger
│   ├── models/
│   │   ├── user.models.js
│   │   ├── foodpartner.models.js
│   │   ├── deliverypartner.models.js
│   │   ├── food.models.js
│   │   ├── order.models.js
│   │   ├── cart.models.js
│   │   ├── address.models.js
│   │   ├── like.models.js
│   │   ├── save.models.js
│   │   ├── comment.models.js
│   │   ├── rating.models.js
│   │   ├── notification.models.js
│   │   ├── coupon.models.js
│   │   ├── category.models.js
│   │   └── earning.models.js
│   ├── controllers/
│   │   ├── auth.controllers.js
│   │   ├── user.controllers.js
│   │   ├── food.controllers.js
│   │   ├── feed.controllers.js
│   │   ├── cart.controllers.js
│   │   ├── order.controllers.js
│   │   ├── payment.controllers.js
│   │   ├── partner.controllers.js
│   │   ├── delivery.controllers.js
│   │   ├── search.controllers.js
│   │   ├── location.controllers.js
│   │   ├── notification.controllers.js
│   │   └── admin.controllers.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── food.routes.js
│   │   ├── feed.routes.js
│   │   ├── cart.routes.js
│   │   ├── order.routes.js
│   │   ├── payment.routes.js
│   │   ├── partner.routes.js
│   │   ├── delivery.routes.js
│   │   ├── search.routes.js
│   │   ├── location.routes.js
│   │   ├── notification.routes.js
│   │   └── admin.routes.js
│   ├── middlewares/
│   │   ├── auth.middleware.js       → requireAuth, requireUser, requirePartner, etc.
│   │   ├── error.middleware.js      → global error handler
│   │   ├── validate.middleware.js   → runs express-validator chains
│   │   ├── cache.middleware.js      → Redis cache layer
│   │   └── rateLimiter.middleware.js
│   ├── validators/
│   │   ├── auth.validators.js
│   │   ├── user.validators.js
│   │   ├── food.validators.js
│   │   ├── order.validators.js
│   │   └── address.validators.js
│   ├── services/
│   │   ├── storage.service.js       → Cloudinary upload/delete
│   │   ├── payment.service.js       → Razorpay
│   │   ├── maps.service.js          → Google Maps API
│   │   ├── email.service.js         → Nodemailer
│   │   ├── sms.service.js           → Twilio
│   │   └── notification.service.js  → FCM push notifications
│   ├── socket/
│   │   └── index.js                 → Socket.io setup + event handlers
│   ├── utils/
│   │   ├── ApiError.js
│   │   ├── ApiResponse.js
│   │   ├── asyncHandler.js
│   │   └── queryBuilder.js          → reusable filter/sort/paginate
│   └── app.js
├── tests/
│   ├── auth.test.js
│   ├── food.test.js
│   ├── order.test.js
│   └── ...
├── Dockerfile
├── .dockerignore
├── server.js
├── package.json
└── .env
```

---

## 🏁 Build Order (Recommended)

```
Week 1  →  Phase 1  (Security)  +  Phase 2  (Auth revamp)
Week 2  →  Phase 3  (User/Partner profiles)  +  Phase 4  (Food/Menu)
Week 3  →  Phase 5  (Feed/Likes/Comments)  +  Phase 6  (Cart)
Week 4  →  Phase 7  (Orders)  +  Phase 8  (Payments)
Week 5  →  Phase 9  (Maps)  +  Phase 10  (Socket.io real-time)
Week 6  →  Phase 11  (Search)  +  Phase 12  (Notifications)
Week 7  →  Phase 13  (Delivery Partner)  +  Phase 14  (Admin APIs)
Week 8  →  Phase 15  (Redis)  +  Phase 16  (DB cleanup)  +  Phase 17  (Tests)
Week 9  →  Phase 18  (Docker + CI/CD + Deploy)
```

---

*Total: ~200 backend tasks. You don't need all of them — Phases 1–11 are enough for a killer resume project.*