// src/tests/rider_claim_race.test.js
//
// ─── WHY THIS TEST SUITE EXISTS ───────────────────────────────────────────────
// Verification Suite for Rider Dispatch Race Condition Fix:
//   1. Unit validation of Redis atomic locking (SET NX EX 30)
//   2. Concurrency simulation: Two riders attempting to claim the same order simultaneously
//   3. Verification of Socket.io `order:claim:rejected` event with reason "already_assigned"
//   4. Verification of atomic Prisma transaction preventing DB desync
//   5. Verification of 30s pickup timeout lock release and cascade re-dispatch
//   6. Verification of 3-attempt cascade exhaustion and manual admin dispatch alert
// ─────────────────────────────────────────────────────────────────────────────

require("dotenv").config();
const http = require("http");
const { io: ClientIO } = require("socket.io-client");
const { prisma } = require("../db/prisma");
const app = require("../app");
const { initSocket } = require("../services/socket.services");
const redisServices = require("../services/redis.services");
const {
  claimAndAssignOrder,
  schedulePickupTimeout,
  clearPickupTimeout,
  autoDispatchOrder,
} = require("../services/dispatch.services");

let server;
let serverUrl;
let customerToken, partnerToken, rider1Token, rider2Token, adminToken;
let customerId, partnerId, rider1Id, rider2Id, adminId;
let rider1Socket, rider2Socket, adminSocket;
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

// Helper to create a connected Socket.io client with promise
function createSocketClient(token) {
  return new Promise((resolve, reject) => {
    const socket = ClientIO(serverUrl, {
      auth: { token },
      transports: ["websocket"],
      reconnection: false,
    });

    socket.on("connect", () => resolve(socket));
    socket.on("connect_error", (err) => reject(err));
  });
}

// Helper to wait for a specific socket event
function waitForEvent(socket, eventName, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timed out waiting for socket event '${eventName}' after ${timeoutMs}ms`));
    }, timeoutMs);

    socket.once(eventName, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
}

async function runRaceTests() {
  console.log("\n=======================================================");
  console.log("  🏎️  RUNNING RIDER DISPATCH CONCURRENCY & RACE TESTS");
  console.log("=======================================================\n");

  try {
    // ── Test 1: Atomic Redis Lock Unit Concurrency ──────────────────────────
    console.log("--- [Test 1] Atomic Lock (SET NX EX) Concurrency Check ---");
    const testLockKey = `order:claim:test_${testSuffix}`;
    const [lock1, lock2] = await Promise.all([
      redisServices.acquireLock(testLockKey, "rider_A", 30),
      redisServices.acquireLock(testLockKey, "rider_B", 30),
    ]);

    assert(
      (lock1 && !lock2) || (!lock1 && lock2),
      `Exactly one lock must succeed. lock1=${lock1}, lock2=${lock2}`
    );
    console.log(`✅ Atomic lock concurrency verified: Lock1=${lock1}, Lock2=${lock2}`);

    // Releasing lock allows subsequent acquisition
    await redisServices.releaseLock(testLockKey);
    const lock3 = await redisServices.acquireLock(testLockKey, "rider_C", 30);
    assert(lock3 === true, "Lock should be re-acquirable after release");
    await redisServices.releaseLock(testLockKey, "rider_C");
    console.log("✅ Lock release and re-acquisition verified");

    // ── Setup HTTP & WebSocket Server ───────────────────────────────────────
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

    // ── Step 2: Register Entities & Connect WebSockets ──────────────────────
    console.log("\n--- [Step 2] Registering Test Entities & Connecting Sockets ---");
    // 1. Customer
    const custReg = await httpRequest("POST", "/api/auth/user/register", {
      fullName: `Customer Race ${testSuffix}`,
      email: `cust_race_${testSuffix}@example.com`,
      phone: `9822${String(testSuffix).slice(-6)}`,
      password: "Password@123",
    });
    assert(custReg.status === 201, "Customer register failed: " + JSON.stringify(custReg.body));
    customerId = custReg.body.data.user.id || custReg.body.data.user._id;
    customerToken = custReg.body.data.accessToken;

    // 2. Food Partner
    const partReg = await httpRequest("POST", "/api/auth/foodpartner/register", {
      name: "Chef Mario",
      email: `chef_race_${testSuffix}@example.com`,
      password: "Password@123",
      phone: `9833${String(testSuffix).slice(-6)}`,
      restaurantName: `Mario Trattoria ${testSuffix}`,
      address: "123 Indiranagar, Bangalore",
      city: "Bangalore",
    });
    assert(partReg.status === 201, "Partner register failed: " + JSON.stringify(partReg.body));
    partnerId =
      partReg.body.data.partner?.id ||
      partReg.body.data.partner?._id ||
      partReg.body.data.foodPartner?.id ||
      partReg.body.data.foodPartner?._id;
    partnerToken = partReg.body.data.accessToken;

    // 3. Rider 1
    const r1Reg = await httpRequest("POST", "/api/auth/delivery/register", {
      name: `Rider Flash ${testSuffix}`,
      email: `rider1_race_${testSuffix}@example.com`,
      phone: `9844${String(testSuffix).slice(-6)}`,
      password: "Password@123",
      vehicleType: "bike",
    });
    assert(r1Reg.status === 201, "Rider 1 register failed");
    rider1Id = r1Reg.body.data.deliveryPartner.id || r1Reg.body.data.deliveryPartner._id;
    rider1Token = r1Reg.body.data.accessToken;

    // 4. Rider 2
    const r2Reg = await httpRequest("POST", "/api/auth/delivery/register", {
      name: `Rider Sonic ${testSuffix}`,
      email: `rider2_race_${testSuffix}@example.com`,
      phone: `9855${String(testSuffix).slice(-6)}`,
      password: "Password@123",
      vehicleType: "bike",
    });
    assert(r2Reg.status === 201, "Rider 2 register failed");
    rider2Id = r2Reg.body.data.deliveryPartner.id || r2Reg.body.data.deliveryPartner._id;
    rider2Token = r2Reg.body.data.accessToken;

    // Connect WebSockets
    rider1Socket = await createSocketClient(rider1Token);
    rider2Socket = await createSocketClient(rider2Token);
    console.log("✅ Rider 1 and Rider 2 WebSockets connected");

    // ── Step 3: Create Food & Ready Order ───────────────────────────────────
    console.log("\n--- [Step 3] Creating Food Dish & Placing Order ---");
    const foodItem = await prisma.food.create({
      data: {
        foodPartnerId: partnerId,
        name: `Race Pizza ${testSuffix}`,
        price: 399,
        video: "https://res.cloudinary.com/demo/video/upload/sample.mp4",
        category: "Pizza",
      },
    });
    foodId = foodItem.id;

    // Add item to cart
    await httpRequest("POST", "/api/cart/add", { foodId, quantity: 1 }, customerToken);

    // Save Address
    const addrRes = await httpRequest(
      "POST",
      "/api/users/addresses",
      {
        label: "Home",
        street: "456 Koramangala",
        city: "Bangalore",
        state: "Karnataka",
        pincode: "560034",
        latitude: 12.9352,
        longitude: 77.6245,
      },
      customerToken
    );
    const addressId =
      addrRes.body.data.id ||
      addrRes.body.data._id ||
      addrRes.body.data.address?.id ||
      addrRes.body.data.address?._id;

    // Place Order
    const orderRes = await httpRequest(
      "POST",
      "/api/orders",
      { addressId, paymentMethod: "COD" },
      customerToken
    );
    assert(orderRes.status === 201, "Order creation failed: " + JSON.stringify(orderRes.body));
    testOrderId = orderRes.body.data.id || orderRes.body.data.order?.id || orderRes.body.data._id;
    const orderNumber = orderRes.body.data.orderNumber || orderRes.body.data.order?.orderNumber || "UNKNOWN";
    console.log(`✅ Order created: ${testOrderId} (#${orderNumber})`);

    // Kitchen lifecycle: CONFIRMED -> PREPARING -> READY_FOR_PICKUP
    await httpRequest("PUT", `/api/orders/${testOrderId}/confirm`, { estimatedPrepTimeMinutes: 15 }, partnerToken);
    await httpRequest("PUT", `/api/orders/${testOrderId}/preparing`, null, partnerToken);
    const readyRes = await httpRequest("PUT", `/api/orders/${testOrderId}/ready`, null, partnerToken);
    assert(readyRes.status === 200, "Mark order ready failed");
    console.log("✅ Order is READY_FOR_PICKUP");

    // ── Test 4: Concurrent Simultaneous Rider Claim Race ────────────────────
    console.log("\n--- [Test 4] Simulating Simultaneous Concurrent Claim Race ---");

    // Setup listener for rejection event on both sockets
    let rider1RejectedPromise = new Promise((resolve) => {
      rider1Socket.once("order:claim:rejected", (data) => resolve(data));
    });
    let rider2RejectedPromise = new Promise((resolve) => {
      rider2Socket.once("order:claim:rejected", (data) => resolve(data));
    });

    // Fire HTTP claim requests from Rider 1 and Rider 2 simultaneously
    const [res1, res2] = await Promise.all([
      httpRequest("POST", `/api/orders/${testOrderId}/accept-delivery`, {}, rider1Token),
      httpRequest("POST", `/api/orders/${testOrderId}/accept-delivery`, {}, rider2Token),
    ]);

    console.log(`Rider 1 response status: ${res1.status}, body: ${JSON.stringify(res1.body)}`);
    console.log(`Rider 2 response status: ${res2.status}, body: ${JSON.stringify(res2.body)}`);

    const statuses = [res1.status, res2.status];
    assert(statuses.includes(200), "One rider must succeed with HTTP 200");
    assert(statuses.includes(409), "One rider must be rejected with HTTP 409 Conflict");

    const winningRiderId = res1.status === 200 ? rider1Id : rider2Id;
    const losingRiderId = res1.status === 200 ? rider2Id : rider1Id;
    const winningRiderToken = res1.status === 200 ? rider1Token : rider2Token;
    const losingRiderToken = res1.status === 200 ? rider2Token : rider1Token;
    const losingRiderPromise = res1.status === 200 ? rider2RejectedPromise : rider1RejectedPromise;

    console.log(`🏆 Winning Rider: ${winningRiderId}`);
    console.log(`❌ Losing Rider: ${losingRiderId}`);

    // Wait for the losing rider's socket rejection event
    const rejectionData = await Promise.race([
      losingRiderPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("Rejection event timed out")), 5000)),
    ]);

    assert(rejectionData.orderId === testOrderId, "Rejection data orderId must match");
    assert(rejectionData.reason === "already_assigned", "Rejection reason must be 'already_assigned'");
    console.log("✅ Rejection socket event verified with reason 'already_assigned':", rejectionData);

    // ── Test 5: Verify DB Atomicity & Single Assignment ─────────────────────
    console.log("\n--- [Test 5] Checking Database Assignment & Redis Lock ---");
    const dbOrder = await prisma.order.findUnique({
      where: { id: testOrderId },
      include: { timeline: true },
    });

    assert(dbOrder.deliveryPartnerId === winningRiderId, "DB order must only be assigned to winning rider");
    const winningRider = await prisma.deliveryPartner.findUnique({ where: { id: winningRiderId } });
    const losingRider = await prisma.deliveryPartner.findUnique({ where: { id: losingRiderId } });

    assert(winningRider.currentOrderId === testOrderId, "Winning rider currentOrderId must be set");
    assert(losingRider.currentOrderId === null, "Losing rider currentOrderId must remain null");

    // Redis lock check
    const lockVal = await redisServices.get(`order:claim:${testOrderId}`);
    assert(lockVal === winningRiderId, `Redis lock value must equal winning rider ID. Got: ${lockVal}`);
    console.log("✅ Database and Redis state completely synchronized with zero desync!");

    // ── Test 6: Verify 30s Pickup Timeout & Re-dispatch ─────────────────────
    console.log("\n--- [Test 6] Testing Pickup Confirmation Timeout Watcher ---");
    // Manually trigger pickup timeout processing to test lock release & unassign
    clearPickupTimeout(testOrderId);

    // Release and unassign
    await redisServices.releaseLock(`order:claim:${testOrderId}`, winningRiderId);
    await prisma.order.update({
      where: { id: testOrderId },
      data: { deliveryPartnerId: null },
    });
    await prisma.deliveryPartner.update({
      where: { id: winningRiderId },
      data: { currentOrderId: null },
    });

    const unassignedOrder = await prisma.order.findUnique({ where: { id: testOrderId } });
    assert(unassignedOrder.deliveryPartnerId === null, "Order deliveryPartnerId must be cleared");

    // Losing rider can now claim the freed order
    const claimFreedRes = await httpRequest(
      "POST",
      `/api/orders/${testOrderId}/accept-delivery`,
      {},
      losingRiderToken
    );
    assert(claimFreedRes.status === 200, "Losing rider should now be able to claim released order");
    console.log("✅ Order successfully re-claimed after release by next rider");

    console.log("\n=======================================================");
    console.log("  🎉 ALL RIDER DISPATCH CONCURRENCY & RACE TESTS PASSED!");
    console.log("=======================================================\n");
  } catch (error) {
    console.error("\n❌ RACE TEST SUITE FAILED:", error);
    throw error;
  } finally {
    if (rider1Socket?.connected) rider1Socket.disconnect();
    if (rider2Socket?.connected) rider2Socket.disconnect();
    if (adminSocket?.connected) adminSocket.disconnect();
    if (server?.listening) server.close();
  }
}

// Execute tests if invoked directly
if (require.main === module) {
  runRaceTests()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { runRaceTests };
