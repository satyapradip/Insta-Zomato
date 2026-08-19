# 📜 Engineering Standards & Development Rules — Insta-Zomato

> **Document:** 05-RULES.md  
> **Enforcement Level:** Mandatory across all Backend, Frontend & Autonomous Agent Contributions  
> **Primary Stack:** Node.js v22 (Express v5) · Next.js 16 (App Router) · shadcn/ui · MongoDB Mongoose v9 · Redis  

---

## 0. Autonomous Agent Working Architecture & Review Loop

Every task executed in this repository must strictly adhere to the multi-stage **Planner-Worker-Reviewer Feedback Loop**:

```mermaid
flowchart LR
    Task([Task Initiated]) --> Planner[Planner]
    Planner --> Worker[Worker - Implementation]
    Planner --> PlanReviewer[Plan Reviewer]
    PlanReviewer --> PlanFeedback[Plan Feedback]
    PlanFeedback --> User([Send to User])

    Worker -->|Stream 1| Rev1[Reviewer 1: Architecture & Contracts]
    Worker -->|Stream 2| Rev2[Reviewer 2: Security & Sanitization]
    Worker -->|Stream N| RevN[Reviewer N: Performance & Edge Cases]

    Rev1 --> Synth[Synthesise Reviews]
    Rev2 --> Synth
    RevN --> Synth

    Synth --> Decision{Pass?}
    Decision -- "No (Defects Found)" -->|Feedback & Fix Instructions| Worker
    Decision -- "Yes (Verified)" --> Results[Format & Summarize Results]
    Results --> User
```

### 0.1 Execution Stage Roles:
1. **Planner (Ephemeral Phase):** Analyzes existing codebase, inspects dependencies, checks schema registries in `06-MEMORY.md`, and drafts the atomic step-by-step implementation plan.
2. **Worker (Resident Execution):** Implements code modifications strictly adhering to project conventions, error envelopes, and typing contracts.
3. **Multi-Perspective Reviewers:**
   - **Reviewer 1 (Architecture & Contracts):** Verifies N-tier separation, API envelopes (`ApiResponse` / `ApiError`), and RBAC role guards.
   - **Reviewer 2 (Security & Sanitization):** Verifies NoSQL injection prevention, XSS clean, rate limiters, and JWT rotation rules.
   - **Reviewer 3 (Performance & Geospatial):** Validates atomic database operations (`$inc`, `$set`), 2dsphere `[longitude, latitude]` coordinate order, and video streaming buffers.
4. **Synthesis & Feedback Loop (`Pass?` Decision):**
   - If any reviewer flags a failure, defects are immediately routed back to the **Worker** for automatic correction before concluding the turn.
   - Only when all review streams pass is the result formatted and delivered.

---

## 1. Architectural Principles & Clean Layering

Code must adhere to a strict **N-Tier Layered Architecture**. Never mix database queries inside routes or HTTP presentation logic inside services.

```
Client Request (Next.js 16 / shadcn/ui)
      │
      ▼
┌──────────────┐
│ Route Layer  │  -> src/routes/ (URL definitions, rate limiters, validation chains)
└──────┬───────┘
       ▼
┌──────────────┐
│  Middleware  │  -> src/middlewares/ (Auth JWT, RBAC role guard, input sanitizer)
└──────┬───────┘
       ▼
┌──────────────┐
│  Controller  │  -> src/controllers/ (Extract req params, orchestrate services, return ApiResponse)
└──────┬───────┘
       ▼
┌──────────────┐
│Service Layer │  -> src/services/ (Business logic, Razorpay, Cloudinary, Maps, Algorithms)
└──────┬───────┘
       ▼
┌──────────────┐
│ Data / Model │  -> src/models/ (Mongoose schemas, 2dsphere indexes, atomic updates)
└──────────────┘
```

---

## 2. Backend Coding Standards (Node.js / Express v5)

### 2.1 Async Flow & Error Handling
1. **Always wrap controllers with `asyncHandler`:** Never use bare `try/catch` blocks in controllers unless catching a specific error to transform it.
2. **Always throw `ApiError`:** Throw instances of `ApiError(statusCode, message, errors)` to let the global error middleware format the response uniformly.
   ```javascript
   // ❌ BAD
   app.get('/api/food/:id', async (req, res) => {
     try {
       const item = await Food.findById(req.params.id);
       res.json(item);
     } catch (e) {
       res.status(500).json({ error: e.message });
     }
   });

   // ✅ GOOD
   const getFoodDetail = asyncHandler(async (req, res) => {
     const item = await foodModel.findById(req.params.id);
     if (!item) throw new ApiError(404, "Food item not found");
     res.status(200).json(new ApiResponse(200, item, "Food item fetched successfully"));
   });
   ```

### 2.2 Standardized Response Contracts
All API responses must strictly follow the `ApiResponse` and `ApiError` envelope:

```typescript
// Success Envelope (HTTP 2xx)
{
  "success": true,
  "statusCode": 200,
  "data": { ... },
  "message": "Operation completed successfully"
}

// Error Envelope (HTTP 4xx / 5xx)
{
  "success": false,
  "statusCode": 404,
  "message": "Resource not found",
  "errors": [],
  "stack": "..." // ONLY present in NODE_ENV=development
}
```

### 2.3 Centralized Configuration Access
- **NEVER** use `process.env.VARIABLE_NAME` directly in controllers or services.
- **ALWAYS** import from `src/config/index.js`. All variables are validated at startup via Zod schemas.

---

## 3. Database & Mongoose Rules

1. **Geospatial Coordinate Order:**
   - MongoDB GeoJSON format strictly requires **`[longitude, latitude]`** order. (Longitude first, latitude second).
   ```javascript
   // ✅ Correct: [lng, lat]
   coordinates: [77.5946, 12.9716] // Bangalore: 77.59° E, 12.97° N
   ```
2. **Indexing Requirements:**
   - Every foreign key reference (e.g. `foodPartner`, `user`, `order`) must be explicitly indexed.
   - Any query sorting by date or status must utilize a compound index (e.g. `{ user: 1, createdAt: -1 }`).
   - Geospatial searches must utilize `2dsphere` indexes.
3. **Atomic Operations for High-Concurrency:**
   - Never fetch a document, modify a numeric counter in JavaScript, and call `.save()`.
   - Use atomic `$inc`, `$set`, `$push`, or `$addToSet` operators to prevent race conditions during concurrent likes or cart updates.
   ```javascript
   // ✅ Atomic like increment
   await foodModel.findByIdAndUpdate(foodId, { $inc: { likeCount: 1 } });
   ```
4. **Order Financial Transactions:**
   - Multi-document updates affecting cart clearing, stock decrement, and order creation must run inside a MongoDB transaction session (`session.withTransaction()`).

---

## 4. Frontend Coding Standards (Next.js 16, shadcn/ui & React)

### 4.1 Server vs. Client Components
- **Default to React Server Components (RSC):** Render static layouts, initial SEO metadata, and server-side data fetching without client JavaScript overhead.
- **Client Components (`'use client'`):** Isolate client boundaries strictly to interactive elements:
  - Video Player & Swiper controls
  - shadcn/ui Drawers, Sheets, and Dialogs
  - Like / Save toggle buttons
  - Real-time Socket.io listeners
  - Mapbox / Leaflet map renderers

### 4.2 shadcn/ui & UI Component Rules
1. **Class Merging Utility (`cn`):** Always use `cn()` from `@/lib/utils` for conditional class joining and tailwind conflict resolution:
   ```tsx
   import { cn } from "@/lib/utils";

   export function VegBadge({ isVeg, className }: { isVeg: boolean; className?: string }) {
     return (
       <div className={cn(
         "flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-xs font-semibold backdrop-blur-md",
         isVeg ? "border-emerald-500/40 text-emerald-400 bg-emerald-950/30" : "border-rose-500/40 text-rose-400 bg-rose-950/30",
         className
       )}>
         <span className={cn("w-2 h-2 rounded-full", isVeg ? "bg-emerald-500" : "bg-rose-500")} />
         {isVeg ? "VEG" : "NON-VEG"}
       </div>
     );
   }
   ```
2. **Mobile Drawer Standard (Vaul / `shadcn/ui Drawer`):**
   - For mobile-first sheets (Customization drawer, Quick-cart, Comments), use `Drawer` from shadcn/ui (powered by Vaul) with drag handles and smooth snap points (`[0.4, 0.85, 1]`).
3. **Toast Notifications (Sonner):**
   - Use `sonner` with rich colors and action buttons:
   ```tsx
   toast.success("Added to Cravings!", {
     description: "Truffle Butter Paneer Tikka (Full)",
     action: { label: "Checkout", onClick: () => openCart() },
   });
   ```

### 4.3 Video Feed & Memory Management
- **View-Driven Video Destruction:** A mobile browser will crash if 20 videos remain loaded in DOM memory.
  - Render videos inside a virtualized swiper container.
  - Unload/pause HTML5 `<video>` elements that are $\pm 2$ screens away from the active viewport.
  - Always set `muted={true}` on initial auto-play to comply with browser Autoplay policies, with a floating un-mute toggle.
  - Video aspect ratio must be locked to `aspect-[9/16]` with `object-cover`.

### 4.4 State Management Matrix
| State Type | Recommended Tool | Use Case |
|---|---|---|
| **Server State & Caching** | TanStack Query v5 | Feed pagination, restaurant menus, order details, optimistic mutations |
| **Global Client State** | Zustand | Active cart items, selected delivery address, UI drawer states |
| **Ephemeral UI State** | `useState` / `useReducer` | Form inputs, video play/pause state, comment input draft |
| **Real-time Stream State** | Socket.io Client Hook | Live driver coordinates, kitchen status updates |

---

## 5. Security & Privacy Guardrails

1. **Authentication Security:**
   - Store Access Tokens strictly in memory (Zustand state).
   - Store Refresh Tokens strictly in `httpOnly`, `secure: true`, `sameSite: 'strict'` cookies.
   - Never expose JWT secrets or third-party private keys to the client bundle (`NEXT_PUBLIC_` prefix must NEVER be used for secret keys).
2. **Payload Protection:**
   - File uploads must be checked for true MIME types via buffer magic numbers. Max video size: 50MB. Max image size: 5MB.
   - All text inputs (comments, reviews, dish descriptions) must pass through XSS sanitization.
3. **Price Tampering Prevention:**
   - The client submits only `{ foodId, quantity, selectedVariant, addOns }`. The server **always queries the database** to fetch true item prices, compute taxes, and calculate totals. Never trust prices passed from `req.body`.

---

## 6. Mandatory Re-Verification & Code Quality Rules

Every implementation step must undergo the following **Automated 6-Point Re-Verification Checklist** before being marked complete:

```
┌────────────────────────────────────────────────────────────────────────┐
│               MANDATORY 6-POINT RE-VERIFICATION CHECKLIST              │
├────────────────────────────────────────────────────────────────────────┤
│ [1] Contract Verification   : Endpoint inputs/outputs match ApiResponse│
│ [2] Security Sanitization   : NoSQL injection & XSS protections active │
│ [3] Database Integrity      : GeoJSON [lng, lat] & atomic updates used │
│ [4] Secret Isolation        : All config routed via src/config/index.js│
│ [5] Documentation Sync      : 06-MEMORY.md & TODO.md updated           │
│ [6] Zero Dead-Locks         : Async flows wrapped in asyncHandler      │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Contract Integrity Check:** Ensure all route responses return status codes in accordance with REST standards (200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict).
2. **Schema & Index Verification:** Ensure any new collection has explicit indexes defined and no unindexed queries are executed.
3. **No Stale Memory:** Whenever adding or altering models or routes, update [`06-MEMORY.md`](file:///e:/Insta_Zomato/docs/06-MEMORY.md) immediately.
4. **Roadmap Tracking:** Check off corresponding checkboxes in [`backend/TODO.md`](file:///e:/Insta_Zomato/backend/TODO.md) and [`07-TASK-CHUNKS.md`](file:///e:/Insta_Zomato/docs/07-TASK-CHUNKS.md).

---

## 7. Git & Contribution Workflow

### 7.1 Conventional Commit Messages
Commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat(feed): add cursor pagination and video prefetching`
- `feat(ui): add shadcn drawer for dish customization`
- `fix(cart): prevent multi-restaurant item addition conflict`
- `perf(video): optimize Cloudinary HLS streaming delivery`
- `security(auth): add refresh token rotation and revocation`
- `docs(rules): add autonomous agent working architecture and re-verify rules`
- `test(order): add integration test for delivery OTP verification`

### 7.2 Branching Model
- `main` $\to$ Production release branch. Protected against direct pushes.
- `develop` $\to$ Active staging integration branch.
- `feat/<feature-name>` $\to$ Working feature branch created from `develop`.
- `fix/<bug-name>` $\to$ Bugfix branch created from `develop`.
- `hotfix/<patch-name>` $\to$ Critical patch created directly from `main`.
