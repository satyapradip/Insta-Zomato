// src/tests/notification_multichannel.test.js
//
// ─── WHY THIS TEST EXISTS ─────────────────────────────────────────────────────
// Automated Integration Test Suite for Phase 12 (Multi-Channel Notification Engine):
//   1. In-App Notification Center:
//      - Creation, unread count tracking, pagination
//      - Mark as read, mark all as read, delete
//   2. Transactional HTML Email Engine:
//      - Invoice template generation & styling
//      - Delivery confirmation template
//      - Safe async dispatch
//   3. SMS / OTP Dispatcher:
//      - 4-digit doorstep delivery PIN sending
//   4. Real-Time WebSocket Notifications:
//      - Instant `notification:new` event receipt via Socket.io
// ─────────────────────────────────────────────────────────────────────────────

require("dotenv").config();
const http = require("http");
const mongoose = require("mongoose");
const { io: ClientIO } = require("socket.io-client");
const { prisma, connectPostgres } = require("../db/prisma");
const connectMongoDB = require("../db/db");
const app = require("../app");
const { initSocket } = require("../services/socket.services");
const Notification = require("../models/notification.models");
const {
  notifyRecipient,
  notifyOrderPlaced,
  notifyOrderOutForDelivery,
  notifyOrderDelivered,
} = require("../services/notification.services");
const {
  renderOrderInvoiceTemplate,
  renderOrderDeliveredTemplate,
  sendEmail,
} = require("../services/email.services");
const { sendOtpSms } = require("../services/sms.services");

let server;
let serverUrl;
let customerToken;
let customerId;
let customerSocket;

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
  console.log("  🚀 RUNNING PHASE 12: MULTI-CHANNEL NOTIFICATION TESTS");
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

    // 1. Register and Login a Test Customer
    console.log("\n--- [Step 1] Customer Registration & Auth ---");
    const customerReg = await httpRequest("POST", "/api/auth/user/register", {
      fullName: `Notif Tester ${testSuffix}`,
      email: `notif_${testSuffix}@example.com`,
      phone: `9899${String(testSuffix).slice(-6)}`,
      password: "Password@123",
    });
    assert(
      customerReg.status === 201,
      `Customer registration failed (Status ${customerReg.status})`
    );
    customerToken = customerReg.body.data.accessToken;
    customerId = customerReg.body.data.user.id || customerReg.body.data.user._id;
    console.log(`✅ Customer registered (ID: ${customerId})`);

    // 2. Connect Socket.io client for real-time notification testing
    console.log("\n--- [Step 2] Socket.io Real-Time Client Connection ---");
    customerSocket = await new Promise((resolve, reject) => {
      const socket = ClientIO(serverUrl, {
        auth: { token: customerToken },
        transports: ["websocket"],
        reconnection: false,
      });
      socket.on("connect", () => resolve(socket));
      socket.on("connect_error", (err) => reject(err));
    });
    assert(customerSocket.connected, "Customer socket failed to connect");
    console.log(`✅ Customer socket connected (Socket ID: ${customerSocket.id})`);

    // 3. Test Real-time In-App Notification Dispatch
    console.log("\n--- [Step 3] Real-Time Notification Dispatch via WebSockets ---");
    const socketPromise = new Promise((resolve) => {
      customerSocket.on("notification:new", (data) => {
        resolve(data);
      });
    });

    const createdNotif = await notifyRecipient({
      recipientId: customerId,
      recipientModel: "User",
      type: "ORDER_PLACED",
      title: "Order #IZ-999 Confirmed! 🍕",
      message: "Your pizza is being prepared by the chef.",
      data: { orderId: "ord-test-1", totalAmount: 499 },
      channels: ["IN_APP"],
    });

    assert(createdNotif !== null, "Notification creation returned null");
    assert(createdNotif.title === "Order #IZ-999 Confirmed! 🍕", "Title mismatch");

    const receivedRealtimeNotif = await Promise.race([
      socketPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("Socket timeout")), 3000)),
    ]);
    assert(receivedRealtimeNotif.title === "Order #IZ-999 Confirmed! 🍕", "Socket payload mismatch");
    console.log("✅ Real-time Socket.io 'notification:new' received successfully!");

    // 4. Test Notification Center REST Endpoints
    console.log("\n--- [Step 4] Notification Center REST Endpoints ---");
    // Create a 2nd notification
    await notifyRecipient({
      recipientId: customerId,
      recipientModel: "User",
      type: "REFUND_CREDITED",
      title: "Refund Credited: ₹150 💰",
      message: "Refund added to your wallet.",
      channels: ["IN_APP"],
    });

    // GET /api/notifications
    const listRes = await httpRequest("GET", "/api/notifications", null, customerToken);
    assert(listRes.status === 200, "GET /api/notifications failed");
    assert(listRes.body.data.notifications.length >= 2, "Expected at least 2 notifications");
    assert(listRes.body.data.unreadCount >= 2, "Expected unread count >= 2");
    console.log(`✅ In-App Notifications listed (Total: ${listRes.body.data.notifications.length}, Unread: ${listRes.body.data.unreadCount})`);

    const firstNotifId = listRes.body.data.notifications[0]._id;

    // PATCH /api/notifications/:id/read
    const markOneRes = await httpRequest("PATCH", `/api/notifications/${firstNotifId}/read`, null, customerToken);
    assert(markOneRes.status === 200, "Mark single notification as read failed");
    assert(markOneRes.body.data.notification.isRead === true, "Notification isRead should be true");
    console.log("✅ Single notification marked as read");

    // PATCH /api/notifications/read-all
    const markAllRes = await httpRequest("PATCH", "/api/notifications/read-all", null, customerToken);
    assert(markAllRes.status === 200, "Mark all notifications as read failed");

    const listAfterAllRead = await httpRequest("GET", "/api/notifications", null, customerToken);
    assert(listAfterAllRead.body.data.unreadCount === 0, "Unread count should be 0 after read-all");
    console.log("✅ All notifications marked as read (Unread count: 0)");

    // DELETE /api/notifications/:id
    const deleteRes = await httpRequest("DELETE", `/api/notifications/${firstNotifId}`, null, customerToken);
    assert(deleteRes.status === 200, "Delete notification failed");
    console.log("✅ Notification deleted successfully");

    // 5. Test Email HTML Templates & Async Email Dispatch
    console.log("\n--- [Step 5] Transactional HTML Email Engine ---");
    const mockOrder = {
      _id: "65d9f0a1b2c3d4e5f6a7b8c9",
      orderNumber: "IZ-88192",
      subtotal: 450,
      deliveryFee: 30,
      tax: 22.5,
      platformFee: 5,
      discountAmount: 50,
      totalAmount: 457.5,
      deliveryOtp: "7741",
      deliveryAddress: { street: "123 Gourmet Blvd, Tech Park" },
      items: [
        { title: "Truffle Burger", quantity: 2, price: 200, variant: { name: "Double Patty" } },
        { title: "Garlic Fries", quantity: 1, price: 50 },
      ],
    };

    const invoiceHtml = renderOrderInvoiceTemplate({
      order: mockOrder,
      user: { name: "Alex Tester" },
      partner: { restaurantName: "The Burger Bistro" },
    });
    assert(invoiceHtml.includes("IZ-88192"), "Invoice HTML missing orderNumber");
    assert(invoiceHtml.includes("Truffle Burger"), "Invoice HTML missing dish item");
    assert(invoiceHtml.includes("7741"), "Invoice HTML missing deliveryOtp");
    console.log("✅ Order Invoice HTML template rendered successfully with items and OTP box");

    const deliveredHtml = renderOrderDeliveredTemplate({
      order: mockOrder,
      user: { name: "Alex Tester" },
    });
    assert(deliveredHtml.includes("Your Order Was Delivered!"), "Delivered HTML invalid");
    console.log("✅ Order Delivered HTML template rendered successfully");

    const emailResult = await sendEmail({
      to: "customer@example.com",
      subject: "Your Insta-Zomato Invoice 🧾",
      html: invoiceHtml,
    });
    assert(emailResult !== null, "sendEmail returned null");
    console.log("✅ Transactional email dispatched in development dry-run mode");

    // 6. Test SMS / OTP Dispatcher
    console.log("\n--- [Step 6] SMS & Doorstep OTP Dispatcher ---");
    const smsResult = await sendOtpSms({
      phone: "+919876543210",
      otp: "9482",
      orderNumber: "#IZ-40921",
    });
    assert(smsResult.success === true, "sendOtpSms failed");
    console.log("✅ 4-Digit Doorstep Delivery OTP SMS dispatched successfully");

    console.log("\n=======================================================");
    console.log("  🎉 ALL PHASE 12 NOTIFICATION TESTS PASSED (100% OK)");
    console.log("=======================================================\n");
  } catch (error) {
    console.error("\n❌ PHASE 12 TEST SUITE FAILED:", error);
    process.exit(1);
  } finally {
    if (customerSocket) customerSocket.disconnect();
    if (server) server.close();
    await prisma.$disconnect();
    process.exit(0);
  }
}

runTests();
