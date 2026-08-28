// src/tests/idempotency_protection.test.js
//
// ─── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
// Comprehensive test suite for idempotency protection:
//   1. Duplicate order creation prevention with Idempotency-Key header (Redis TTL)
//   2. Duplicate Razorpay webhook delivery protection (PaymentRecord lookup)
//   3. Duplicate wallet credit protection (referenceId idempotency guard)
// ─────────────────────────────────────────────────────────────────────────────

require("dotenv").config();
const http = require("http");
const assert = require("assert");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const app = require("../app");
const { prisma, connectPostgres } = require("../db/prisma");
const redisServices = require("../services/redis.services");
const walletService = require("../services/wallet.services");
const config = require("../config/index");

let server;
let baseUrl;

async function request(method, path, body = null, headers = {}) {
  const url = new URL(path, baseUrl);
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: json,
        });
      });
    });

    req.on("error", reject);
    if (body) {
      req.write(typeof body === "string" ? body : JSON.stringify(body));
    }
    req.end();
  });
}

function extractCookie(setCookieHeaders, cookieName) {
  if (!setCookieHeaders) return null;
  const headerArray = Array.isArray(setCookieHeaders)
    ? setCookieHeaders
    : [setCookieHeaders];
  for (const h of headerArray) {
    const match = h.match(new RegExp(`^${cookieName}=([^;]+)`));
    if (match) return match[1];
  }
  return null;
}

async function runIdempotencyTestSuite() {
  console.log("\n=======================================================");
  console.log("🛡️  RUNNING IDEMPOTENCY & DUPLICATE PROTECTION TESTS");
  console.log("=======================================================\n");

  await connectPostgres();

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[TEST SERVER] Running on ${baseUrl}`);

  const testSuffix = Math.floor(1000 + Math.random() * 9000);
  const customerEmail = `cust_idem_${testSuffix}@example.com`;
  const partnerEmail = `rest_idem_${testSuffix}@example.com`;
  const password = "Password@123";

  let customerToken = "";
  let customerId = "";
  let partnerId = "";
  let foodId = "";

  try {
    // ── STEP 1: Register Test Customer & Food Partner ────────────────────────
    console.log("▶ 1. Setting up test customer and restaurant partner...");
    const custReg = await request("POST", "/api/auth/user/register", {
      fullName: "Pooja Hegde",
      email: customerEmail,
      password,
      phone: "9876501234",
    });
    assert.strictEqual(custReg.status, 201, "Customer registration failed");
    customerId = custReg.body.data.user.id;
    customerToken = extractCookie(custReg.headers["set-cookie"], "accessToken");

    const partReg = await request("POST", "/api/auth/foodpartner/register", {
      name: "Chef Vikas",
      email: partnerEmail,
      password,
      phone: "9123450987",
      restaurantName: `Idempotency Bistro ${testSuffix}`,
      fssaiLicenseNumber: "12345678901299",
    });
    assert.strictEqual(partReg.status, 201, "Partner registration failed");
    partnerId = partReg.body.data.partner.id || partReg.body.data.partner._id;

    // Create dish
    const food = await prisma.food.create({
      data: {
        foodPartnerId: partnerId,
        name: "Artisan Truffle Pizza",
        description: "Woodfired pizza with truffle oil and burrata",
        price: 499,
        discountedPrice: 450,
        category: "Pizza",
        video: "https://res.cloudinary.com/demo/video/upload/pizza.mp4",
        isVeg: true,
        isAvailable: true,
      },
    });
    foodId = food.id;
    console.log("  ✔ Test users and menu items initialized");

    // ── STEP 2: Order Creation Idempotency (First Request) ────────────────────
    console.log("▶ 2. Testing Order Creation with Idempotency-Key Header (First Submission)...");
    await request(
      "POST",
      "/api/cart/add",
      { foodId, quantity: 2 },
      { Cookie: `accessToken=${customerToken}` },
    );

    const idempotencyKey1 = `idem-order-key-${uuidv4()}`;
    const orderPayload = {
      deliveryAddress: {
        label: "Home",
        street: "100ft Road, Indiranagar",
        city: "Bengaluru",
        state: "Karnataka",
        pincode: "560038",
        coordinates: [77.6408, 12.9784],
      },
      paymentMethod: "COD",
    };

    const firstOrderRes = await request(
      "POST",
      "/api/orders",
      orderPayload,
      {
        Cookie: `accessToken=${customerToken}`,
        "Idempotency-Key": idempotencyKey1,
      },
    );

    assert.strictEqual(firstOrderRes.status, 201, "First order placement should return 201 Created");
    const firstOrderId = firstOrderRes.body.data._id || firstOrderRes.body.data.id;
    const firstOrderNum = firstOrderRes.body.data.orderNumber;
    assert.ok(firstOrderId, "First order must return valid ID");
    console.log(`  ✔ First order created: #${firstOrderNum} (ID: ${firstOrderId}) with HTTP 201`);

    // ── STEP 3: Order Creation Idempotency (Duplicate Submission) ─────────────
    console.log("▶ 3. Testing Duplicate Order Submission with SAME Idempotency-Key...");
    const duplicateOrderRes = await request(
      "POST",
      "/api/orders",
      orderPayload,
      {
        Cookie: `accessToken=${customerToken}`,
        "Idempotency-Key": idempotencyKey1,
      },
    );

    assert.strictEqual(
      duplicateOrderRes.status,
      200,
      "Duplicate order submission with same Idempotency-Key must return 200 OK",
    );
    const duplicateOrderId = duplicateOrderRes.body.data._id || duplicateOrderRes.body.data.id;
    const duplicateOrderNum = duplicateOrderRes.body.data.orderNumber;
    assert.strictEqual(
      duplicateOrderId,
      firstOrderId,
      "Idempotent response must return the original order ID",
    );
    assert.strictEqual(
      duplicateOrderNum,
      firstOrderNum,
      "Idempotent response must return the original order number",
    );

    // Verify DB count: only 1 order should exist for this key
    const totalOrdersForUser = await prisma.order.count({ where: { userId: customerId } });
    assert.strictEqual(totalOrdersForUser, 1, "Database should contain exactly 1 order (no duplicates)");
    console.log("  ✔ Idempotent duplicate handled cleanly: HTTP 200 returned original order without creating duplicates");

    // ── STEP 4: Razorpay Webhook First Delivery (payment.captured) ────────────
    console.log("▶ 4. Testing Razorpay Webhook Initial Processing (payment.captured)...");
    const webhookRzpOrderId = `order_rzp_${Date.now()}`;
    const webhookPaymentId = `pay_idem_${Date.now()}`;

    // Update order with razorpayOrderId to link webhook
    await prisma.order.update({
      where: { id: firstOrderId },
      data: { razorpayOrderId: webhookRzpOrderId },
    });

    const webhookPayload = JSON.stringify({
      event: "payment.captured",
      account_id: "acc_test_razorpay",
      payload: {
        payment: {
          entity: {
            id: webhookPaymentId,
            order_id: webhookRzpOrderId,
            amount: 95000, // ₹950.00
            currency: "INR",
            status: "captured",
          },
        },
      },
    });

    const webhookSecret = config.razorpay.webhookSecret || config.razorpay.keySecret || "mock_webhook_secret";
    const webhookSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(webhookPayload)
      .digest("hex");

    const firstWebhookRes = await request(
      "POST",
      "/api/payment/webhook",
      webhookPayload,
      { "x-razorpay-signature": webhookSignature },
    );

    assert.strictEqual(firstWebhookRes.status, 200, "Initial webhook processing failed");

    const paidOrder = await prisma.order.findUnique({
      where: { id: firstOrderId },
      include: { paymentRecords: true },
    });
    assert.strictEqual(paidOrder.paymentStatus, "PAID", "Order payment status must be PAID");
    assert.strictEqual(paidOrder.paymentRecords.length, 1, "Exactly 1 PaymentRecord should be created");
    console.log("  ✔ Webhook successfully processed: Order marked PAID and 1 PaymentRecord created");

    // ── STEP 5: Razorpay Webhook Duplicate Replay ─────────────────────────────
    console.log("▶ 5. Testing Duplicate Razorpay Webhook Replay for SAME payment_id...");
    const duplicateWebhookRes = await request(
      "POST",
      "/api/payment/webhook",
      webhookPayload,
      { "x-razorpay-signature": webhookSignature },
    );

    assert.strictEqual(
      duplicateWebhookRes.status,
      200,
      "Duplicate webhook delivery must return 200 OK",
    );
    assert.strictEqual(
      duplicateWebhookRes.body.idempotent,
      true,
      "Duplicate webhook response must indicate idempotent processing",
    );

    // Verify PaymentRecord count in DB remains exactly 1
    const postReplayOrder = await prisma.order.findUnique({
      where: { id: firstOrderId },
      include: { paymentRecords: true },
    });
    assert.strictEqual(
      postReplayOrder.paymentRecords.length,
      1,
      "PaymentRecord count must remain 1 after webhook duplicate replay",
    );
    console.log("  ✔ Webhook duplicate replay safely ignored without duplicate PaymentRecords");

    // ── STEP 6: Wallet Credit Idempotency ────────────────────────────────────
    console.log("▶ 6. Testing Digital Wallet Credit Idempotency (referenceId Guard)...");
    const walletRefId = `wref_test_${Date.now()}`;
    const initialCredit = await walletService.creditWallet({
      userId: customerId,
      amount: 250,
      description: "Promotional Cash Credit",
      referenceId: walletRefId,
    });
    const balanceAfterFirstCredit = initialCredit.wallet.balance;

    // Attempt second credit with SAME referenceId
    const duplicateCredit = await walletService.creditWallet({
      userId: customerId,
      amount: 250,
      description: "Promotional Cash Credit",
      referenceId: walletRefId,
    });

    assert.strictEqual(
      duplicateCredit.wallet.balance,
      balanceAfterFirstCredit,
      "Duplicate wallet credit with same referenceId must NOT increase balance",
    );
    assert.strictEqual(
      duplicateCredit.transaction.id,
      initialCredit.transaction.id,
      "Duplicate credit must return existing ledger transaction",
    );
    console.log("  ✔ Wallet credit idempotency verified: Balance protected against double credits");

    console.log("\n=======================================================");
    console.log("🎉 ALL IDEMPOTENCY & DUPLICATE PROTECTION TESTS PASSED (100%)");
    console.log("=======================================================\n");
  } catch (err) {
    console.error("❌ Test suite failed with error:", err);
    process.exit(1);
  } finally {
    if (server) server.close();
    await prisma.$disconnect();
  }
}

runIdempotencyTestSuite();
