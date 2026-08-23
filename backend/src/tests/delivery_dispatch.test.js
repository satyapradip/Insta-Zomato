// src/tests/delivery_dispatch.test.js
//
// ─── WHY THIS TEST EXISTS ─────────────────────────────────────────────────────
// Automated Integration Test Suite for Phase 13:
//   1. Rider Duty Status Toggle (Online / Offline availability)
//   2. Geospatial Candidate Query & 5km Radius Proximity Ranking
//   3. Automated Dispatch Offer & 30s Rejection Cascade via WebSockets
//   4. Order Claiming & Assignment Locking
//   5. Live GPS Location Streaming with Dynamic ETA Calculation
//   6. Rider Compensation & Earnings Summary
// ─────────────────────────────────────────────────────────────────────────────

require("dotenv").config();
const http = require("http");
const { io: ClientIO } = require("socket.io-client");
const { prisma, connectPostgres } = require("../db/prisma");
const app = require("../app");
const { initSocket } = require("../services/socket.services");
const {
  findCandidateRiders,
  autoDispatchOrder,
  acceptDispatchOffer,
  rejectDispatchOffer,
} = require("../services/dispatch.services");
const { calculateDeliveryPayout, getRiderEarningsSummary } = require("../services/earnings.services");

let server;
let serverUrl;
let customerToken, partnerToken, rider1Token, rider2Token;
let customerId, partnerId, rider1Id, rider2Id;
let rider1Socket, rider2Socket;
let foodId, testOrderId;

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
  console.log("  🚀 RUNNING PHASE 13: DELIVERY & AUTO-DISPATCH TESTS");
  console.log("=======================================================\n");

  try {
    // 0. Connect PostgreSQL & Server
    await connectPostgres();

    server = http.createServer(app);
    initSocket(server);

    await new Promise((resolve) => {
      server.listen(0, "127.0.0.1", () => {
        const port = server.address().port;
        serverUrl = `http://127.0.0.1:${port}`;
        console.log(`[Test Server] Running on ${serverUrl}`);
        resolve();
      });
    });

    // Reset any old test riders to offline
    await prisma.deliveryPartner.updateMany({ data: { isOnline: false } });

    // 1. Register Customer, Partner, and 2 Delivery Riders
    console.log("\n--- [Step 1] Registering Entities & Setting Locations ---");
    // Customer
    const custReg = await httpRequest("POST", "/api/auth/user/register", {
      fullName: `Customer Dispatch ${testSuffix}`,
      email: `cust_disp_${testSuffix}@example.com`,
      phone: `9811${String(testSuffix).slice(-6)}`,
      password: "Password@123",
    });
    assert(custReg.status === 201, "Customer register failed");
    customerId = custReg.body.data.user.id || custReg.body.data.user._id;
    customerToken = custReg.body.data.accessToken;

    // Restaurant Partner (Koramangala, Bangalore: 12.9352, 77.6245)
    const partnerReg = await httpRequest("POST", "/api/auth/foodpartner/register", {
      name: "Chef Dispatch",
      email: `chef_disp_${testSuffix}@example.com`,
      phone: `9822${String(testSuffix).slice(-6)}`,
      password: "Password@123",
      restaurantName: "Gourmet Dispatch Hub",
      address: "80 Feet Rd, Koramangala 4th Block, Bangalore",
    });
    assert(partnerReg.status === 201, "Partner register failed");
    partnerId = (partnerReg.body.data.partner && (partnerReg.body.data.partner.id || partnerReg.body.data.partner._id)) ||
                (partnerReg.body.data.foodPartner && (partnerReg.body.data.foodPartner.id || partnerReg.body.data.foodPartner._id));
    partnerToken = partnerReg.body.data.accessToken;

    // Update partner coordinates
    await prisma.foodPartner.update({
      where: { id: partnerId },
      data: { latitude: 12.9352, longitude: 77.6245 },
    });

    // Rider 1 (Close proximity: ~1.2km away at 12.9420, 77.6280)
    const rider1Reg = await httpRequest("POST", "/api/auth/delivery/register", {
      name: `Rider Swift ${testSuffix}`,
      email: `rider1_${testSuffix}@example.com`,
      phone: `9833${String(testSuffix).slice(-6)}`,
      password: "Password@123",
      vehicleType: "bike",
      vehicleNumber: "KA-01-AB-1234",
    });
    assert(rider1Reg.status === 201, "Rider 1 register failed");
    rider1Id = (rider1Reg.body.data.rider && (rider1Reg.body.data.rider.id || rider1Reg.body.data.rider._id)) ||
               (rider1Reg.body.data.deliveryPartner && (rider1Reg.body.data.deliveryPartner.id || rider1Reg.body.data.deliveryPartner._id));
    rider1Token = rider1Reg.body.data.accessToken;

    // Rider 2 (Further away: ~4.1km away at 12.9716, 77.5946)
    const rider2Reg = await httpRequest("POST", "/api/auth/delivery/register", {
      name: `Rider Bolt ${testSuffix}`,
      email: `rider2_${testSuffix}@example.com`,
      phone: `9844${String(testSuffix).slice(-6)}`,
      password: "Password@123",
      vehicleType: "scooter",
      vehicleNumber: "KA-02-CD-5678",
    });
    assert(rider2Reg.status === 201, "Rider 2 register failed");
    rider2Id = (rider2Reg.body.data.rider && (rider2Reg.body.data.rider.id || rider2Reg.body.data.rider._id)) ||
               (rider2Reg.body.data.deliveryPartner && (rider2Reg.body.data.deliveryPartner.id || rider2Reg.body.data.deliveryPartner._id));
    rider2Token = rider2Reg.body.data.accessToken;

    console.log(`✅ Entities registered: Customer (${customerId}), Partner (${partnerId}), Rider 1 (${rider1Id}), Rider 2 (${rider2Id})`);

    // 2. Test Rider Duty Status Toggle (Online / Offline)
    console.log("\n--- [Step 2] Rider Duty Status Toggle (Online / Offline) ---");
    const toggle1 = await httpRequest("PUT", "/api/delivery/toggle-online", null, rider1Token);
    assert(toggle1.status === 200, "Rider 1 toggle online failed");
    assert(toggle1.body.data.isOnline === true, "Rider 1 should be online");

    const toggle2 = await httpRequest("PUT", "/api/delivery/toggle-online", null, rider2Token);
    assert(toggle2.status === 200, "Rider 2 toggle online failed");
    assert(toggle2.body.data.isOnline === true, "Rider 2 should be online");

    // Set initial rider GPS positions
    await prisma.deliveryPartner.update({
      where: { id: rider1Id },
      data: { latitude: 12.9420, longitude: 77.6280, rating: 4.8 },
    });
    await prisma.deliveryPartner.update({
      where: { id: rider2Id },
      data: { latitude: 12.9550, longitude: 77.6100, rating: 4.6 },
    });
    console.log("✅ Both riders toggled ONLINE with GPS positions registered");

    // 3. Connect Sockets for both riders
    console.log("\n--- [Step 3] Connecting Sockets for Delivery Riders ---");
    rider1Socket = await new Promise((resolve, reject) => {
      const socket = ClientIO(serverUrl, {
        auth: { token: rider1Token },
        transports: ["websocket"],
        reconnection: false,
      });
      socket.on("connect", () => resolve(socket));
      socket.on("connect_error", (err) => reject(err));
    });

    rider2Socket = await new Promise((resolve, reject) => {
      const socket = ClientIO(serverUrl, {
        auth: { token: rider2Token },
        transports: ["websocket"],
        reconnection: false,
      });
      socket.on("connect", () => resolve(socket));
      socket.on("connect_error", (err) => reject(err));
    });
    console.log("✅ Rider 1 & Rider 2 sockets connected successfully");

    // 4. Test Geospatial Candidate Query & Proximity Ranking
    console.log("\n--- [Step 4] Candidate Rider Geospatial Matching & Ranking ---");
    const candidates = await findCandidateRiders({
      restaurantLat: 12.9352,
      restaurantLng: 77.6245,
      maxDistanceKm: 5.0,
      limit: 5,
    });
    assert(candidates.length >= 2, "Expected at least 2 candidate riders");
    assert(candidates[0].rider.id === rider1Id, "Closest rider (Rider 1) should be ranked #1");
    console.log(`✅ Ranked candidates: #1 ${candidates[0].rider.name} (${candidates[0].distanceKm}km), #2 ${candidates[1].rider.name} (${candidates[1].distanceKm}km)`);

    // 5. Create Food Item, Place Order & Trigger Auto-Dispatch
    console.log("\n--- [Step 5] Placing Order & Auto-Dispatch Cascading ---");
    // Create food item
    const food = await prisma.food.create({
      data: {
        foodPartnerId: partnerId,
        name: `Dispatch Burger ${testSuffix}`,
        description: "Juicy burger for dispatch test",
        price: 250,
        category: "Burgers",
        video: "https://res.cloudinary.com/test/video/upload/v1/burger.mp4",
        thumbnailUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd",
        isVeg: false,
      },
    });
    foodId = food.id;

    // Add item to cart and place order
    await httpRequest("POST", "/api/cart/add", { foodId, quantity: 2, restaurantId: partnerId }, customerToken);
    const orderRes = await httpRequest("POST", "/api/orders", {
      paymentMethod: "COD",
      deliveryAddress: {
        street: "100ft Ring Rd, BTM Layout, Bangalore",
        city: "Bengaluru",
        state: "Karnataka",
        pincode: "560038",
        location: { coordinates: [77.6101, 12.9165] },
      },
    }, customerToken);
    assert(orderRes.status === 201, `Order placement failed: ${JSON.stringify(orderRes.body)}`);
    testOrderId = orderRes.body.data._id || orderRes.body.data.id;
    console.log(`✅ Order placed (ID: ${testOrderId}, Order #: ${orderRes.body.data.orderNumber})`);

    // Listen for dispatch offer on Rider 1
    const rider1OfferPromise = new Promise((resolve) => {
      rider1Socket.on("dispatch:offer", (data) => resolve(data));
    });

    // Trigger auto-dispatch
    await autoDispatchOrder(testOrderId);

    const rider1Offer = await Promise.race([
      rider1OfferPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout waiting for dispatch:offer on Rider 1")), 4000)),
    ]);
    assert(rider1Offer.orderId === testOrderId, "Rider 1 received wrong orderId");
    assert(rider1Offer.estimatedEarnings > 0, "Missing estimated earnings in offer");
    console.log(`✅ Rider 1 received 'dispatch:offer' via Socket.io (Est. Earnings: ₹${rider1Offer.estimatedEarnings})`);

    // 6. Test Offer Rejection & Instant Cascade to Rider 2
    console.log("\n--- [Step 6] Reject Offer & Instant Cascade to Rider 2 ---");
    const rider2OfferPromise = new Promise((resolve) => {
      rider2Socket.on("dispatch:offer", (data) => resolve(data));
    });

    // Rider 1 rejects offer
    const rejectRes = await httpRequest("POST", `/api/delivery/orders/${testOrderId}/reject`, null, rider1Token);
    assert(rejectRes.status === 200, "Reject offer failed");

    const rider2Offer = await Promise.race([
      rider2OfferPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout waiting for cascaded offer on Rider 2")), 4000)),
    ]);
    assert(rider2Offer.orderId === testOrderId, "Rider 2 cascaded offer mismatch");
    console.log("✅ Dispatch offer successfully cascaded to Rider 2 upon Rider 1 rejection!");

    // 7. Rider 2 Accepts the Dispatch Offer
    console.log("\n--- [Step 7] Rider 2 Accepts Dispatch & Locks Assignment ---");
    const acceptRes = await httpRequest("POST", `/api/delivery/orders/${testOrderId}/accept`, null, rider2Token);
    assert(acceptRes.status === 200, "Rider 2 accept offer failed");
    assert(acceptRes.body.data.order.deliveryPartnerId === rider2Id, "Order deliveryPartnerId mismatch");

    // Verify Rider 2 active profile shows current order
    const profileRes = await httpRequest("GET", "/api/delivery/profile", null, rider2Token);
    assert(profileRes.status === 200, "Get profile failed");
    assert(profileRes.body.data.rider.currentOrderId === testOrderId, "Rider active order not set");
    console.log("✅ Order assignment locked to Rider 2 & profile updated with active order");

    // 8. Test Live GPS Location Streaming with Dynamic ETA
    console.log("\n--- [Step 8] Live GPS Location Streaming & ETA Recalculation ---");
    const locationUpdateRes = await httpRequest("PUT", "/api/delivery/location", {
      latitude: 12.9400,
      longitude: 77.6200,
      heading: 180,
      speed: 28.5,
    }, rider2Token);
    assert(locationUpdateRes.status === 200, "Location update failed");
    assert(locationUpdateRes.body.data.etaMinutes > 0, "ETA minutes not calculated");
    console.log(`✅ Live GPS stream processed: Speed 28.5km/h, Heading 180°, Dynamic ETA ${locationUpdateRes.body.data.etaMinutes} mins`);

    // 9. Test Rider Compensation & Earnings Engine
    console.log("\n--- [Step 9] Rider Earnings & Compensation Engine ---");
    const payoutSample = calculateDeliveryPayout({
      distanceKm: 4.5,
      surgeMultiplier: 1.25,
      tipAmount: 30,
    });
    assert(payoutSample.baseFare === 30, "Base fare should be ₹30");
    assert(payoutSample.distanceFare === (3.5 * 12), "Distance fare mismatch");
    assert(payoutSample.tipAmount === 30, "Tip amount mismatch");
    assert(payoutSample.totalPayout > 100, "Total payout calculation mismatch");
    console.log(`✅ Trip Payout breakdown verified: Base ₹${payoutSample.baseFare} + Dist ₹${payoutSample.distanceFare} + Surge ₹${payoutSample.surgeBonus} + Tip ₹${payoutSample.tipAmount} = Total ₹${payoutSample.totalPayout}`);

    const earningsRes = await httpRequest("GET", "/api/delivery/earnings?period=all", null, rider2Token);
    assert(earningsRes.status === 200, "GET /api/delivery/earnings failed");
    assert(earningsRes.body.data.riderId === rider2Id, "Earnings riderId mismatch");
    console.log("✅ Rider earnings endpoint response verified");

    console.log("\n=======================================================");
    console.log("  🎉 ALL PHASE 13 DELIVERY & DISPATCH TESTS PASSED (100% OK)");
    console.log("=======================================================\n");
  } catch (error) {
    console.error("\n❌ PHASE 13 TEST SUITE FAILED:", error);
    process.exit(1);
  } finally {
    if (rider1Socket) rider1Socket.disconnect();
    if (rider2Socket) rider2Socket.disconnect();
    if (server) server.close();
    await prisma.$disconnect();
    process.exit(0);
  }
}

runTests();
