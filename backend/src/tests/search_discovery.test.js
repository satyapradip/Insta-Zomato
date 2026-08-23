// src/tests/search_discovery.test.js
//
// ─── WHY THIS TEST EXISTS ─────────────────────────────────────────────────────
// Automated Integration Test Suite for Phase 11: Search & Discovery Engine:
//   1. Instant Autocomplete Search Suggestions (`/api/search/suggestions`)
//   2. Multi-field Full-Text Search (Dish titles, descriptions, categories, tags)
//   3. Restaurant Matching (Name, cuisine, address)
//   4. Dynamic Dietary Facet Filters (`isVeg=true`)
//   5. Price Range & Category Filtering (`category`, `minPrice`, `maxPrice`)
//   6. Geospatial Proximity, Road Distance & Dynamic Delivery ETA
//   7. Multi-Criteria Sorting (`price_low_high`, `rating`, `distance`)
//   8. Trending Categories, Popular Keywords & Discovery Aggregations
// ─────────────────────────────────────────────────────────────────────────────

require("dotenv").config();
const http = require("http");
const { prisma, connectPostgres } = require("../db/prisma");
const app = require("../app");
const { calculateHaversineDistance } = require("../services/map.services");

let server;
let serverUrl;
let partnerToken, partnerId;
const testSuffix = Date.now();

// Helper to make JSON HTTP requests
async function httpRequest(method, endpoint, body = null, token = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${serverUrl}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (_) {
    json = { raw: text };
  }

  return { status: res.status, body: json };
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("  🚀 RUNNING PHASE 11: SEARCH & DISCOVERY ENGINE TESTS");
  console.log("=======================================================\n");

  try {
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

    // 1. Register Restaurant Partner & Seed Menu Items
    console.log("\n--- [Step 1] Seeding Restaurant Partner & Discovery Items ---");
    const partnerReg = await httpRequest("POST", "/api/auth/foodpartner/register", {
      name: "Chef Discovery",
      email: `search_chef_${testSuffix}@example.com`,
      phone: `9911${String(testSuffix).slice(-6)}`,
      password: "Password@123",
      restaurantName: `Royal Discovery Kitchen ${testSuffix}`,
      address: "100ft Rd, Indiranagar, Bangalore",
    });
    assert(partnerReg.status === 201, "Partner register failed");
    partnerId = (partnerReg.body.data.partner && (partnerReg.body.data.partner.id || partnerReg.body.data.partner._id)) ||
                (partnerReg.body.data.foodPartner && (partnerReg.body.data.foodPartner.id || partnerReg.body.data.foodPartner._id));
    partnerToken = partnerReg.body.data.accessToken;

    // Set restaurant coordinates (Indiranagar: 12.9784, 77.6408)
    await prisma.foodPartner.update({
      where: { id: partnerId },
      data: { latitude: 12.9784, longitude: 77.6408, isOpen: true },
    });

    // Seed 4 test dishes across different categories & dietary types
    const food1 = await prisma.food.create({
      data: {
        foodPartnerId: partnerId,
        name: `Super Smash Cheeseburger ${testSuffix}`,
        description: "Double patty smashed beef burger with molten cheddar",
        category: "Burgers",
        tags: ["cheesy", "smash", "burger", "fastfood"],
        price: 280,
        video: "https://res.cloudinary.com/demo/video/upload/burger.mp4",
        thumbnailUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd",
        isVeg: false,
        preparationTime: 15,
        likeCount: 42,
      },
    });

    const food2 = await prisma.food.create({
      data: {
        foodPartnerId: partnerId,
        name: `Paneer Tikka Royale Pizza ${testSuffix}`,
        description: "Woodfired sourdough pizza loaded with marinated cottage cheese",
        category: "Pizza",
        tags: ["paneer", "tikka", "pizza", "cheesy"],
        price: 380,
        video: "https://res.cloudinary.com/demo/video/upload/pizza.mp4",
        thumbnailUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591",
        isVeg: true,
        preparationTime: 20,
        likeCount: 88,
      },
    });

    const food3 = await prisma.food.create({
      data: {
        foodPartnerId: partnerId,
        name: `Hyderabadi Dum Biryani ${testSuffix}`,
        description: "Slow-cooked saffron basmati rice with aromatic spices",
        category: "Biryani",
        tags: ["dum", "spicy", "biryani", "rice"],
        price: 320,
        video: "https://res.cloudinary.com/demo/video/upload/biryani.mp4",
        thumbnailUrl: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8",
        isVeg: false,
        preparationTime: 25,
        likeCount: 15,
      },
    });

    const food4 = await prisma.food.create({
      data: {
        foodPartnerId: partnerId,
        name: `Fresh Avocado Glow Salad ${testSuffix}`,
        description: "Organic hass avocado with baby greens and citrus vinaigrette",
        category: "Healthy",
        tags: ["avocado", "healthy", "vegan", "clean"],
        price: 220,
        video: "https://res.cloudinary.com/demo/video/upload/salad.mp4",
        thumbnailUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999",
        isVeg: true,
        preparationTime: 10,
        likeCount: 5,
      },
    });

    console.log(`✅ Seeded 4 diverse food items for partner (${partnerId})`);

    // 2. Test Autocomplete Search Suggestions
    console.log("\n--- [Step 2] Testing Search Autocomplete Suggestions ---");
    const suggestRes = await httpRequest("GET", `/api/search/suggestions?q=bur`);
    assert(suggestRes.status === 200, "Suggestions endpoint failed");
    assert(suggestRes.body.data.suggestions.length > 0, "Expected search suggestions");
    const hasCategoryOrDish = suggestRes.body.data.suggestions.some(
      (s) => s.text.toLowerCase().includes("burger") || s.text.toLowerCase().includes("smash"),
    );
    assert(hasCategoryOrDish, "Expected Burger category or Smash dish in suggestions");
    console.log(`✅ Autocomplete returned ${suggestRes.body.data.suggestions.length} suggestions for query 'bur'`);

    // 3. Test Full-Text Search across Dish Names
    console.log("\n--- [Step 3] Testing Full-Text Search across Dishes ---");
    const searchDishRes = await httpRequest("GET", `/api/search?q=Biryani`);
    assert(searchDishRes.status === 200, "Dish search failed");
    const foundDish = searchDishRes.body.data.foods.find((f) => f.id === food3.id);
    assert(foundDish, "Hyderabadi Dum Biryani was not found in search results");
    assert(foundDish.category === "Biryani", "Category mismatch on found dish");
    console.log(`✅ Full-text query 'Biryani' found: "${foundDish.name}" (Price: ₹${foundDish.price})`);

    // 4. Test Restaurant Name & Keyword Search
    console.log("\n--- [Step 4] Testing Restaurant Discovery Search ---");
    const searchRestRes = await httpRequest("GET", `/api/search?q=Royal%20Discovery`);
    assert(searchRestRes.status === 200, "Restaurant search failed");
    const foundRest = searchRestRes.body.data.restaurants.find((r) => r.id === partnerId);
    assert(foundRest, "Royal Discovery Kitchen was not found under restaurants");
    console.log(`✅ Found restaurant: "${foundRest.restaurantName}" (${foundRest.address})`);

    // 5. Test Dynamic Dietary Facet Filter (isVeg=true)
    console.log("\n--- [Step 5] Testing Dietary Filter (isVeg=true) ---");
    const vegSearchRes = await httpRequest("GET", `/api/search?isVeg=true`);
    assert(vegSearchRes.status === 200, "Veg search failed");
    const allVeg = vegSearchRes.body.data.foods.every((f) => f.isVeg === true);
    assert(allVeg, "Non-veg item incorrectly returned in isVeg=true search");
    assert(vegSearchRes.body.data.facets.dietary.veg > 0, "Veg facet count missing");
    console.log(`✅ Dietary filter verified: Returned ${vegSearchRes.body.data.foods.length} 100% pure vegetarian items`);

    // 6. Test Category & Price Range Filter (Category: Pizza, Price: 300 to 450)
    console.log("\n--- [Step 6] Testing Category & Price Range Bounds ---");
    const catPriceRes = await httpRequest("GET", `/api/search?category=Pizza&minPrice=300&maxPrice=450`);
    assert(catPriceRes.status === 200, "Category & price search failed");
    const pizzaMatch = catPriceRes.body.data.foods.find((f) => f.id === food2.id);
    assert(pizzaMatch, "Paneer Tikka Royale Pizza not found in filtered bounds");
    console.log(`✅ Category + Price bounds verified: Found "${pizzaMatch.name}" at ₹${pizzaMatch.price}`);

    // 7. Test Geospatial Proximity & Delivery ETA Calculation
    console.log("\n--- [Step 7] Testing Geospatial Distance & ETA Computation ---");
    // User at Domlur (12.9610, 77.6387) ~2.0km away from Indiranagar
    const geoSearchRes = await httpRequest("GET", `/api/search?lat=12.9610&lng=77.6387&sortBy=distance`);
    assert(geoSearchRes.status === 200, "Geo search failed");
    const geoFood = geoSearchRes.body.data.foods.find((f) => f.id === food1.id);
    assert(geoFood, "Food item missing in geo search");
    assert(geoFood.distanceKm > 0 && geoFood.distanceKm < 5.0, "Calculated distance out of expected range");
    assert(geoFood.estimatedEtaMinutes > 0, "Delivery ETA not calculated");
    assert(geoFood.deliveryFee > 0, "Delivery fee preview not calculated");
    console.log(`✅ Geospatial ETA verified: Distance ${geoFood.distanceKm}km, Travel ETA ${geoFood.estimatedEtaMinutes} mins, Fee ₹${geoFood.deliveryFee}`);

    // 8. Test Multi-Criteria Sorting (Price Low to High)
    console.log("\n--- [Step 8] Testing Price Ascending Sorting ---");
    const sortRes = await httpRequest("GET", `/api/search?sortBy=price_low_high`);
    assert(sortRes.status === 200, "Price sort search failed");
    const foodsList = sortRes.body.data.foods;
    for (let i = 0; i < foodsList.length - 1; i++) {
      assert(foodsList[i].effectivePrice <= foodsList[i + 1].effectivePrice, `Sort order violated at index ${i}`);
    }
    console.log("✅ Price ascending sorting verified: All items ordered monotonically");

    // 9. Test Trending Categories & Popular Keywords
    console.log("\n--- [Step 9] Testing Trending Discovery & Popular Searches ---");
    const trendRes = await httpRequest("GET", `/api/search/trending`);
    assert(trendRes.status === 200, "Trending endpoint failed");
    assert(trendRes.body.data.categories.length > 0, "Curated categories missing");
    assert(trendRes.body.data.popularKeywords.length > 0, "Popular keywords missing");
    assert(trendRes.body.data.trendingDishes.length > 0, "Trending dishes missing");
    console.log(`✅ Trending discovery returned ${trendRes.body.data.categories.length} categories, ${trendRes.body.data.popularKeywords.length} popular keywords, and ${trendRes.body.data.trendingDishes.length} trending dishes`);

    console.log("\n=======================================================");
    console.log("  🎉 ALL PHASE 11 SEARCH & DISCOVERY TESTS PASSED (100% OK)");
    console.log("=======================================================\n");
  } catch (error) {
    console.error("\n❌ PHASE 11 TEST SUITE FAILED:", error);
    process.exit(1);
  } finally {
    if (server) server.close();
    await prisma.$disconnect();
    process.exit(0);
  }
}

runTests();
