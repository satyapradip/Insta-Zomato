# 📱 Screen-by-Screen UI/UX Specifications — Insta-Zomato

> **Document:** 09-PAGES.md  
> **Status:** Approved / Master Page Reference  
> **Version:** 1.0.0  
> **Aesthetic Theme:** *Obsidian Dark Gourmet (Default) & Warm Organic Flavoro Light*  
> **Design Influences:** **Flavoro** (Gourmet Discovery & Luxury Flow), **Dishly** (Widescreen PC Ordering & Sticky Cart), **Chili POS** (Kitchen & Partner Studio), **Shohidul UIX** (Mobile Delivery Cards & Fluid Navigation)  

---

## 1. Information Architecture & Route Matrix

```mermaid
graph TD
    subgraph Consumer App [🛍️ Consumer Routes (Mobile & Desktop)]
        C1["/ (Splash / Onboarding)"]
        C2["/feed (Reels Video Stream)"]
        C3["/explore (Cuisines & Search)"]
        C4["/restaurant/:id (Menu Hub)"]
        C5["/cart (Single-Restaurant Cart)"]
        C6["/checkout (Razorpay / UPI)"]
        C7["/order/:id/track (Live Map HUD)"]
        C8["/orders (Order History)"]
        C9["/favorites (Saved Wishlists)"]
        C10["/profile (Address Book & Diets)"]
    end

    subgraph Partner Studio [🍳 Restaurant Partner Studio (PC / Tablet)]
        P1["/partner/orders (Live Kanban & Audio)"]
        P2["/partner/studio (Reel Upload Engine)"]
        P3["/partner/menu (Chili POS Grid)"]
        P4["/partner/analytics (Conversion Dashboard)"]
    end

    subgraph Delivery Partner [🛵 Delivery Rider PWA (Mobile)]
        R1["/rider/radar (30s Dispatch Queue)"]
        R2["/rider/navigate (Turn-by-Turn GPS)"]
        R3["/rider/verify (OTP Verification Pad)"]
        R4["/rider/earnings (Wallet & Tips)"]
    end

    subgraph SuperAdmin [🛡️ SuperAdmin Portal (Desktop)]
        A1["/admin/moderation (Video Take-downs)"]
        A2["/admin/kyc (FSSAI Verification)"]
        A3["/admin/health (GMV & System Metrics)"]
    end
```

---

## 2. Customer Experience: Mobile Screens (375px – 430px)

---

### 📱 Screen M-01: Splash & Gourmet Onboarding (`/`)
*Inspired by Flavoro Onboarding*

```
┌──────────────────────────────────────────────────────────┐
│ 9:41                                              📶 🔋  │
│                                                          │
│                     [ Brand Logo: 🍲 ]                   │
│                        Insta-Zomato                      │
│                                                          │
│         ┌──────────────────────────────────────┐         │
│         │                                      │         │
│         │        [ High-Definition 3D          │         │
│         │       Artisanal Sizzling Dish ]      │         │
│         │                                      │         │
│         └──────────────────────────────────────┘         │
│                                                          │
│                     Good Food is                         │
│                      Good Mood.                          │
│                                                          │
│        Watch sizzling food reels from top local          │
│       restaurants and get them delivered hot to          │
│                 your doorstep in 30 mins.                │
│                                                          │
│     [ ⭐ Premium Restos ] [ 🎬 Food Reels ] [ ⚡ Fast ]  │
│                                                          │
│     ┌──────────────────────────────────────────────┐     │
│     │            Get Started (Order Now)           │     │
│     └──────────────────────────────────────────────┘     │
│                     Already have an account? Log In      │
└──────────────────────────────────────────────────────────┘
```

- **Hero Image:** High-resolution floating dish image with ambient backlight blur.
- **Headline:** Bold appetite-inducing display typography (`Outfit` / `Playfair Display`).
- **Feature Pills:** 3 brand value chips with icons (`⭐ Premium Restos`, `🎬 Food Reels`, `⚡ 30m Delivery`).
- **CTAs:** Full-width gradient Primary Button (`Get Started`) + Ghost text link (`Log In`).

---

### 📱 Screen M-02: Immersive 9:16 Video Discovery Feed (`/feed`)
*Inspired by Instagram Reels + Zomato Food Badges + Flipkart Sticky Actions*

```
┌──────────────────────────────────────────────────────────┐
│ [📍 Miami Beach, Beside ▾]   [ For You | Nearby ]  [🔍]  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│                                                   [ ❤️ ] │ 14.2k
│                   FULL-SCREEN (9:16)              [ 💬 ] │ 842
│                   VERTICAL FOOD VIDEO             [ ⭐️ ] │ 3.1k
│                   (Auto-Playing 1080p)            [ ↗️ ] │ Share
│                                                   [ 💿 ] │ Audio
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ [🟢 PURE VEG]  [⭐ 4.8 (350)]  [⏱️ 15 Mins Prep]      │ │
│ │ Smokey Truffle Beast Burger                          │ │
│ │ The Gourmet Grill (1.8 km away • Open Now)           │ │
│ │ $12.99  ̶$̶1̶5̶.̶9̶9̶   🔥 20% OFF Deal                     │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌───────────────────────────┐  ┌───────────────────────┐ │
│ │    🛒 + Add to Cart       │  │   ⚡ Buy Now ($12.99) │ │
│ └───────────────────────────┘  └───────────────────────┘ │
├──────────────────────────────────────────────────────────┤
│    🏠 Feed   |   🧭 Explore   |   🛒 (2)   |   👤 Profile│
└──────────────────────────────────────────────────────────┘
```

- **Top Overlay:** City/Address picker with dropdown arrow, Feed Segmented Pill (`For You` | `Nearby` | `Trending`), and Instant Search button.
- **Right Action Rail:**
  - **Heart Button:** Animated like with double-tap burst and count label (`14.2k`).
  - **Comment Bubble:** Opens swipeable bottom sheet (`842`).
  - **Bookmark Star:** Saves reel to custom collections.
  - **Share Arrow:** Web Share API trigger for WhatsApp/Instagram Stories.
  - **Rotating Vinyl Disc:** Audio wave animation for restaurant ambiance/audio track.
- **Bottom Dish Overlay Card:**
  - Standard Veg/Non-Veg icon badge.
  - Dish Name, Restaurant Name with distance in km, Price & strikethrough discount.
- **Dual Conversion Bar:** Outline Glass `+ Add to Cart` + Neon Coral `⚡ Buy Now`.
- **Bottom Navigation Bar:** 4 core icons (`Feed`, `Explore`, `Cart`, `Profile`) with active glowing indicator.

---

### 📱 Screen M-03: Explore & Cuisines Discovery (`/explore`)
*Inspired by Shohidul UIX & Flavoro Cuisines Gallery*

```
┌──────────────────────────────────────────────────────────┐
│ [ 🔍 Search for burgers, sushi, biryani...      ] [ ⚙️ ]  │
├──────────────────────────────────────────────────────────┤
│ [ Food ]  [ Grocery ]  [ Desserts ]  [ Drinks ]  [ Vegan ]│
├──────────────────────────────────────────────────────────┤
│ 🏷️ Ongoing Offers You Can't Miss!                        │
│ ┌──────────────────────────────────────────────────────┐ │
│ │  🎉 50% OFF on First 3 Orders!                       │ │
│ │  Use Code: CRAVE50                 [ Order Now ➔ ]   │ │
│ └──────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────┤
│ 🍕 Explore by Cuisine                                    │
│ ┌──────────────────────┐    ┌──────────────────────┐     │
│ │ [ Italian Photo ]    │    │ [ Japanese Photo ]   │     │
│ │ Italian (120+ Dishes)│    │ Japanese (85+ Dishes)│     │
│ └──────────────────────┘    └──────────────────────┘     │
│ ┌──────────────────────┐    ┌──────────────────────┐     │
│ │ [ Mexican Photo ]    │    │ [ Gourmet Burgers ]  │     │
│ │ Mexican (45+ Dishes) │    │ Burgers (95+ Dishes) │     │
│ └──────────────────────┘    └──────────────────────┘     │
├──────────────────────────────────────────────────────────┤
│ 🔥 Popular Near You                                      │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ [ Dish Thumbnail ]  Pepperoni Pizza Deluxe           │ │
│ │ ⏱️ 15 Mins • ⭐ 4.7 (350) • $11.90       [ + Add ]   │ │
│ └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

- **Search Bar:** Rounded pill with recent search suggestions popover.
- **Horizontal Category Carousel:** Quick filter chips with category icons.
- **Flash Deals Banner:** Gradient card with countdown timer and promo code.
- **2-Column Cuisines Grid:** Rich visual tiles with dish counts.
- **Popular Dishes List:** Compact food cards with prep time, rating, and quick `+` add button.

---

### 📱 Screen M-04: Restaurant Profile & Dish Menu (`/restaurant/[id]`)
*Inspired by Flavoro Restaurant Detail Page*

```
┌──────────────────────────────────────────────────────────┐
│ [ ← Back ]          [ ❤️ Save ]          [ ↗️ Share ]    │
│ ┌──────────────────────────────────────────────────────┐ │
│ │         [ Ambient Restaurant Cover Photo ]           │ │
│ └──────────────────────────────────────────────────────┘ │
│  Bistro Verde Ristorante                                 │
│  Italian • Pasta • Woodfired Pizza • $$$                 │
│  ⭐ 4.8 (2.3k reviews) • ⏱️ 30-40 min • 🛵 Free Delivery   │
│  "A cozy Italian bistro offering handmade pasta & pizza"  │
│                                                          │
│  [ 🟢 Veg Only ]  [ 🔥 Bestsellers ]  [ 🎬 Has Video ]   │
├──────────────────────────────────────────────────────────┤
│  🍝 Popular Dishes                                       │
│  ┌────────────────────────────────────────────────────┐  │
│  │ [ Mini Photo ]  Truffle Mushroom Risotto   $18.00  │  │
│  │                 Creamy arborio rice with truffle   │  │
│  │                 [ 🎬 Watch Reel ]      [ + Add ]   │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │ [ Mini Photo ]  Margherita Burrata Pizza   $16.00  │  │
│  │                 Woodfired crust, fresh basil       │  │
│  │                 [ 🎬 Watch Reel ]      [ + Add ]   │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

- **Hero Header:** Ambience banner, restaurant name, rating pill, ETA, and bio.
- **Filter Bar:** Toggle for `Pure Veg`, `Bestsellers`, and `Dishes with Video Reels`.
- **Menu Item Cards:** Photo, description, price, direct link to watch reel, and `+ Add` button.

---

### 📱 Screen M-05: Dish Customizer & Modifier Drawer (Vaul Sheet)
*Inspired by Flipkart & Dishly Customization Panels*

```
┌──────────────────────────────────────────────────────────┐
│ ═══════════════════ [ Drag Handle ] ═════════════════════│
│ 🍕 Woodfired Truffle Margherita — Customise              │
├──────────────────────────────────────────────────────────┤
│ 1. CHOOSE PORTION SIZE (Required)                        │
│    (o) 10 Inch Medium                                    │
│        Standard size for 1-2 people             $16.50   │
│    ( ) 12 Inch Large                                     │
│        Sharing size for 2-3 people              $21.50   │
├──────────────────────────────────────────────────────────┤
│ 2. CHOOSE CRUST TYPE                                     │
│    (o) Neapolitan Thin Crust (Free)                      │
│    ( ) Cheese Burst Stuffed Crust               +$3.00   │
├──────────────────────────────────────────────────────────┤
│ 3. EXTRA TOPPINGS & ADD-ONS (Optional)                   │
│    [x] Fresh Italian Burrata Cheese             +$4.00   │
│    [ ] Black Truffle Oil Drizzle                +$2.50   │
│    [x] Roasted Garlic & Chili Flakes            +$0.50   │
├──────────────────────────────────────────────────────────┤
│ 4. SPECIAL COOKING NOTES                                 │
│    [ Input: "Extra crispy crust please"                ] │
├──────────────────────────────────────────────────────────┤
│   Total: $21.00     [ - 1 + ]     [ 🛒 Add to Cart $21 ] │
└──────────────────────────────────────────────────────────┘
```

- **Portion Radio Group:** Interactive selection with live price calculation.
- **Add-on Checkboxes:** Multi-select toppings with transparent prices.
- **Quantity Stepper:** `- 1 +` pill selector.
- **Sticky Footer Button:** Displays dynamic recalculation total.

---

### 📱 Screen M-06: Single-Restaurant Cart (`/cart`) & Conflict Modal
*Inspired by Zomato Single-Restaurant Lock + Flipkart Cart Summary*

```
┌──────────────────────────────────────────────────────────┐
│ [ ← Back ]              My Cart (2 Items)                │
├──────────────────────────────────────────────────────────┤
│ 🏪 Order from: The Gourmet Grill (1.8 km)                │
│                                                          │
│ 1x Smokey Truffle Beast Burger                  $12.99   │
│    • Brioche Bun • Extra Truffle Mayo                    │
│    [ - ]  1  [ + ]                           [ 🗑️ Remove]│
│                                                          │
│ 1x Truffle Parmesan French Fries                 $4.99   │
│    [ - ]  2  [ + ]                           [ 🗑️ Remove]│
├──────────────────────────────────────────────────────────┤
│ 🎟️ Apply Coupon Code                                     │
│ [ Input: CRAVE50                    ]  [ Apply ]         │
│ ✅ CRAVE50 applied! Saved $3.50                          │
├──────────────────────────────────────────────────────────┤
│ 🛵 Delivery Instructions:                                │
│ [ 🚪 Leave at door ]  [ 🔕 Don't ring bell ]  [ 📞 Call ] │
├──────────────────────────────────────────────────────────┤
│ 📍 Delivery Address:                                     │
│ Flat 402, Skyline Residency, Miami Beach       [Change]  │
├──────────────────────────────────────────────────────────┤
│ 🧾 Bill Summary:                                         │
│   • Items Subtotal:                             $22.97   │
│   • Delivery Partner Fee (1.8 km):               $2.99   │
│   • Platform Fee:                                $0.50   │
│   • Restaurant Packaging & GST:                  $1.85   │
│   • Coupon Discount:                            -$3.50   │
│   ────────────────────────────────────────────────────   │
│   • Grand Total:                                $24.81   │
├──────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────┐ │
│ │  💳 Slide to Pay $24.81  =======================>    │ │
│ └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

#### Single-Restaurant Conflict Modal (Alert Dialog):
```
┌──────────────────────────────────────────────────────┐
│ ⚠️ Replace Items in Cart?                             │
│                                                      │
│ Your cart contains items from "The Gourmet Grill".   │
│ Adding dishes from "Pizza Haven" will reset your     │
│ current cart.                                        │
│                                                      │
│ [ Discard & Start Fresh ]      [ Keep Current Cart ] │
└──────────────────────────────────────────────────────┘
```

---

### 📱 Screen M-07: Real-Time Live Order Tracking Map HUD (`/order/[id]/track`)
*Inspired by Zomato Logistics + Flavoro Live Tracking*

```
┌──────────────────────────────────────────────────────────┐
│ [ ← Back to Feed ]     Order #IZ-40921      [ 🎧 Help ]  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│                INTERACTIVE DARK-MODE MAP                 │
│                                                          │
│        [ 🏠 Your Home ]                                  │
│               ▲                                          │
│               │ (Glowing Neon Route Polyline)            │
│        [ 🛵 Vikram S. (Rider) ] -> ETA: 14 mins          │
│               ▲                                          │
│               │                                          │
│        [ 🍳 The Gourmet Grill ]                          │
│                                                          │
├──────────────────────────────────────────────────────────┤
│ 🟢 RIDER IS ON THE WAY WITH YOUR FOOD                    │
│                                                          │
│ [✔️ Confirmed] ── [✔️ Preparing] ── [🔘 On the Way] ── [Delivered] │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ 🔑 Doorstep Delivery OTP:     [  8  3  9  2  ]       │ │
│ │ (Share with rider only after receiving your food)   │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ [ 👤 Photo ] Vikram Singh (⭐ 4.9 • 1,240 Deliveries) │ │
│ │ Honda Activa (KA-01-EQ-9812)                         │ │
│ │ [ 📞 Call Rider ]     [ 💬 Message ]   [ 💵 Tip $2 ] │ │
│ └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

- **Interactive Vector Map:** Real-time rider location gliding via Socket.io updates.
- **4-Stage Progress Stepper:** Confirmed $\to$ Kitchen Preparing $\to$ Out for Delivery $\to$ Delivered.
- **Golden Glowing Delivery OTP Card:** Secure 4-digit token.
- **Rider Contact Card:** Driver photo, rating, vehicle license plate, and 1-tap call button.

---

## 3. Customer Experience: Desktop / PC Widescreen (1280px – 1920px+)

---

### 💻 Screen D-01: 3-Column Reels & Spotlight Ordering Dashboard (`/feed`)
*Inspired by Dishly Widescreen Layout + Instagram Web*

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [🍲 Insta-Zomato]   [📍 Miami Beach, Beside ▾]   [ 🔍 Search dishes, ingredients... ]   [🌱 Veg] [🔔(2)]│
├──────────────────────┬────────────────────────────────────────────┬─────────────────────────────────────┤
│ 🏠 For You Reels     │                                            │ 🍕 Woodfired Truffle Pizza          │
│ 🔥 Trending Today    │         9:16 HIGH-DEFINITION               │    The Gourmet Grill • ⭐ 4.8        │
│ 📍 Nearby Food       │          FOOD REEL PLAYER                  │    $16.50  ̶$̶1̶9̶.̶9̶9̶ (15% OFF)           │
│ 🍝 Categories        │        (Centered 420px Frame)              │                                     │
│    • Burgers (34)    │                                            │ Size:                               │
│    • Pizzas (52)     │       [ Sizzling Double Patty              │ (o) 10" Medium    ( ) 12" Large     │
│    • Desserts (19)   │         Cheese Pull Video ]                │                                     │
│ 📦 My Orders         │                                            │ Add-ons:                            │
│ ⭐️ Saved Wishlist    │    [ ❤️ 14.2k ]  [ 💬 842 ]  [ ⭐️ 3.1k ]   │ [x] Extra Burrata Cheese  (+$4.00)  │
│ ⚙️ Settings          │                                            │ [ ] Chili Flakes Oil      (+$0.50)  │
│ ──────────────────── │ ◄ Prev (K)                     Next (J) ►  │                                     │
│ 👤 John Doe          │                                            │ Quantity:  [ - ]  1  [ + ]          │
│    johndoe@email.com │ ────────────────────────────────────────── │ ─────────────────────────────────── │
│    [ Log Out ]       │ 💡 Tip: Use ↑ / ↓ arrow keys or J / K      │ [ ⚡ Buy Now ]   [ + Add to Cart ]  │
│                      │ Space to Pause • M to Mute • L to Like     │ 🛒 Live Cart Subtotal: $16.50       │
└──────────────────────┴────────────────────────────────────────────┴─────────────────────────────────────┘
```

- **Column 1 (Left Nav - 260px):** Brand logo, navigation links with active pill states, category tree with dish counts, and user profile badge.
- **Column 2 (Center Video Stage - Flex 1):** 9:16 phone-aspect cinema frame with **dynamic ambient backlight glow**, floating action buttons, and keyboard navigation instructions.
- **Column 3 (Right Commerce Panel - 380px):** Dedicated dish details, portion selection, toppings checkboxes, and sticky live cart checkout widget.

---

### 💻 Screen D-02: Desktop Explore & Cuisines Discovery (`/explore`)
*Inspired by Dishly Food Catalog Grid*

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [🍲 Insta-Zomato]   [ 🔍 Search across 200+ restaurants and dishes... ]         [🌱 Pure Veg Toggle]    │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Meal Categories:                                                                                        │
│ [ All (235) ]  [ Burgers (34) ]  [ Pizzas (52) ]  [ Pasta (18) ]  [ Sushi (24) ]  [ Desserts (19) ]     │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐  │
│ │ [ Food Image ]  [🎬] │  │ [ Food Image ]  [🎬] │  │ [ Food Image ]       │  │ [ Food Image ]  [🎬] │  │
│ │ Truffle Cheeseburger │  │ Pepperoni Pizza XL   │  │ Salmon Nigiri Platter│  │ Molten Lava Cake     │  │
│ │ The Burger Joint     │  │ Pizza Haven          │  │ Sushi Koi            │  │ Sweet Tooth Bakery   │  │
│ │ $12.99 • ⭐ 4.9      │  │ $18.50 • ⭐ 4.7      │  │ $24.00 • ⭐ 4.8      │  │ $8.50 • ⭐ 4.9       │  │
│ │ [ + Add to Cart ]    │  │ [ + Add to Cart ]    │  │ [ + Add to Cart ]    │  │ [ + Add to Cart ]    │  │
│ └──────────────────────┘  └──────────────────────┘  └──────────────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Restaurant Partner Studio & Kitchen POS Screens (Tablet & PC)
*Inspired by Chili POS Interface*

---

### 🖥️ Screen P-01: Live Incoming Orders Kanban & Audio Queue (`/partner/orders`)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [🍲 Partner Studio]  The Burger Joint [🟢 LIVE / OPEN]                  [🔊 Audio Chime: ON] [🔔 (3)]   │
├───────────────────┬─────────────────────────────────────────────────────────────────────────────────────┤
│ 📋 Live Orders    │  NEW ORDERS (3)         PREPARING (2)          READY FOR PICKUP (4)                 │
│ 🎬 Reel Studio    ├──────────────────────┬──────────────────────┬───────────────────────────────────────┤
│ 🍽️ Menu Catalog   │ Order #3082          │ Order #3080          │ Order #3078                           │
│ 📊 Analytics      │ 2x Truffle Burger    │ 1x Spicy Combo       │ 3x Smash Burger                       │
│ ⚙️ Store Settings │ Total: $34.50        │ Total: $28.00        │ Rider: Vikram S. (Arrived)            │
│ 🚪 Logout         │ ⏱️ Timer: 02:45      │ ⏱️ Prep: 14:20 min   │ OTP Verified Status: Ready            │
│                   │                      │                      │                                       │
│                   │ [ Accept ] [ Reject] │ [ Mark Ready ]       │ [ Handover to Rider ]                 │
└───────────────────┴──────────────────────┴──────────────────────┴───────────────────────────────────────┘
```

- **Live Socket Audio Alert:** High-urgency kitchen chime whenever a new order arrives.
- **3-Stage Kitchen Kanban Board:** `New Orders` $\to$ `Preparing` $\to$ `Ready for Pickup`.
- **Order Details:** Item list, customization notes, order subtotal, customer name, and countdown timer.

---

### 🖥️ Screen P-02: Food Reel Studio & Video Upload Manager (`/partner/studio`)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [🍲 Partner Studio]  Food Reel Studio — Upload & Monetize Sizzling Videos                               │
├───────────────────┬─────────────────────────────────────────────────────────────────────────────────────┤
│ 📋 Live Orders    │ ┌───────────────────────────────────┐  Dish Details & Tags                          │
│ 🎬 Reel Studio    │ │                                   │  Dish Title: [ Smokey Truffle Beast Burger  ] │
│ 🍽️ Menu Catalog   │ │   DRAG & DROP FOOD REEL VIDEO     │  Base Price: [ $12.99                       ] │
│ 📊 Analytics      │ │        (MP4 / WebM up to 60MB)    │  Category:   [ Burgers ▾                    ] │
│ ⚙️ Store Settings │ │                                   │  Dietary:    (o) Non-Veg   ( ) Pure Veg       │
│ 🚪 Logout         │ │   [ Select Video File from PC ]   │  Spice:      [ Mild | Medium | Hot 🔥       ] │
│                   │ └───────────────────────────────────┘  Prep Time:  [ 15 mins                      ] │
│                   │                                                                                     │
│                   │ Portion Variants Builder:               Add-on Toppings Builder:                    │
│                   │ • Half Portion: $8.99                   • Extra Truffle Mayo: +$1.50                │
│                   │ • Full Portion: $12.99                  • Double Patty:       +$3.50                │
│                   │                                                                                     │
│                   │ [ 🚀 Publish Reel to City Feed ]       [ Save Draft ]                              │
└───────────────────┴─────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 🖥️ Screen P-03: Real-Time Partner Analytics Dashboard (`/partner/analytics`)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [🍲 Partner Studio]  Analytics & Direct Video-to-Order Conversion                                       │
├───────────────────┬─────────────────────────────────────────────────────────────────────────────────────┤
│ 📋 Live Orders    │ ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│ 🎬 Reel Studio    │ │ Reel Views      │  │ Direct Orders   │  │ Conversion Rate │  │ Today's Revenue │  │
│ 🍽️ Menu Catalog   │ │ 84.5k (+18%)    │  │ 142 Orders      │  │ 6.8% (Target 5%)│  │ $1,420.00       │  │
│ 📊 Analytics      │ └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│ ⚙️ Store Settings │                                                                                     │
│ 🚪 Logout         │ 📈 Revenue & Reel Impressions Trend (Last 24 Hours)                                 │
│                   │ [ Interactive Smooth Gradient Line Chart ]                                          │
│                   │                                                                                     │
│                   │ 🏆 Top Converting Food Reels:                                                       │
│                   │ 1. Smokey Truffle Beast Burger  — 42.1k views • 89 orders ($1,156.11)               │
│                   │ 2. Cheesy Truffle Fries         — 24.3k views • 41 orders ($204.59)                 │
└───────────────────┴─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Delivery Partner Rider HUD Screens (Mobile PWA)

---

### 🛵 Screen R-01: Proximity Dispatch Radar (`/rider/radar`)

```
┌──────────────────────────────────────────────────────────┐
│ [🟢 Online • Available for Orders]              [ ⚙️ ]   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│              [ Pulsing GPS Radar Animation ]             │
│                                                          │
│ ⚡ NEW DELIVERY OPPORTUNITY!                              │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ 🏪 The Burger Joint (1.2 km away)                    │ │
│ │ 📍 Delivery to: Miami Beach (2.4 km trip)            │ │
│ │ 💵 Estimated Payout: $7.50 ($5.50 base + $2.00 tip)  │ │
│ │                                                      │ │
│ │ ⏱️ Accept in: 24s [████████████░░░]                  │ │
│ │                                                      │ │
│ │ [ ✅ ACCEPT ORDER ]           [ ❌ PASS / REJECT ]   │ │
│ └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

---

### 🛵 Screen R-02: Doorstep Handover & 4-Digit OTP Verification (`/rider/verify`)

```
┌──────────────────────────────────────────────────────────┐
│ [ ← Order #3082 ]        Customer Handover               │
├──────────────────────────────────────────────────────────┤
│ 📍 Arrived at: Flat 402, Skyline Residency               │
│ 👤 Customer: John Doe (📞 305-555-0199)                  │
│                                                          │
│ ⚠️ Ask customer for their 4-Digit Delivery OTP:          │
│                                                          │
│ ┌───┐   ┌───┐   ┌───┐   ┌───┐                            │
│ │ 8 │   │ 3 │   │ 9 │   │ 2 │                            │
│ └───┘   └───┘   └───┘   └───┘                            │
│                                                          │
│ [ 1 ]   [ 2 ]   [ 3 ]                                    │
│ [ 4 ]   [ 5 ]   [ 6 ]                                    │
│ [ 7 ]   [ 8 ]   [ 9 ]                                    │
│ [   ]   [ 0 ]   [ ⌫ ]                                    │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │        [ ✅ VERIFY OTP & COMPLETE DELIVERY ]          │ │
│ └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

---

## 6. SuperAdmin & Content Moderation Portal (Desktop Web)

---

### 🛡️ Screen A-01: Video Reels Content Moderation Queue (`/admin/moderation`)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [🛡️ SuperAdmin]   Content Moderation Queue — 4 Pending Video Reviews                                   │
├───────────────────┬─────────────────────────────────────────────────────────────────────────────────────┤
│ 🎬 Reel Queue (4) │ ┌───────────────────┐  Flagged Reason: Non-Food Content / Explicit Language         │
│ 🏪 Partner KYC    │ │                   │  Uploader: @RandomUser (Flagged by AI Scanner & 3 Users)      │
│ 📊 System Metrics │ │ [ Video Preview ] │  Dish Title: "Prank Video"                                    │
│ ⚙️ Platform Config│ │                   │  Uploaded: 12 mins ago                                        │
│ 🚪 Logout         │ └───────────────────┘                                                               │
│                   │ [ 🗑️ Delete & Ban Account ]     [ ⚠️ Issue Warning ]     [ ✅ Approve Video ]        │
└───────────────────┴─────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 🛡️ Screen A-02: Restaurant FSSAI & Partner KYC Approvals (`/admin/kyc`)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [🛡️ SuperAdmin]   Partner Verification & KYC Approvals                                                  │
├───────────────────┬─────────────────────────────────────────────────────────────────────────────────────┤
│ 🎬 Reel Queue     │ ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│ 🏪 Partner KYC (2)│ │ Bistro Verde Ristorante • FSSAI License: #10018022008412 • GST: 07AAAAA0000A1Z5│ │
│ 📊 System Metrics │ │ Documents: [ FSSAI Certificate.pdf ]  [ Bank Statement.pdf ]  [ Kitchen Photos ]│ │
│ ⚙️ Platform Config│ │ Coordinates: [ Lat: 25.7617, Lng: -80.1918 ] (Miami Beach)                      │ │
│ 🚪 Logout         │ │ [ ✅ APPROVE RESTAURANT ]              [ ❌ REJECT WITH FEEDBACK ]               │ │
│                   │ └─────────────────────────────────────────────────────────────────────────────────┘ │
└───────────────────┴─────────────────────────────────────────────────────────────────────────────────────┘
```
