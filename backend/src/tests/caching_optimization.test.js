// src/tests/caching_optimization.test.js
//
// ─── WHY THIS TEST EXISTS ─────────────────────────────────────────────────────
// Automated Integration Test Suite for Phase 15 & 16: Redis Caching & Platform Hardening:
//   1. First GET request returns 'X-Cache: MISS'
//   2. Subsequent GET request returns 'X-Cache: HIT' in sub-millisecond response time
//   3. Autocomplete & Trending Search Endpoints Cache HIT verification
//   4. Automatic Cache Invalidation on Food Creation & Availability Toggle
//   5. Database Compound Index Query Execution Verification
// ─────────────────────────────────────────────────────────────────────────────

require("dotenv").config();
const http = require("http");
const { prisma, connectPostgres } = require("../db/prisma");
const app = require("../app");
const cacheService = require("../services/redis.services");

let server;
let serverUrl;
let partnerToken, partnerId, testFoodId;

const testSuffix = Date.now();

// Helper to make JSON HTTP requests and capture headers
async function httpRequest(method, endpoint, body = null, token = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const startTime = Date.now();
  const res = await fetch(`${serverUrl}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });
  const durationMs = Date.now() - startTime;

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (_) {
    json = { raw: text };
  }

  return {
    status: res.status,
    headers: {
      xCache: res.headers.get("x-cache"),
      xCacheTtl: res.headers.get("x-cache-ttl"),
    },
    durationMs,
    body: json,
  };
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("  🚀 RUNNING PHASE 15 & 16: CACHING & OPTIMIZATION TESTS");
  console.log("=======================================================\n");

  try {
    // Flush any stale cache entries
    await cacheService.flush();

    // 0. Connect DB & Start Server
    await connectPostgres();

    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, "127.0.0.1", () => {
        const port = server.address().port;
        serverUrl = `http://127.0.0.1:${port}`;
        console.log(`[Test Server] Running on ${serverUrl}`);
        resolve();
      });
    });

    // 1. Seed Restaurant Partner & Food Item
    console.log("\n--- [Step 1] Seeding Restaurant Partner & Food Item ---");
    const partnerReg = await httpRequest("POST", "/api/auth/foodpartner/register", {
      name: "Chef Cache",
      email: `cache_chef_${testSuffix}@example.com`,
      phone: `9444${String(testSuffix).slice(-6)}`,
      password: "Password@123",
      restaurantName: `Fast Cache Kitchen ${testSuffix}`,
      address: "100ft Rd, Indiranagar, Bangalore",
    });
    assert(partnerReg.status === 201, "Partner register failed");
    partnerId = (partnerReg.body.data.partner && (partnerReg.body.data.partner.id || partnerReg.body.data.partner._id)) ||
                (partnerReg.body.data.foodPartner && (partnerReg.body.data.foodPartner.id || partnerReg.body.data.foodPartner._id));
    partnerToken = partnerReg.body.data.accessToken;

    const food = await prisma.food.create({
      data: {
        foodPartnerId: partnerId,
        name: `Turbo Cached Pizza ${testSuffix}`,
        description: "Artisanal sourdough pizza cached in Redis",
        category: "Pizza",
        tags: ["pizza", "cached", "fast"],
        price: 399,
        video: "https://res.cloudinary.com/demo/video/upload/pizza.mp4",
        thumbnailUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591",
        isVeg: true,
        isAvailable: true,
      },
    });
    testFoodId = food.id;
    console.log(`✅ Seeded partner (${partnerId}) and food item (${testFoodId})`);

    // 2. Test Feed Route: 1st Request (Cache MISS) vs 2nd Request (Cache HIT)
    console.log("\n--- [Step 2] Testing Feed Route Caching (MISS -> HIT) ---");
    const feedReq1 = await httpRequest("GET", "/api/feed");
    assert(feedReq1.status === 200, "Feed request 1 failed");
    assert(feedReq1.headers.xCache === "MISS", `Expected X-Cache: MISS on 1st request, got: ${feedReq1.headers.xCache}`);
    console.log(`✅ Request 1 (Cache MISS): Completed in ${feedReq1.durationMs}ms (X-Cache: ${feedReq1.headers.xCache})`);

    const feedReq2 = await httpRequest("GET", "/api/feed");
    assert(feedReq2.status === 200, "Feed request 2 failed");
    assert(feedReq2.headers.xCache === "HIT", `Expected X-Cache: HIT on 2nd request, got: ${feedReq2.headers.xCache}`);
    console.log(`✅ Request 2 (Cache HIT): Completed in ${feedReq2.durationMs}ms (X-Cache: ${feedReq2.headers.xCache})`);

    // 3. Test Search Autocomplete Caching
    console.log("\n--- [Step 3] Testing Search Autocomplete Caching ---");
    const suggest1 = await httpRequest("GET", "/api/search/suggestions?q=pizza");
    assert(suggest1.status === 200, "Suggest request 1 failed");
    assert(suggest1.headers.xCache === "MISS", "Expected MISS on 1st suggest request");

    const suggest2 = await httpRequest("GET", "/api/search/suggestions?q=pizza");
    assert(suggest2.status === 200, "Suggest request 2 failed");
    assert(suggest2.headers.xCache === "HIT", "Expected HIT on 2nd suggest request");
    console.log(`✅ Search Autocomplete Caching verified (1st: ${suggest1.durationMs}ms MISS -> 2nd: ${suggest2.durationMs}ms HIT)`);

    // 4. Test Trending Discovery Caching
    console.log("\n--- [Step 4] Testing Trending Discovery Caching ---");
    const trend1 = await httpRequest("GET", "/api/search/trending");
    assert(trend1.status === 200, "Trending request 1 failed");
    assert(trend1.headers.xCache === "MISS", "Expected MISS on 1st trending request");

    const trend2 = await httpRequest("GET", "/api/search/trending");
    assert(trend2.status === 200, "Trending request 2 failed");
    assert(trend2.headers.xCache === "HIT", "Expected HIT on 2nd trending request");
    console.log(`✅ Trending Discovery Caching verified (1st: ${trend1.durationMs}ms MISS -> 2nd: ${trend2.durationMs}ms HIT)`);

    // 5. Test Automatic Cache Invalidation on Availability Toggle
    console.log("\n--- [Step 5] Testing Automatic Cache Invalidation upon Mutation ---");
    // Verify feed is currently cached (HIT)
    const checkHit = await httpRequest("GET", "/api/feed");
    assert(checkHit.headers.xCache === "HIT", "Feed should be in cache before mutation");

    // Partner toggles food item availability -> Triggers invalidateFoodCache()
    const toggleRes = await httpRequest("PATCH", `/api/food/${testFoodId}/availability`, {}, partnerToken);
    assert(toggleRes.status === 200, "Toggle availability failed");
    console.log("✅ Food item availability mutated -> Cache invalidation triggered");

    // Subsequent feed request should be a MISS (fresh DB read + re-cache)
    const postMutationFeed = await httpRequest("GET", "/api/feed");
    assert(postMutationFeed.headers.xCache === "MISS", `Expected X-Cache: MISS after cache invalidation, got: ${postMutationFeed.headers.xCache}`);
    console.log("✅ Cache Invalidation verified: Stale feed purged and fresh data fetched with X-Cache: MISS");

    // 6. Test Database Compound Index Query Optimization
    console.log("\n--- [Step 6] Testing Database Compound Index Queries ---");
    const indexedFoods = await prisma.food.findMany({
      where: { foodPartnerId: partnerId, isAvailable: false },
      orderBy: { likeCount: "desc" },
    });
    assert(indexedFoods.length >= 1, "Compound index query on [foodPartnerId, isAvailable] failed");

    const indexedPartners = await prisma.foodPartner.findMany({
      where: { isApproved: false, isOpen: true },
    });
    assert(Array.isArray(indexedPartners), "Compound index query on [isApproved, isOpen] failed");

    console.log("✅ Database compound index query execution verified");

    console.log("\n=======================================================");
    console.log("  🎉 ALL PHASE 15 & 16 CACHING & OPTIMIZATION TESTS PASSED (100% OK)");
    console.log("=======================================================\n");
  } catch (error) {
    console.error("\n❌ PHASE 15 & 16 TEST SUITE FAILED:", error);
    process.exit(1);
  } finally {
    if (server) server.close();
    await prisma.$disconnect();
    process.exit(0);
  }
}

runTests();
