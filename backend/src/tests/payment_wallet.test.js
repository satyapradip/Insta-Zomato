require("dotenv").config();
const http = require("http");
const assert = require("assert");
const crypto = require("crypto");
const app = require("../app");
const { prisma, connectPostgres } = require("../db/prisma");
const { generateTestSignature } = require("../services/payment.services");
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

async function runPaymentWalletTestSuite() {
  console.log("\n=======================================================");
  console.log("💳 RUNNING PHASE 8: RAZORPAY & WALLET INTEGRATION TESTS");
  console.log("=======================================================\n");

  await connectPostgres();

  // Start temporary test HTTP server
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[TEST SERVER] Running on ${baseUrl}`);

  const testSuffix = Math.floor(1000 + Math.random() * 9000);
  const customerEmail = `cust_pay_${testSuffix}@example.com`;
  const partnerEmail = `rest_pay_${testSuffix}@example.com`;
  const password = "Password@123";

  let customerToken = "";
  let customerId = "";
  let partnerToken = "";
  let partnerId = "";
  let foodId = "";
  let orderId = "";
  let orderNumber = "";
  let grandTotal = 0;

  try {
    // ── STEP 1: Register Customer & Food Partner ──────────────────────────
    console.log("▶ 1. Registering test customer and restaurant partner...");
    const custReg = await request("POST", "/api/auth/user/register", {
      fullName: "Ananya Sharma",
      email: customerEmail,
      password,
      phone: "9876543210",
    });
    assert.strictEqual(custReg.status, 201, "Customer registration failed");
    customerId = custReg.body.data.user.id;
    customerToken = extractCookie(custReg.headers["set-cookie"], "accessToken");

    const partReg = await request("POST", "/api/auth/foodpartner/register", {
      name: "Chef Sanjeev",
      email: partnerEmail,
      password,
      phone: "9123456780",
      restaurantName: `Royal Biryani Palace ${testSuffix}`,
      fssaiLicenseNumber: "12345678901234",
    });
    assert.strictEqual(partReg.status, 201, "Partner registration failed");
    partnerId = partReg.body.data.partner.id || partReg.body.data.partner._id;
    partnerToken = extractCookie(partReg.headers["set-cookie"], "accessToken");
    console.log("  ✔ Customer and Restaurant registered");

    // ── STEP 2: Create Food Item ──────────────────────────────────────────
    console.log("▶ 2. Creating dish in restaurant menu...");
    const food = await prisma.food.create({
      data: {
        foodPartnerId: partnerId,
        name: "Awadhi Dum Biryani",
        description: "Slow-cooked fragrant basmati rice",
        price: 350,
        discountedPrice: 300,
        category: "Biryani",
        video: "https://res.cloudinary.com/demo/video/upload/sample.mp4",
        isVeg: false,
        isAvailable: true,
      },
    });
    foodId = food.id;
    console.log("  ✔ Dish created: Awadhi Dum Biryani (₹300)");

    // ── STEP 3: Add to Cart & Place Order ──────────────────────────────────
    console.log("▶ 3. Adding dish to cart and placing order...");
    const addCart = await request(
      "POST",
      "/api/cart/add",
      { foodId, quantity: 1 },
      { Cookie: `accessToken=${customerToken}` },
    );
    assert.strictEqual(addCart.status, 200, "Failed to add dish to cart");

    const placeOrd = await request(
      "POST",
      "/api/orders",
      {
        deliveryAddress: {
          label: "Home",
          street: "12th Main, Indiranagar",
          city: "Bengaluru",
          pincode: "560038",
        },
        paymentMethod: "RAZORPAY",
      },
      { Cookie: `accessToken=${customerToken}` },
    );
    assert.strictEqual(placeOrd.status, 201, "Order placement failed");
    orderId = placeOrd.body.data._id || placeOrd.body.data.id;
    orderNumber = placeOrd.body.data.orderNumber;
    grandTotal = placeOrd.body.data.pricing.grandTotal;
    assert.strictEqual(placeOrd.body.data.paymentStatus, "PENDING");
    console.log(`  ✔ Order placed: ${orderNumber} (Grand Total: ₹${grandTotal}, Status: PENDING)`);

    // ── STEP 4: Create Razorpay Order ─────────────────────────────────────
    console.log("▶ 4. Initializing Razorpay Payment Order (POST /api/payment/create-order)...");
    const createPay = await request(
      "POST",
      "/api/payment/create-order",
      { orderId },
      { Cookie: `accessToken=${customerToken}` },
    );
    assert.strictEqual(createPay.status, 200, "Create payment order failed");
    const rzpData = createPay.body.data;
    assert.ok(rzpData.razorpayOrderId, "Missing razorpayOrderId");
    assert.strictEqual(rzpData.amount, Math.round(grandTotal * 100), "Paise amount mismatch");
    assert.strictEqual(rzpData.amountInRupees, grandTotal, "Rupee amount mismatch");
    assert.strictEqual(rzpData.currency, "INR");
    console.log(`  ✔ Razorpay Order created: ${rzpData.razorpayOrderId} (${rzpData.amount} paise)`);

    // ── STEP 5: Tampered Signature Verification Rejection ─────────────────
    console.log("▶ 5. Testing Cryptographic Tamper Prevention (Invalid HMAC Signature)...");
    const fakeVerify = await request(
      "POST",
      "/api/payment/verify",
      {
        orderId,
        razorpayOrderId: rzpData.razorpayOrderId,
        razorpayPaymentId: "pay_fake_attacker_123",
        razorpaySignature: "fake_forged_cryptographic_signature_hex_1234567890abcdef",
      },
      { Cookie: `accessToken=${customerToken}` },
    );
    assert.strictEqual(fakeVerify.status, 400, "Fake signature should be rejected with 400");
    assert.ok(
      fakeVerify.body.message.includes("Invalid cryptographic signature") ||
        fakeVerify.body.message.includes("tampering"),
      "Should indicate signature failure",
    );
    console.log("  ✔ Security Passed: Forged signature successfully rejected with HTTP 400");

    // ── STEP 6: Authentic Signature Verification ──────────────────────────
    console.log("▶ 6. Testing Valid HMAC-SHA256 Signature Payment Verification...");
    const validPaymentId = `pay_${Date.now()}_auth`;
    const validSignature = generateTestSignature(rzpData.razorpayOrderId, validPaymentId);

    const validVerify = await request(
      "POST",
      "/api/payment/verify",
      {
        orderId,
        razorpayOrderId: rzpData.razorpayOrderId,
        razorpayPaymentId: validPaymentId,
        razorpaySignature: validSignature,
      },
      { Cookie: `accessToken=${customerToken}` },
    );
    assert.strictEqual(validVerify.status, 200, "Valid signature verification failed");
    assert.strictEqual(validVerify.body.data.paymentStatus, "PAID");
    assert.strictEqual(validVerify.body.data.paymentMethod, "RAZORPAY");

    // Verify DB Order state
    const dbOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: { timeline: true, paymentRecords: true },
    });
    assert.strictEqual(dbOrder.paymentStatus, "PAID");
    assert.strictEqual(dbOrder.razorpayPaymentId, validPaymentId);
    assert.ok(
      dbOrder.timeline.some((t) => t.note.includes("verified via Razorpay")),
      "Timeline missing payment verification note",
    );
    console.log(`  ✔ Payment verified! Order ${orderNumber} marked PAID in database`);

    // ── STEP 7: Webhook Processing (Asynchronous payment.captured) ────────
    console.log("▶ 7. Testing Asynchronous Razorpay Webhook (payment.captured)...");
    // Place a second order
    await request(
      "POST",
      "/api/cart/add",
      { foodId, quantity: 1 },
      { Cookie: `accessToken=${customerToken}` },
    );
    const ord2Res = await request(
      "POST",
      "/api/orders",
      {
        deliveryAddress: { street: "MG Road", city: "Bengaluru", pincode: "560001" },
        paymentMethod: "RAZORPAY",
      },
      { Cookie: `accessToken=${customerToken}` },
    );
    const order2Id = ord2Res.body.data._id || ord2Res.body.data.id;
    const webhookRzpOrderId = `order_wh_${Date.now()}`;
    const webhookPaymentId = `pay_wh_${Date.now()}`;

    await prisma.order.update({
      where: { id: order2Id },
      data: { razorpayOrderId: webhookRzpOrderId },
    });

    const webhookPayload = JSON.stringify({
      event: "payment.captured",
      account_id: "acc_test_123",
      payload: {
        payment: {
          entity: {
            id: webhookPaymentId,
            order_id: webhookRzpOrderId,
            amount: Math.round(ord2Res.body.data.pricing.grandTotal * 100),
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

    const webhookRes = await request(
      "POST",
      "/api/payment/webhook",
      webhookPayload,
      { "x-razorpay-signature": webhookSignature },
    );
    assert.strictEqual(webhookRes.status, 200, "Webhook processing failed");

    const dbOrder2 = await prisma.order.findUnique({ where: { id: order2Id } });
    assert.strictEqual(dbOrder2.paymentStatus, "PAID", "Order 2 should be marked PAID by webhook");
    console.log("  ✔ Webhook processed! Order marked PAID asynchronously");

    // ── STEP 8: Inspect In-App Digital Wallet (GET /api/wallet) ───────────
    console.log("▶ 8. Checking In-App Digital Wallet (GET /api/wallet)...");
    const walletRes = await request(
      "GET",
      "/api/wallet",
      null,
      { Cookie: `accessToken=${customerToken}` },
    );
    assert.strictEqual(walletRes.status, 200, "Get wallet failed");
    assert.strictEqual(typeof walletRes.body.data.wallet.balance, "number");
    console.log(`  ✔ Digital wallet active. Current Balance: ₹${walletRes.body.data.wallet.balance}`);

    // ── STEP 9: Top-Up Digital Wallet (₹1000) ──────────────────────────────
    console.log("▶ 9. Topping up digital wallet with ₹1000...");
    const topupOrderRes = await request(
      "POST",
      "/api/wallet/topup/create-order",
      { amount: 1000 },
      { Cookie: `accessToken=${customerToken}` },
    );
    assert.strictEqual(topupOrderRes.status, 200, "Top-up order creation failed");
    const topupRzpOrderId = topupOrderRes.body.data.razorpayOrderId;

    const topupPaymentId = `pay_topup_${Date.now()}`;
    const topupSignature = generateTestSignature(topupRzpOrderId, topupPaymentId);

    const topupVerifyRes = await request(
      "POST",
      "/api/wallet/topup/verify",
      {
        razorpayOrderId: topupRzpOrderId,
        razorpayPaymentId: topupPaymentId,
        razorpaySignature: topupSignature,
        amount: 1000,
      },
      { Cookie: `accessToken=${customerToken}` },
    );
    assert.strictEqual(topupVerifyRes.status, 200, "Top-up verification failed");
    assert.strictEqual(topupVerifyRes.body.data.balance, 1000, "Balance should be ₹1000");
    assert.strictEqual(topupVerifyRes.body.data.transaction.type, "CREDIT");
    console.log("  ✔ Wallet top-up verified! New balance: ₹1000");

    // ── STEP 10: 1-Tap Checkout using Wallet Balance ──────────────────────
    console.log("▶ 10. Testing 1-Tap Checkout using In-App Wallet (POST /api/payment/wallet-pay)...");
    // Place order 3
    await request(
      "POST",
      "/api/cart/add",
      { foodId, quantity: 1 },
      { Cookie: `accessToken=${customerToken}` },
    );
    const ord3Res = await request(
      "POST",
      "/api/orders",
      {
        deliveryAddress: { street: "Koramangala 5th Block", city: "Bengaluru", pincode: "560095" },
        paymentMethod: "WALLET",
      },
      { Cookie: `accessToken=${customerToken}` },
    );
    const order3Id = ord3Res.body.data._id || ord3Res.body.data.id;
    const order3Total = ord3Res.body.data.pricing.grandTotal;

    const walletPayRes = await request(
      "POST",
      "/api/payment/wallet-pay",
      { orderId: order3Id },
      { Cookie: `accessToken=${customerToken}` },
    );
    assert.strictEqual(walletPayRes.status, 200, "Wallet payment failed");
    assert.strictEqual(walletPayRes.body.data.paymentStatus, "PAID");
    assert.strictEqual(walletPayRes.body.data.paymentMethod, "WALLET");
    assert.strictEqual(walletPayRes.body.data.walletBalance, 1000 - order3Total);

    const dbOrder3 = await prisma.order.findUnique({ where: { id: order3Id } });
    assert.strictEqual(dbOrder3.paymentStatus, "PAID");
    console.log(`  ✔ 1-Tap Wallet Checkout succeeded! Remaining Wallet Balance: ₹${walletPayRes.body.data.walletBalance}`);

    // ── STEP 11: Instant Auto-Refund to Wallet on Cancellation ────────────
    console.log("▶ 11. Testing Instant Auto-Refund to Wallet upon Order Cancellation...");
    const cancelRes = await request(
      "POST",
      `/api/orders/${order3Id}/cancel`,
      { reason: "Changed my mind before cooking" },
      { Cookie: `accessToken=${customerToken}` },
    );
    assert.strictEqual(cancelRes.status, 200, "Order cancellation failed");
    assert.strictEqual(cancelRes.body.data.status, "CANCELLED");
    assert.strictEqual(cancelRes.body.data.paymentStatus, "REFUNDED");
    assert.strictEqual(cancelRes.body.data.cancellation.refundStatus, "PROCESSED");

    // Inspect user wallet - should be restored back to ₹1000
    const walletAfterCancel = await prisma.wallet.findUnique({ where: { userId: customerId } });
    assert.strictEqual(walletAfterCancel.balance, 1000, "Wallet balance should be restored to ₹1000");
    console.log(`  ✔ Order cancelled and instant refund credited! Restored Wallet Balance: ₹${walletAfterCancel.balance}`);

    console.log("\n=======================================================");
    console.log("🎉 ALL 11 PHASE 8 PAYMENT & WALLET TESTS PASSED (100%)");
    console.log("=======================================================\n");
  } finally {
    if (server) {
      server.close();
    }
  }
}

runPaymentWalletTestSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ Test Suite Failed:", err);
    process.exit(1);
  });
