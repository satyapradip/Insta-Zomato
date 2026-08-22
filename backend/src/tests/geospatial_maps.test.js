// src/tests/geospatial_maps.test.js
//
// ─── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
// Automated End-to-End Integration Test Suite for Phase 9:
//   1. Haversine spherical distance calculation accuracy
//   2. Dynamic delivery fee calculation engine (tiered rates + surge)
//   3. Address Geocoding (text -> coordinates)
//   4. Reverse Geocoding (coordinates -> formatted address)
//   5. Address Autocomplete (place suggestions)
//   6. Nearby Restaurant Discovery with radius filtering and proximity sorting
//   7. Delivery Fee & Travel ETA Estimation API
// ─────────────────────────────────────────────────────────────────────────────

require("dotenv").config();
const http = require("http");
const { prisma, connectPostgres } = require("../db/prisma");
const app = require("../app");
const mapService = require("../services/map.services");

let server;
let serverUrl;
const testEmailSuffix = Date.now();

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

async function runTests() {
  console.log("\n=======================================================");
  console.log("🗺️  RUNNING PHASE 9: GEOSPATIAL & MAPS INTEGRATION TESTS");
  console.log("=======================================================\n");

  await connectPostgres();

  // Spin up test server on dynamic available port
  server = http.createServer(app);
  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      serverUrl = `http://127.0.0.1:${port}`;
      console.log(`[TEST SERVER] Running on ${serverUrl}`);
      resolve();
    });
  });

  try {
    // ── 1. Unit Tests: Haversine Spherical Distance Formula ───────────────────
    console.log("▶ 1. Testing Haversine Distance Formula Accuracy...");

    // Same coordinates = 0 km
    const distZero = mapService.calculateHaversineDistance(12.9716, 77.5946, 12.9716, 77.5946);
    if (distZero !== 0) throw new Error(`Expected 0km, got ${distZero}km`);

    // Indiranagar (12.9784, 77.6408) to Koramangala (12.9352, 77.6245) is ~5.1 km
    const distIndKora = mapService.calculateHaversineDistance(12.9784, 77.6408, 12.9352, 77.6245);
    if (distIndKora < 4.8 || distIndKora > 5.5) {
      throw new Error(`Expected ~5.1km between Indiranagar and Koramangala, got ${distIndKora}km`);
    }
    console.log(`  ✔ Indiranagar to Koramangala distance: ${distIndKora} km`);

    // Bengaluru (12.9716, 77.5946) to Mumbai (19.0760, 72.8777) is ~840 km
    const distBlrMum = mapService.calculateHaversineDistance(12.9716, 77.5946, 19.0760, 72.8777);
    if (distBlrMum < 800 || distBlrMum > 900) {
      throw new Error(`Expected ~840km between Bengaluru and Mumbai, got ${distBlrMum}km`);
    }
    console.log(`  ✔ Bengaluru to Mumbai distance: ${distBlrMum} km`);
    console.log("  ✔ Haversine distance calculations verified accurately");

    // ── 2. Unit Tests: Dynamic Delivery Fee & ETA Engine ──────────────────────
    console.log("▶ 2. Testing Dynamic Delivery Fee & ETA Calculations...");

    // Tier 1: 2.0 km (Within base distance of 3km) -> Base fee ₹30
    const feeTier1 = mapService.calculateDynamicDeliveryFee(2.0);
    if (feeTier1.totalDeliveryFee !== 30 || feeTier1.distanceFee !== 0) {
      throw new Error(`Expected ₹30 for 2.0km, got ₹${feeTier1.totalDeliveryFee}`);
    }
    console.log(`  ✔ Tier 1 (2.0 km): ₹${feeTier1.totalDeliveryFee} (Base: ₹${feeTier1.baseFee}, Dist: ₹${feeTier1.distanceFee})`);

    // Tier 2: 5.0 km -> Base ₹30 + (5 - 3) * ₹10 = ₹50
    const feeTier2 = mapService.calculateDynamicDeliveryFee(5.0);
    if (feeTier2.totalDeliveryFee !== 50 || feeTier2.distanceFee !== 20) {
      throw new Error(`Expected ₹50 for 5.0km, got ₹${feeTier2.totalDeliveryFee}`);
    }
    console.log(`  ✔ Tier 2 (5.0 km): ₹${feeTier2.totalDeliveryFee} (Base: ₹${feeTier2.baseFee}, Dist: ₹${feeTier2.distanceFee})`);

    // Tier 3: 10.0 km -> Base ₹30 + (10 - 3) * ₹10 = ₹100
    const feeTier3 = mapService.calculateDynamicDeliveryFee(10.0);
    if (feeTier3.totalDeliveryFee !== 100 || feeTier3.distanceFee !== 70) {
      throw new Error(`Expected ₹100 for 10.0km, got ₹${feeTier3.totalDeliveryFee}`);
    }
    console.log(`  ✔ Tier 3 (10.0 km): ₹${feeTier3.totalDeliveryFee} (Base: ₹${feeTier3.baseFee}, Dist: ₹${feeTier3.distanceFee})`);

    // Peak Rain Surge Multiplier (1.5x on 5km): ₹50 * 1.5 = ₹75
    const feeSurge = mapService.calculateDynamicDeliveryFee(5.0, { surgeMultiplier: 1.5 });
    if (feeSurge.totalDeliveryFee !== 75) {
      throw new Error(`Expected ₹75 with 1.5x surge, got ₹${feeSurge.totalDeliveryFee}`);
    }
    console.log(`  ✔ Surge (5.0 km @ 1.5x): ₹${feeSurge.totalDeliveryFee} (Base+Dist: ₹50, SurgeFee: ₹${feeSurge.surgeFee})`);

    // Travel ETA Calculation
    const etaData = mapService.calculateRoadDistanceAndEta(12.9716, 77.5946, 12.9784, 77.6408, 15);
    console.log(`  ✔ Road Distance & ETA: Straight ${etaData.straightDistanceKm}km -> Road ${etaData.roadDistanceKm}km, Travel: ${etaData.travelMinutes}m, Total ETA: ${etaData.totalEtaMinutes}m`);

    // ── 3. Geocoding API (POST /api/location/geocode) ──────────────────────────
    console.log("▶ 3. Testing Address Geocoding API (POST /api/location/geocode)...");

    const geocodeRes = await httpRequest("POST", "/api/location/geocode", {
      address: "100 Feet Road, Indiranagar, Bengaluru",
    });
    if (geocodeRes.status !== 200 || !geocodeRes.body.data.latitude) {
      throw new Error("Geocode API failed: " + JSON.stringify(geocodeRes.body));
    }
    console.log(`  ✔ Geocoded Address: Lat ${geocodeRes.body.data.latitude}, Lng ${geocodeRes.body.data.longitude} (Source: ${geocodeRes.body.data.source})`);

    // ── 4. Reverse Geocoding API (POST /api/location/reverse-geocode) ─────────
    console.log("▶ 4. Testing Reverse Geocoding API (POST /api/location/reverse-geocode)...");

    const revGeocodeRes = await httpRequest("POST", "/api/location/reverse-geocode", {
      latitude: 12.9716,
      longitude: 77.5946,
    });
    if (revGeocodeRes.status !== 200 || !revGeocodeRes.body.data.formattedAddress) {
      throw new Error("Reverse Geocode API failed: " + JSON.stringify(revGeocodeRes.body));
    }
    console.log(`  ✔ Reverse Geocoded: "${revGeocodeRes.body.data.formattedAddress}" (City: ${revGeocodeRes.body.data.city})`);

    // ── 5. Places Autocomplete API (POST /api/location/autocomplete) ──────────
    console.log("▶ 5. Testing Places Autocomplete API (POST /api/location/autocomplete)...");

    const autoRes = await httpRequest("POST", "/api/location/autocomplete", {
      query: "Koramangala",
    });
    if (autoRes.status !== 200 || !Array.isArray(autoRes.body.data) || autoRes.body.data.length === 0) {
      throw new Error("Autocomplete API failed: " + JSON.stringify(autoRes.body));
    }
    console.log(`  ✔ Autocomplete returned ${autoRes.body.data.length} suggestion(s): "${autoRes.body.data[0].description}"`);

    // ── 6. Nearby Restaurants Discovery API (GET /api/location/nearby-restaurants)
    console.log("▶ 6. Testing Nearby Restaurants Discovery API...");

    // Create 2 test restaurants in database:
    // Partner 1: Nearby in Indiranagar (Lat: 12.9784, Lng: 77.6408) ~ 1.5 km
    const partnerNearby = await prisma.foodPartner.create({
      data: {
        name: "Chef Close",
        email: `close_${testEmailSuffix}@example.com`,
        password: "hashedPassword123",
        phone: `9871${String(testEmailSuffix).slice(-6)}`,
        restaurantName: "Indiranagar Biryani House",
        address: "100ft Road, Indiranagar",
        city: "Bengaluru",
        latitude: 12.9784,
        longitude: 77.6408,
        cuisine: ["Biryani", "Mughlai"],
        isOpen: true,
        isApproved: true,
      },
    });

    // Partner 2: Far away in Outer Devanahalli (Lat: 13.2437, Lng: 77.7126) ~ 32 km
    const partnerFar = await prisma.foodPartner.create({
      data: {
        name: "Chef Far",
        email: `far_${testEmailSuffix}@example.com`,
        password: "hashedPassword123",
        phone: `9872${String(testEmailSuffix).slice(-6)}`,
        restaurantName: "Airport Highway Dhaba",
        address: "Devanahalli Highway",
        city: "Bengaluru",
        latitude: 13.2437,
        longitude: 77.7126,
        cuisine: ["North Indian"],
        isOpen: true,
        isApproved: true,
      },
    });

    // User location: Indiranagar Metro (Lat: 12.9783, Lng: 77.6387)
    const nearbyRes = await httpRequest(
      "GET",
      `/api/location/nearby-restaurants?latitude=12.9783&longitude=77.6387&radius=5`,
    );

    if (nearbyRes.status !== 200 || !Array.isArray(nearbyRes.body.data.restaurants)) {
      throw new Error("Nearby restaurants API failed: " + JSON.stringify(nearbyRes.body));
    }

    const foundIds = nearbyRes.body.data.restaurants.map((r) => r.id || r._id);
    if (!foundIds.includes(partnerNearby.id)) {
      throw new Error("Expected nearby restaurant to be found within 5km radius");
    }
    if (foundIds.includes(partnerFar.id)) {
      throw new Error("Far restaurant (32km) should have been filtered out by 5km radius");
    }

    const nearbyItem = nearbyRes.body.data.restaurants.find((r) => r.id === partnerNearby.id || r._id === partnerNearby.id);
    console.log(`  ✔ Nearby Restaurant found: "${nearbyItem.restaurantName}" (Distance: ${nearbyItem.distanceKm} km, Fee: ₹${nearbyItem.deliveryFee}, ETA: ${nearbyItem.estimatedDeliveryMinutes}m)`);
    console.log(`  ✔ Distant Restaurant (>30km) correctly excluded from 5km radius filter`);

    // ── 7. Delivery Estimate API (GET /api/location/delivery-estimate) ─────────
    console.log("▶ 7. Testing Delivery Estimate API (GET /api/location/delivery-estimate)...");

    const estimateRes = await httpRequest(
      "GET",
      `/api/location/delivery-estimate?partnerId=${partnerNearby.id}&latitude=12.9783&longitude=77.6387`,
    );

    if (estimateRes.status !== 200 || !estimateRes.body.data.routing || !estimateRes.body.data.deliveryFee) {
      throw new Error("Delivery estimate API failed: " + JSON.stringify(estimateRes.body));
    }

    const est = estimateRes.body.data;
    console.log(`  ✔ Delivery Estimate for ${est.partner.restaurantName}:`);
    console.log(`      Road Distance: ${est.routing.roadDistanceKm} km`);
    console.log(`      Travel Time: ${est.routing.travelMinutes} mins`);
    console.log(`      Total ETA: ${est.routing.totalEtaMinutes} mins`);
    console.log(`      Calculated Delivery Fee: ₹${est.deliveryFee.totalDeliveryFee}`);

    console.log("\n=======================================================");
    console.log("🎉 ALL 7 PHASE 9 GEOSPATIAL & MAPS TESTS PASSED (100%)");
    console.log("=======================================================\n");
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ TEST SUITE FAILED:", err);
    process.exit(1);
  });
