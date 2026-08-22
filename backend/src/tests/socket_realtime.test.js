// src/tests/socket_realtime.test.js
//
// ─── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
// Automated End-to-End Integration Test Suite for Phase 10:
//   1. Socket.io JWT Handshake Authentication & rejection of forged tokens
//   2. Room routing (user, partner, rider, order, and food reel rooms)
//   3. Real-time kitchen order alerts (order:new)
//   4. Real-time customer order tracking (order:status_update)
//   5. Real-time reel social interactions (food:like_update, food:comment_new)
//   6. Real-time delivery partner live GPS location broadcasts (order:location_update)
// ─────────────────────────────────────────────────────────────────────────────

require("dotenv").config();
const http = require("http");
const { io: ClientIO } = require("socket.io-client");
const { prisma, connectPostgres } = require("../db/prisma");
const app = require("../app");
const { initSocket } = require("../services/socket.services");

let server;
let serverUrl;
let customerToken, partnerToken, riderToken;
let customerId, partnerId, riderId;
let foodId, orderId, orderDeliveryOtp;

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

// Helper to create a connected Socket.io client with a promise
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
function waitForEvent(socket, eventName, timeoutMs = 30000) {
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

async function runTests() {
  console.log("\n=======================================================");
  console.log("⚡ RUNNING PHASE 10: SOCKET.IO REAL-TIME EVENT TESTS");
  console.log("=======================================================\n");

  await connectPostgres();

  // Spin up HTTP and Socket.io server on dynamic available port
  server = http.createServer(app);
  initSocket(server);

  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      serverUrl = `http://127.0.0.1:${port}`;
      console.log(`[TEST SERVER] Running on ${serverUrl}`);
      resolve();
    });
  });

  let customerSocket, partnerSocket, riderSocket;

  try {
    // ── 1. Register Users (Customer, Partner, Rider) ──────────────────────────
    console.log("▶ 1. Registering test customer, restaurant partner, and delivery rider...");
    
    // Register Customer
    const custReg = await httpRequest("POST", "/api/auth/user/register", {
      fullName: "Realtime Tester",
      email: `cust_ws_${testEmailSuffix}@example.com`,
      password: "Password123!",
      phone: `9876${String(testEmailSuffix).slice(-6)}`,
    });
    if (custReg.status !== 201) throw new Error("Failed to register customer: " + JSON.stringify(custReg.body));
    customerId = custReg.body.data.user._id || custReg.body.data.user.id;
    customerToken = custReg.body.data.accessToken;

    // Register Partner
    const partnerReg = await httpRequest("POST", "/api/auth/foodpartner/register", {
      name: "Chef Realtime",
      email: `chef_ws_${testEmailSuffix}@example.com`,
      password: "Password123!",
      phone: `9875${String(testEmailSuffix).slice(-6)}`,
      restaurantName: "Realtime Kitchen Hub",
      address: "123 Speed Lane, Tech City",
    });
    if (partnerReg.status !== 201) throw new Error("Failed to register partner: " + JSON.stringify(partnerReg.body));
    partnerId = (partnerReg.body.data.partner && (partnerReg.body.data.partner._id || partnerReg.body.data.partner.id)) ||
                (partnerReg.body.data.foodPartner && (partnerReg.body.data.foodPartner._id || partnerReg.body.data.foodPartner.id));
    partnerToken = partnerReg.body.data.accessToken;

    // Register Delivery Rider
    const riderReg = await httpRequest("POST", "/api/auth/delivery/register", {
      name: "Rider Flash",
      email: `rider_ws_${testEmailSuffix}@example.com`,
      password: "Password123!",
      phone: `9874${String(testEmailSuffix).slice(-6)}`,
      vehicleType: "bike",
      vehicleNumber: "KA-01-RT-2026",
    });
    if (riderReg.status !== 201) throw new Error("Failed to register rider: " + JSON.stringify(riderReg.body));
    riderId = riderReg.body.data.deliveryPartner._id || riderReg.body.data.deliveryPartner.id;
    riderToken = riderReg.body.data.accessToken;

    console.log("  ✔ Customer, Partner, and Rider registered successfully");

    // ── 2. Test Socket JWT Handshake Security ────────────────────────────────
    console.log("▶ 2. Testing Socket Handshake Authentication & Security...");

    // Test rejection of forged token
    try {
      await createSocketClient("invalid.forged.jwt_token");
      throw new Error("Security Violation: Forged token was incorrectly allowed to connect!");
    } catch (err) {
      if (err.message.includes("Authentication error")) {
        console.log("  ✔ Security Passed: Forged/invalid token rejected during handshake");
      } else {
        throw err;
      }
    }

    // Connect valid sockets
    customerSocket = await createSocketClient(customerToken);
    partnerSocket = await createSocketClient(partnerToken);
    riderSocket = await createSocketClient(riderToken);
    console.log("  ✔ Sockets connected and authenticated: Customer, Partner, Rider");

    // ── 3. Test Food Reel Social Real-Time Events ───────────────────────────
    console.log("▶ 3. Testing Food Reel Social Events (food:like_update & food:comment_new)...");

    // Create a food reel
    const foodItem = await prisma.food.create({
      data: {
        foodPartnerId: partnerId,
        name: "Viral Cheese Pull Pizza",
        description: "Freshly baked artisanal sourdough pizza with extreme cheese pull",
        category: "PIZZA",
        price: 450,
        video: "https://res.cloudinary.com/demo/video/upload/pizza.mp4",
        isVeg: true,
      },
    });
    foodId = foodItem.id;

    // Customer socket joins reel room
    customerSocket.emit("join:reel", foodId);
    await new Promise((r) => setTimeout(r, 200));

    // Setup listener for like update
    const likePromise = waitForEvent(customerSocket, "food:like_update");
    
    // REST call: toggle like
    const likeRes = await httpRequest("POST", `/api/food/${foodId}/like`, {}, customerToken);
    if (likeRes.status !== 200) throw new Error("Failed to like reel: " + JSON.stringify(likeRes.body));

    const likeEvent = await likePromise;
    if (likeEvent.foodId !== foodId || likeEvent.likeCount < 1 || !likeEvent.isLiked) {
      throw new Error("Unexpected like event payload: " + JSON.stringify(likeEvent));
    }
    console.log(`  ✔ Real-Time Like Received: ${likeEvent.foodId} (Likes: ${likeEvent.likeCount})`);

    // Setup listener for comment update
    const commentPromise = waitForEvent(customerSocket, "food:comment_new");

    // REST call: post comment
    const commentRes = await httpRequest(
      "POST",
      `/api/food/${foodId}/comments`,
      { text: "This cheese pull is insane! 🧀🔥" },
      customerToken,
    );
    if (commentRes.status !== 201) throw new Error("Failed to post comment: " + JSON.stringify(commentRes.body));

    const commentEvent = await commentPromise;
    if (commentEvent.foodId !== foodId || !commentEvent.comment.text.includes("cheese pull")) {
      throw new Error("Unexpected comment event payload: " + JSON.stringify(commentEvent));
    }
    console.log(`  ✔ Real-Time Comment Received: "${commentEvent.comment.text}"`);

    // ── 4. Test Live Order Creation Alert for Kitchen (order:new) ────────────
    console.log("▶ 4. Testing Kitchen Real-Time Incoming Order Alert (order:new)...");

    // Add item to cart
    await httpRequest(
      "POST",
      "/api/cart/add",
      { foodId, quantity: 1, restaurantId: partnerId },
      customerToken,
    );

    // Setup listener on partner socket for order:new
    const partnerNewOrderPromise = waitForEvent(partnerSocket, "order:new");

    // Place order
    const orderRes = await httpRequest(
      "POST",
      "/api/orders",
      {
        deliveryAddress: {
          street: "123 Indiranagar 100ft Rd",
          city: "Bengaluru",
          state: "Karnataka",
          pincode: "560038",
          location: { coordinates: [77.6408, 12.9784] },
        },
        paymentMethod: "COD",
      },
      customerToken,
    );
    if (orderRes.status !== 201) throw new Error("Failed to place order: " + JSON.stringify(orderRes.body));

    orderId = orderRes.body.data._id;
    orderDeliveryOtp = orderRes.body.data.deliveryOtp;

    const newOrderEvent = await partnerNewOrderPromise;
    if (!newOrderEvent.order || newOrderEvent.order._id !== orderId) {
      throw new Error("Unexpected new order event payload: " + JSON.stringify(newOrderEvent));
    }
    console.log(`  ✔ Kitchen Received New Order Ding: #${newOrderEvent.order.orderNumber} (₹${newOrderEvent.order.pricing.grandTotal})`);

    // Customer socket joins order tracking room
    customerSocket.emit("join:order", orderId);
    await new Promise((r) => setTimeout(r, 200));

    // ── 5. Test Kitchen Confirmation Broadcast (order:status_update) ─────────
    console.log("▶ 5. Testing Kitchen Confirmation Broadcast (CONFIRMED)...");

    const confirmPromise = waitForEvent(customerSocket, "order:status_update");
    const confirmRes = await httpRequest(
      "PUT",
      `/api/orders/${orderId}/confirm`,
      { prepTimeMinutes: 20 },
      partnerToken,
    );
    if (confirmRes.status !== 200) throw new Error("Failed to confirm order: " + JSON.stringify(confirmRes.body));

    const confirmEvent = await confirmPromise;
    if (confirmEvent.status !== "CONFIRMED") {
      throw new Error("Unexpected status update event: " + JSON.stringify(confirmEvent));
    }
    console.log(`  ✔ Customer received live update: ${confirmEvent.status} (Prep: ${confirmEvent.estimatedPrepTimeMinutes || 20}m)`);

    // Kitchen marks PREPARING
    const prepPromise = waitForEvent(customerSocket, "order:status_update");
    const prepRes = await httpRequest("PUT", `/api/orders/${orderId}/preparing`, {}, partnerToken);
    if (prepRes.status !== 200) throw new Error("Failed to mark order preparing: " + JSON.stringify(prepRes.body));
    const prepEvent = await prepPromise;
    console.log(`  ✔ Customer received live update: ${prepEvent.status}`);

    // ── 6. Test Food Ready & Rider Dispatch Broadcast ────────────────────────
    console.log("▶ 6. Testing Food Ready & Rider Dispatch Broadcast (READY_FOR_PICKUP)...");

    const riderDispatchPromise = waitForEvent(riderSocket, "order:available_for_pickup");
    const customerReadyPromise = waitForEvent(customerSocket, "order:status_update");

    const readyRes = await httpRequest("PUT", `/api/orders/${orderId}/ready`, {}, partnerToken);
    if (readyRes.status !== 200) throw new Error("Failed to mark order ready: " + JSON.stringify(readyRes.body));

    const [dispatchData, readyStatusData] = await Promise.all([
      riderDispatchPromise,
      customerReadyPromise,
    ]);

    if (dispatchData.orderId !== orderId || readyStatusData.status !== "READY_FOR_PICKUP") {
      throw new Error("Dispatch or ready status mismatched");
    }
    console.log(`  ✔ Online Riders Broadcast Received: Order #${dispatchData.orderNumber} ready for pickup`);
    console.log(`  ✔ Customer Received Live Status: ${readyStatusData.status}`);

    // ── 7. Test Rider Assignment & Live GPS Location Streaming ───────────────
    console.log("▶ 7. Testing Rider Assignment & Real-Time GPS Tracking...");

    const assignPromise = waitForEvent(customerSocket, "delivery:assigned");
    const acceptRes = await httpRequest("POST", `/api/orders/${orderId}/accept-delivery`, {}, riderToken);
    if (acceptRes.status !== 200) throw new Error("Failed to accept delivery: " + JSON.stringify(acceptRes.body));

    const assignEvent = await assignPromise;
    console.log(`  ✔ Customer notified: Rider assigned (${assignEvent.riderName || "Rider Flash"})`);

    // Rider marks picked up
    const pickupPromise = waitForEvent(customerSocket, "order:status_update");
    await httpRequest("PUT", `/api/orders/${orderId}/pickup`, {}, riderToken);
    const pickupEvent = await pickupPromise;
    console.log(`  ✔ Customer notified: ${pickupEvent.status}`);

    // Rider updates GPS location (PUT /api/delivery/location)
    const locationPromise = waitForEvent(customerSocket, "order:location_update");
    const locRes = await httpRequest(
      "PUT",
      "/api/delivery/location",
      { latitude: 12.9716, longitude: 77.5946, heading: 90, speed: 35 },
      riderToken,
    );
    if (locRes.status !== 200) throw new Error("Failed to update rider location: " + JSON.stringify(locRes.body));

    const locationEvent = await locationPromise;
    if (!locationEvent.coordinates || locationEvent.coordinates[1] !== 12.9716) {
      throw new Error("Unexpected location payload: " + JSON.stringify(locationEvent));
    }
    console.log(`  ✔ Live GPS Location Received by Customer: Lat ${locationEvent.coordinates[1]}, Lng ${locationEvent.coordinates[0]} (Speed: ${locationEvent.speed} km/h)`);

    // Rider marks OUT_FOR_DELIVERY
    const outPromise = waitForEvent(customerSocket, "order:status_update");
    await httpRequest("PUT", `/api/orders/${orderId}/out-for-delivery`, {}, riderToken);
    const outEvent = await outPromise;
    console.log(`  ✔ Customer notified: ${outEvent.status}`);

    // ── 8. Test Delivery Completion via OTP ──────────────────────────────────
    console.log("▶ 8. Testing Order Delivery Confirmation via OTP...");

    const deliverPromise = waitForEvent(customerSocket, "order:status_update");
    const deliverRes = await httpRequest(
      "PUT",
      `/api/orders/${orderId}/deliver`,
      { otp: orderDeliveryOtp },
      riderToken,
    );
    if (deliverRes.status !== 200) throw new Error("Failed to deliver order: " + JSON.stringify(deliverRes.body));

    const deliverEvent = await deliverPromise;
    if (deliverEvent.status !== "DELIVERED") {
      throw new Error("Unexpected delivery status event: " + JSON.stringify(deliverEvent));
    }
    console.log(`  ✔ Customer received final live status: ${deliverEvent.status} 🎉`);

    console.log("\n=======================================================");
    console.log("🎉 ALL 8 PHASE 10 REAL-TIME SOCKET.IO TESTS PASSED (100%)");
    console.log("=======================================================\n");
  } finally {
    if (customerSocket) customerSocket.disconnect();
    if (partnerSocket) partnerSocket.disconnect();
    if (riderSocket) riderSocket.disconnect();
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
