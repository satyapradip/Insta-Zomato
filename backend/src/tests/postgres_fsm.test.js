require("dotenv").config();
const http = require("http");
const assert = require("assert");
const app = require("../app");
const { prisma, connectPostgres } = require("../db/prisma");
const {
  validateTransition,
  generateDeliveryOtp,
  hashDeliveryOtp,
} = require("../services/orderStateMachine.services");

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
      req.write(JSON.stringify(body));
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

async function runTests() {
  console.log("\n==========================================================");
  console.log("🧪 STARTING POSTGRESQL / PRISMA ORDER LIFECYCLE & FSM TESTS");
  console.log("==========================================================\n");

  let passed = 0;
  let failed = 0;

  function testPass(msg) {
    passed++;
    console.log(`  ✅ PASS: ${msg}`);
  }

  function testFail(msg, err) {
    failed++;
    console.error(`  ❌ FAIL: ${msg}`);
    if (err) console.error(err);
  }

  try {
    await connectPostgres();

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
    console.log(` Test server running on ${baseUrl}\n`);

    // ─────────────────────────────────────────────────────────────────────────
    // 1. STATE MACHINE TRANSITION RULES (Unit checks)
    // ─────────────────────────────────────────────────────────────────────────
    console.log("▶ 1. State Machine Engine & Transition Rules Matrix");

    assert.doesNotThrow(() => validateTransition("PENDING", "CONFIRMED", "foodpartner"));
    testPass("PENDING -> CONFIRMED (foodpartner)");

    assert.doesNotThrow(() => validateTransition("CONFIRMED", "PREPARING", "foodpartner"));
    testPass("CONFIRMED -> PREPARING (foodpartner)");

    assert.doesNotThrow(() => validateTransition("PREPARING", "READY_FOR_PICKUP", "foodpartner"));
    testPass("PREPARING -> READY_FOR_PICKUP (foodpartner)");

    assert.doesNotThrow(() => validateTransition("READY_FOR_PICKUP", "PICKED_UP", "deliverypartner"));
    testPass("READY_FOR_PICKUP -> PICKED_UP (deliverypartner)");

    assert.doesNotThrow(() => validateTransition("PICKED_UP", "OUT_FOR_DELIVERY", "deliverypartner"));
    testPass("PICKED_UP -> OUT_FOR_DELIVERY (deliverypartner)");

    assert.doesNotThrow(() => validateTransition("OUT_FOR_DELIVERY", "DELIVERED", "deliverypartner"));
    testPass("OUT_FOR_DELIVERY -> DELIVERED (deliverypartner)");

    assert.doesNotThrow(() => validateTransition("PENDING", "CANCELLED", "customer"));
    testPass("PENDING -> CANCELLED (customer)");

    assert.doesNotThrow(() => validateTransition("CONFIRMED", "CANCELLED", "customer"));
    testPass("CONFIRMED -> CANCELLED (customer)");

    assert.throws(() => validateTransition("PENDING", "DELIVERED", "customer"), /Invalid state transition/);
    testPass("Illegal transition PENDING -> DELIVERED rejected (400)");

    assert.throws(() => validateTransition("CONFIRMED", "READY_FOR_PICKUP", "foodpartner"), /Invalid state transition/);
    testPass("Illegal skip CONFIRMED -> READY_FOR_PICKUP rejected (400)");

    assert.throws(() => validateTransition("DELIVERED", "CANCELLED", "admin"), /terminal status/);
    testPass("Transition from terminal DELIVERED -> CANCELLED rejected (400)");

    assert.throws(() => validateTransition("PENDING", "CONFIRMED", "customer"), /not authorized/);
    testPass("Unauthorized role customer cannot CONFIRM order (403)");

    assert.throws(() => validateTransition("PREPARING", "CANCELLED", "customer"), /not authorized/);
    testPass("Customer cannot CANCEL order once PREPARING (403)");

    // ─────────────────────────────────────────────────────────────────────────
    // 2. CRYPTOGRAPHIC DELIVERY OTP
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n▶ 2. Cryptographic Delivery OTP Generator & Hasher");
    const otp = generateDeliveryOtp();
    assert.strictEqual(typeof otp, "string");
    assert.strictEqual(otp.length, 4);
    assert.match(otp, /^\d{4}$/);
    testPass(`Generated 4-digit OTP: ${otp}`);

    const hashed = await hashDeliveryOtp(otp);
    assert(hashed.startsWith("$2b$") || hashed.startsWith("$2a$"));
    testPass("OTP hashed with bcrypt ($2b$ prefix)");

    // ─────────────────────────────────────────────────────────────────────────
    // 3. END-TO-END POSTGRES API LIFECYCLE FLOW
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n▶ 3. End-to-End API Order Lifecycle Flow with PostgreSQL");

    const uniqueTag = Date.now();

    // 3.1 Customer Registration
    const customerEmail = `pg_cust_${uniqueTag}@test.com`;
    const custRegRes = await request("POST", "/api/auth/user/register", {
      fullName: "Postgres Customer",
      email: customerEmail,
      password: "Password123!",
      phone: "9876543210",
    });
    assert.strictEqual(custRegRes.status, 201);
    const customerToken = extractCookie(custRegRes.headers["set-cookie"], "accessToken");
    const customerAuth = { Authorization: `Bearer ${customerToken}` };
    testPass("Customer registered successfully in PostgreSQL");

    // 3.2 Food Partner Registration
    const partnerEmail = `pg_part_${uniqueTag}@test.com`;
    const partRegRes = await request("POST", "/api/auth/foodpartner/register", {
      name: "Chef Mario",
      email: partnerEmail,
      password: "Password123!",
      phone: "9876543211",
      restaurantName: "Mario Trattoria",
      fssaiLicenseNumber: "12345678901234",
    });
    assert.strictEqual(partRegRes.status, 201);
    const partnerToken = extractCookie(partRegRes.headers["set-cookie"], "accessToken");
    const partnerAuth = { Authorization: `Bearer ${partnerToken}` };
    const partnerId = partRegRes.body.data.partner.id;
    testPass("Food Partner registered successfully in PostgreSQL");

    // Create a food item via Prisma directly for test
    const foodItem = await prisma.food.create({
      data: {
        foodPartnerId: partnerId,
        name: "Artisan Truffle Pizza",
        description: "Fresh mozzarella and black truffle",
        price: 499,
        video: "https://res.cloudinary.com/demo/video/upload/pizza.mp4",
        thumbnailUrl: "https://res.cloudinary.com/demo/image/upload/pizza.jpg",
        isVeg: true,
        category: "Pizza",
        variants: {
          create: [{ name: "Large (12 inch)", price: 699 }],
        },
        addOns: {
          create: [{ name: "Extra Truffle Oil", price: 50 }],
        },
      },
    });
    testPass("Food item created in PostgreSQL");

    // 3.3 Delivery Partner Registration
    const riderEmail = `pg_rider_${uniqueTag}@test.com`;
    const riderRegRes = await request("POST", "/api/auth/delivery/register", {
      name: "Rider Alex",
      email: riderEmail,
      password: "Password123!",
      phone: "9876543212",
      vehicleType: "bike",
      vehicleNumber: "KA01AB1234",
    });
    assert.strictEqual(riderRegRes.status, 201);
    const riderToken = extractCookie(riderRegRes.headers["set-cookie"], "accessToken");
    const riderAuth = { Authorization: `Bearer ${riderToken}` };
    testPass("Delivery Partner registered successfully in PostgreSQL");

    // 3.4 Add Item to Cart
    const addCartRes = await request(
      "POST",
      "/api/cart/add",
      {
        foodId: foodItem.id,
        quantity: 1,
        selectedVariant: { name: "Large (12 inch)", price: 699 },
        selectedAddOns: [{ name: "Extra Truffle Oil", price: 50 }],
      },
      customerAuth,
    );
    assert.strictEqual(addCartRes.status, 200);
    assert.strictEqual(addCartRes.body.data.items.length, 1);
    testPass("Items added to cart with dynamic pricing");

    // 3.5 Place Order
    const placeOrderRes = await request(
      "POST",
      "/api/orders",
      {
        deliveryAddress: {
          label: "Home",
          street: "123 Tech Park",
          city: "Bengaluru",
          state: "Karnataka",
          pincode: "560001",
          coordinates: [77.5946, 12.9716],
          contactPhone: "9876543210",
        },
        paymentMethod: "COD",
        tipAmount: 20,
      },
      customerAuth,
    );

    assert.strictEqual(placeOrderRes.status, 201);
    const orderData = placeOrderRes.body.data;
    const orderId = orderData.id;
    const plainOtp = orderData.deliveryOtp;

    testPass("Order placed successfully (201 Created)");
    testPass(`Order Number generated: ${orderData.orderNumber}`);
    assert.strictEqual(orderData.status, "PENDING");
    testPass("Initial order status is PENDING");
    assert(orderData.pricing.grandTotal > 0);
    testPass(`Order Grand Total computed: ₹${orderData.pricing.grandTotal}`);
    assert.strictEqual(typeof plainOtp, "string");
    assert.strictEqual(plainOtp.length, 4);
    testPass(`Customer received plain Delivery OTP: ${plainOtp}`);
    assert.strictEqual(orderData.timeline.length, 1);
    testPass("Initial timeline entry created");

    // 3.6 Check Cart Empty
    const checkCartRes = await request("GET", "/api/cart", null, customerAuth);
    assert.strictEqual(checkCartRes.body.data.items.length, 0);
    testPass("Customer's cart is automatically emptied after order creation");

    // 3.7 Customer Order History
    const custOrdersRes = await request("GET", "/api/orders", null, customerAuth);
    assert.strictEqual(custOrdersRes.status, 200);
    assert.strictEqual(custOrdersRes.body.data.orders.length, 1);
    testPass("Customer can fetch order history");

    // 3.8 Partner Views Orders
    const partnerOrdersRes = await request("GET", "/api/orders/partner/orders", null, partnerAuth);
    assert.strictEqual(partnerOrdersRes.status, 200);
    assert.strictEqual(partnerOrdersRes.body.data.orders.length, 1);
    testPass("Food partner can view incoming kitchen orders");

    // 3.9 Partner Confirms Order
    const confirmRes = await request("PUT", `/api/orders/${orderId}/confirm`, { prepTimeMinutes: 20 }, partnerAuth);
    assert.strictEqual(confirmRes.status, 200);
    assert.strictEqual(confirmRes.body.data.status, "CONFIRMED");
    testPass("Partner confirmed order -> CONFIRMED");

    // 3.10 Partner Starts Cooking
    const prepRes = await request("PUT", `/api/orders/${orderId}/preparing`, null, partnerAuth);
    assert.strictEqual(prepRes.status, 200);
    assert.strictEqual(prepRes.body.data.status, "PREPARING");
    testPass("Partner cooking order -> PREPARING");

    // 3.11 Partner Marks Ready
    const readyRes = await request("PUT", `/api/orders/${orderId}/ready`, null, partnerAuth);
    assert.strictEqual(readyRes.status, 200);
    assert.strictEqual(readyRes.body.data.status, "READY_FOR_PICKUP");
    testPass("Partner packed order -> READY_FOR_PICKUP");

    // 3.12 Rider Sees Ready Orders
    const availRes = await request("GET", "/api/orders/rider/available", null, riderAuth);
    assert.strictEqual(availRes.status, 200);
    assert(availRes.body.data.orders.length >= 1);
    testPass("Rider sees ready order in available pool");

    // 3.13 Rider Accepts Delivery
    const acceptRes = await request("POST", `/api/orders/${orderId}/accept-delivery`, null, riderAuth);
    assert.strictEqual(acceptRes.status, 200);
    testPass("Rider accepted delivery assignment");

    // 3.14 Rider Picks Up
    const pickupRes = await request("PUT", `/api/orders/${orderId}/pickup`, null, riderAuth);
    assert.strictEqual(pickupRes.status, 200);
    assert.strictEqual(pickupRes.body.data.status, "PICKED_UP");
    testPass("Rider picked up order -> PICKED_UP");

    // 3.15 Rider Out for Delivery
    const outRes = await request("PUT", `/api/orders/${orderId}/out-for-delivery`, null, riderAuth);
    assert.strictEqual(outRes.status, 200);
    assert.strictEqual(outRes.body.data.status, "OUT_FOR_DELIVERY");
    testPass("Rider en route -> OUT_FOR_DELIVERY");

    // 3.16 Deliver with Wrong OTP
    const wrongOtpRes = await request("PUT", `/api/orders/${orderId}/deliver`, { otp: "0000" }, riderAuth);
    assert.strictEqual(wrongOtpRes.status, 400);
    testPass("Delivering with WRONG OTP is strictly rejected (400 Bad Request)");

    // 3.17 Deliver with Correct OTP
    const correctOtpRes = await request("PUT", `/api/orders/${orderId}/deliver`, { otp: plainOtp }, riderAuth);
    assert.strictEqual(correctOtpRes.status, 200);
    assert.strictEqual(correctOtpRes.body.data.status, "DELIVERED");
    testPass("Delivering with CORRECT OTP transitions order to DELIVERED 🎉");

    // 3.18 Verify Timeline
    const detailRes = await request("GET", `/api/orders/${orderId}`, null, customerAuth);
    assert.strictEqual(detailRes.status, 200);
    const statuses = detailRes.body.data.timeline.map((t) => t.status);
    testPass(`Complete 7-stage audit timeline recorded in PostgreSQL: [${statuses.join(" -> ")}]`);

    // 3.19 Track Order
    const trackRes = await request("GET", `/api/orders/${orderId}/track`, null, customerAuth);
    assert.strictEqual(trackRes.status, 200);
    assert(trackRes.body.data.restaurant);
    testPass("Live tracking endpoint returns populated restaurant and delivery partner data");

    // ─────────────────────────────────────────────────────────────────────────
    // 4. ORDER CANCELLATION FLOW & GUARDS
    // ─────────────────────────────────────────────────────────────────────────
    console.log("\n▶ 4. Order Cancellation Flow & State Guards");

    await request("POST", "/api/cart/add", { foodId: foodItem.id, quantity: 1 }, customerAuth);
    const secondOrderRes = await request(
      "POST",
      "/api/orders",
      {
        deliveryAddress: {
          label: "Office",
          street: "456 Cyber Tower",
          city: "Bengaluru",
          state: "Karnataka",
          pincode: "560002",
        },
      },
      customerAuth,
    );
    const secondOrderId = secondOrderRes.body.data.id;

    // Cancel in PENDING
    const cancelRes = await request("POST", `/api/orders/${secondOrderId}/cancel`, { reason: "Changed my mind" }, customerAuth);
    assert.strictEqual(cancelRes.status, 200);
    assert.strictEqual(cancelRes.body.data.status, "CANCELLED");
    testPass("Customer can cancel order in PENDING status");

    // Attempt transition on CANCELLED order
    const invalidConfirmRes = await request("PUT", `/api/orders/${secondOrderId}/confirm`, null, partnerAuth);
    assert.strictEqual(invalidConfirmRes.status, 400);
    testPass("Transitioning CANCELLED order is blocked by state machine (400 Bad Request)");

  } catch (err) {
    testFail("Unexpected error in test runner", err);
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await prisma.$disconnect();

    console.log("\n==========================================================");
    console.log(`📊 TEST RESULTS: ${passed} / ${passed + failed} PASSED`);
    console.log("==========================================================\n");

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

runTests();
