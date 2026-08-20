const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../../backend/.env") });
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
require("dotenv").config();

const mongoose = require("mongoose");
const http = require("http");
const app = require("../app");
const config = require("../config/index");
const userModel = require("../models/user.models");
const foodPartnerModel = require("../models/foodpartner.models");
const deliveryPartnerModel = require("../models/deliverypartner.models");
const foodModel = require("../models/food.models");
const cartModel = require("../models/cart.models");
const orderModel = require("../models/order.models");
const {
  validateTransition,
  generateDeliveryOtp,
  hashDeliveryOtp,
} = require("../services/orderStateMachine.services");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongoServer;
let server;
let baseUrl;

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });

    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function extractToken(res) {
  const authHeader = res.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }
  return res.body?.data?.accessToken || res.body?.data?.token;
}

async function runTests() {
  console.log("\n==========================================================");
  console.log("🧪 STARTING PHASE 7: ORDER LIFECYCLE & STATE MACHINE TESTS");
  console.log("==========================================================\n");

  let passedCount = 0;
  let totalCount = 0;

  function assert(condition, testName, details = "") {
    totalCount++;
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passedCount++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      if (details) console.error(`     Details: ${details}`);
    }
  }

  // 1. Connect DB & Start Server
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  console.log(" Connected to in-memory MongoDB");

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(` Test server running on ${baseUrl}\n`);

  try {
    // ── SECTION 1: UNIT / STATE MACHINE TRANSITION MATRIX TESTS ────────────
    console.log("▶ 1. State Machine Engine & Transition Rules Matrix");

    // Valid transitions
    assert(
      validateTransition("PENDING", "CONFIRMED", "foodpartner") === true,
      "PENDING -> CONFIRMED (foodpartner)",
    );
    assert(
      validateTransition("CONFIRMED", "PREPARING", "foodpartner") === true,
      "CONFIRMED -> PREPARING (foodpartner)",
    );
    assert(
      validateTransition("PREPARING", "READY_FOR_PICKUP", "foodpartner") === true,
      "PREPARING -> READY_FOR_PICKUP (foodpartner)",
    );
    assert(
      validateTransition("READY_FOR_PICKUP", "PICKED_UP", "deliverypartner") === true,
      "READY_FOR_PICKUP -> PICKED_UP (deliverypartner)",
    );
    assert(
      validateTransition("PICKED_UP", "OUT_FOR_DELIVERY", "deliverypartner") === true,
      "PICKED_UP -> OUT_FOR_DELIVERY (deliverypartner)",
    );
    assert(
      validateTransition("OUT_FOR_DELIVERY", "DELIVERED", "deliverypartner") === true,
      "OUT_FOR_DELIVERY -> DELIVERED (deliverypartner)",
    );
    assert(
      validateTransition("PENDING", "CANCELLED", "customer") === true,
      "PENDING -> CANCELLED (customer)",
    );
    assert(
      validateTransition("CONFIRMED", "CANCELLED", "customer") === true,
      "CONFIRMED -> CANCELLED (customer)",
    );

    // Invalid transition checks
    let caughtInvalid1 = false;
    try {
      validateTransition("PENDING", "DELIVERED", "customer");
    } catch (e) {
      caughtInvalid1 = e.statusCode === 400;
    }
    assert(caughtInvalid1, "Illegal transition PENDING -> DELIVERED rejected (400)");

    let caughtInvalid2 = false;
    try {
      validateTransition("CONFIRMED", "READY_FOR_PICKUP", "foodpartner");
    } catch (e) {
      caughtInvalid2 = e.statusCode === 400;
    }
    assert(caughtInvalid2, "Illegal skip CONFIRMED -> READY_FOR_PICKUP rejected (400)");

    let caughtInvalid3 = false;
    try {
      validateTransition("DELIVERED", "CANCELLED", "admin");
    } catch (e) {
      caughtInvalid3 = e.statusCode === 400;
    }
    assert(caughtInvalid3, "Transition from terminal DELIVERED -> CANCELLED rejected (400)");

    let caughtRoleForbidden = false;
    try {
      validateTransition("PENDING", "CONFIRMED", "customer");
    } catch (e) {
      caughtRoleForbidden = e.statusCode === 403;
    }
    assert(caughtRoleForbidden, "Unauthorized role customer cannot CONFIRM order (403)");

    let caughtCustomerCancelPrep = false;
    try {
      validateTransition("PREPARING", "CANCELLED", "customer");
    } catch (e) {
      caughtRoleForbidden = e.statusCode === 403;
    }
    assert(caughtRoleForbidden, "Customer cannot CANCEL order once PREPARING (403)");

    // ── SECTION 2: CRYPTOGRAPHIC OTP GENERATION & VERIFICATION ──────────────
    console.log("\n▶ 2. Cryptographic Delivery OTP Generator & Hasher");
    const otp = generateDeliveryOtp();
    assert(
      /^\d{4}$/.test(otp) && parseInt(otp, 10) >= 1000 && parseInt(otp, 10) <= 9999,
      `Generated 4-digit OTP: ${otp}`,
    );

    const hashedOtp = await hashDeliveryOtp(otp);
    assert(
      hashedOtp && hashedOtp.startsWith("$2b$"),
      "OTP hashed with bcrypt ($2b$ prefix)",
    );

    // ── SECTION 3: END-TO-END API ORDER LIFECYCLE ───────────────────────────
    console.log("\n▶ 3. End-to-End API Order Lifecycle Flow");

    // Clean up test collections
    const testTimestamp = Date.now();
    const customerEmail = `cust_${testTimestamp}@example.com`;
    const partnerEmail = `partner_${testTimestamp}@example.com`;
    const riderEmail = `rider_${testTimestamp}@example.com`;

    // 3.1 Register Customer
    const regCustRes = await makeRequest("POST", "/api/auth/user/register", {
      fullName: "Satya Customer",
      email: customerEmail,
      password: "Password@123",
      phone: "9876543210",
    });
    const customerToken = extractToken(regCustRes);
    const customerHeaders = { Authorization: `Bearer ${customerToken}` };
    assert(regCustRes.status === 201, "Customer registered successfully");

    // 3.2 Register Food Partner
    const regPartnerRes = await makeRequest("POST", "/api/auth/foodpartner/register", {
      name: "Chef Partner",
      restaurantName: "Biryani Express",
      email: partnerEmail,
      password: "Password@123",
      phone: "9876543211",
      fssaiLicenseNumber: "12345678901234",
    });
    const partnerToken = extractToken(regPartnerRes);
    const partnerHeaders = { Authorization: `Bearer ${partnerToken}` };
    const partnerId =
      regPartnerRes.body?.data?.partner?.id ||
      regPartnerRes.body?.data?.partner?._id ||
      regPartnerRes.body?.data?.user?.id ||
      regPartnerRes.body?.data?.user?._id;
    assert(regPartnerRes.status === 201, "Food Partner registered successfully");

    // 3.3 Create Food Item
    const foodItem = await foodModel.create({
      foodPartner: partnerId,
      name: "Hyderabadi Dum Biryani",
      description: "Authentic slow cooked spiced biryani",
      price: 320,
      video: "https://res.cloudinary.com/demo/video/upload/sample.mp4",
      thumbnailUrl: "https://res.cloudinary.com/demo/image/upload/sample.webp",
      isVeg: false,
      isAvailable: true,
      variants: [{ name: "Full", price: 320 }, { name: "Family Pack", price: 580 }],
      addOns: [{ name: "Extra Raita", price: 30 }],
    });
    assert(Boolean(foodItem._id), "Food item created in database");

    // 3.4 Register Delivery Partner (Rider)
    const regRiderRes = await makeRequest("POST", "/api/auth/delivery/register", {
      name: "Raju Rider",
      email: riderEmail,
      password: "Password@123",
      phone: "9876543212",
      vehicleType: "bike",
      vehicleNumber: "KA01AB1234",
    });
    const riderToken = extractToken(regRiderRes);
    const riderHeaders = { Authorization: `Bearer ${riderToken}` };
    assert(regRiderRes.status === 201, "Delivery Partner registered successfully");

    // 3.5 Add item to customer's cart
    const addCartRes = await makeRequest(
      "POST",
      "/api/cart/add",
      {
        foodId: foodItem._id.toString(),
        quantity: 2,
        selectedVariant: { name: "Full", price: 320 },
        selectedAddOns: [{ name: "Extra Raita", price: 30 }],
      },
      customerHeaders,
    );
    assert(addCartRes.status === 200, "Items added to cart with dynamic pricing");

    // 3.6 Place Order (POST /api/orders)
    const placeOrderRes = await makeRequest(
      "POST",
      "/api/orders",
      {
        deliveryAddress: {
          label: "Home",
          street: "123 Indiranagar 100ft Road",
          city: "Bengaluru",
          state: "Karnataka",
          pincode: "560038",
        },
        paymentMethod: "COD",
        deliveryInstructions: ["Leave at door", "Don't ring bell"],
      },
      customerHeaders,
    );
    assert(placeOrderRes.status === 201, "Order placed successfully (201 Created)");
    const placedOrder = placeOrderRes.body?.data;
    const orderId = placedOrder?._id;
    const plainDeliveryOtp = placedOrder?.deliveryOtp;

    assert(Boolean(placedOrder?.orderNumber?.startsWith("IZ-")), `Order Number generated: ${placedOrder?.orderNumber}`);
    assert(placedOrder?.status === "PENDING", "Initial order status is PENDING");
    assert(placedOrder?.pricing?.grandTotal > 0, `Order Grand Total computed: ₹${placedOrder?.pricing?.grandTotal}`);
    assert(/^\d{4}$/.test(plainDeliveryOtp), `Customer received plain Delivery OTP: ${plainDeliveryOtp}`);
    assert(placedOrder?.timeline?.length === 1, "Initial timeline entry created");

    // 3.7 Verify Cart was reset upon order placement
    const cartAfterOrder = await makeRequest("GET", "/api/cart", null, customerHeaders);
    assert(
      cartAfterOrder.body?.data?.items?.length === 0,
      "Customer's cart is automatically emptied after order creation",
    );

    // 3.8 Customer views order history
    const customerOrdersRes = await makeRequest("GET", "/api/orders", null, customerHeaders);
    assert(
      customerOrdersRes.status === 200 && customerOrdersRes.body?.data?.orders?.length >= 1,
      "Customer can fetch order history",
    );

    // 3.9 Partner views incoming orders
    const partnerOrdersRes = await makeRequest(
      "GET",
      "/api/orders/partner/orders",
      null,
      partnerHeaders,
    );
    assert(
      partnerOrdersRes.status === 200 && partnerOrdersRes.body?.data?.orders?.length >= 1,
      "Food partner can view incoming kitchen orders",
    );

    // 3.10 Partner confirms order (PUT /api/orders/:id/confirm)
    const confirmRes = await makeRequest(
      "PUT",
      `/api/orders/${orderId}/confirm`,
      { prepTimeMinutes: 20 },
      partnerHeaders,
    );
    assert(confirmRes.status === 200 && confirmRes.body?.data?.status === "CONFIRMED", "Partner confirmed order -> CONFIRMED");

    // 3.11 Partner marks order preparing (PUT /api/orders/:id/preparing)
    const preparingRes = await makeRequest(
      "PUT",
      `/api/orders/${orderId}/preparing`,
      {},
      partnerHeaders,
    );
    assert(preparingRes.status === 200 && preparingRes.body?.data?.status === "PREPARING", "Partner cooking order -> PREPARING");

    // 3.12 Partner marks ready for pickup (PUT /api/orders/:id/ready)
    const readyRes = await makeRequest(
      "PUT",
      `/api/orders/${orderId}/ready`,
      {},
      partnerHeaders,
    );
    assert(readyRes.status === 200 && readyRes.body?.data?.status === "READY_FOR_PICKUP", "Partner packed order -> READY_FOR_PICKUP");

    // 3.13 Rider views available pickup orders
    const riderAvailRes = await makeRequest(
      "GET",
      "/api/orders/rider/available",
      null,
      riderHeaders,
    );
    assert(
      riderAvailRes.status === 200 && riderAvailRes.body?.data?.orders?.some((o) => o._id === orderId),
      "Rider sees ready order in available pool",
    );

    // 3.14 Rider accepts delivery assignment
    const acceptRes = await makeRequest(
      "POST",
      `/api/orders/${orderId}/accept-delivery`,
      {},
      riderHeaders,
    );
    assert(acceptRes.status === 200, "Rider accepted delivery assignment");

    // 3.15 Rider picks up order from restaurant
    const pickupRes = await makeRequest(
      "PUT",
      `/api/orders/${orderId}/pickup`,
      {},
      riderHeaders,
    );
    assert(pickupRes.status === 200 && pickupRes.body?.data?.status === "PICKED_UP", "Rider picked up order -> PICKED_UP");

    // 3.16 Rider marks out for delivery
    const outForDeliveryRes = await makeRequest(
      "PUT",
      `/api/orders/${orderId}/out-for-delivery`,
      {},
      riderHeaders,
    );
    assert(outForDeliveryRes.status === 200 && outForDeliveryRes.body?.data?.status === "OUT_FOR_DELIVERY", "Rider en route -> OUT_FOR_DELIVERY");

    // 3.17 Rider attempts to deliver with WRONG OTP (Must Fail!)
    const wrongOtpRes = await makeRequest(
      "PUT",
      `/api/orders/${orderId}/deliver`,
      { otp: "0000" },
      riderHeaders,
    );
    assert(
      wrongOtpRes.status === 400 && wrongOtpRes.body?.message?.includes("Invalid delivery OTP"),
      "Delivering with WRONG OTP is strictly rejected (400 Bad Request)",
    );

    // 3.18 Rider delivers with CORRECT OTP (Must Succeed!)
    const correctOtpRes = await makeRequest(
      "PUT",
      `/api/orders/${orderId}/deliver`,
      { otp: plainDeliveryOtp },
      riderHeaders,
    );
    assert(
      correctOtpRes.status === 200 && correctOtpRes.body?.data?.status === "DELIVERED",
      "Delivering with CORRECT OTP transitions order to DELIVERED 🎉",
    );

    // 3.19 Verify order details & timeline integrity
    const orderDetailRes = await makeRequest(
      "GET",
      `/api/orders/${orderId}`,
      null,
      customerHeaders,
    );
    const finalTimeline = orderDetailRes.body?.data?.timeline || [];
    const timelineStatuses = finalTimeline.map((t) => t.status);
    assert(
      timelineStatuses.includes("PENDING") &&
        timelineStatuses.includes("CONFIRMED") &&
        timelineStatuses.includes("PREPARING") &&
        timelineStatuses.includes("READY_FOR_PICKUP") &&
        timelineStatuses.includes("PICKED_UP") &&
        timelineStatuses.includes("OUT_FOR_DELIVERY") &&
        timelineStatuses.includes("DELIVERED"),
      `Complete 7-stage audit timeline recorded: [${timelineStatuses.join(" -> ")}]`,
    );

    // 3.20 Live Track endpoint
    const trackRes = await makeRequest(
      "GET",
      `/api/orders/${orderId}/track`,
      null,
      customerHeaders,
    );
    assert(
      trackRes.status === 200 && trackRes.body?.data?.restaurant?.name && trackRes.body?.data?.deliveryPartner?.name,
      "Live tracking endpoint returns populated restaurant and delivery partner data",
    );

    // ── SECTION 4: CANCELLATION FLOW & GUARDS ───────────────────────────────
    console.log("\n▶ 4. Order Cancellation Flow & State Guards");

    // Add item to cart again
    await makeRequest(
      "POST",
      "/api/cart/add",
      { foodId: foodItem._id.toString(), quantity: 1 },
      customerHeaders,
    );

    // Place second order
    const order2Res = await makeRequest(
      "POST",
      "/api/orders",
      {
        deliveryAddress: {
          street: "456 Koramangala 5th Block",
          city: "Bengaluru",
          pincode: "560034",
        },
      },
      customerHeaders,
    );
    const order2Id = order2Res.body?.data?._id;

    // Customer cancels pending order
    const cancelRes = await makeRequest(
      "POST",
      `/api/orders/${order2Id}/cancel`,
      { reason: "Ordered by mistake" },
      customerHeaders,
    );
    assert(
      cancelRes.status === 200 && cancelRes.body?.data?.status === "CANCELLED",
      "Customer can cancel order in PENDING status",
    );

    // Try to transition cancelled order (Must Fail!)
    const reconfirmRes = await makeRequest(
      "PUT",
      `/api/orders/${order2Id}/confirm`,
      {},
      partnerHeaders,
    );
    assert(
      reconfirmRes.status === 400,
      "Transitioning CANCELLED order is blocked by state machine (400 Bad Request)",
    );

  } catch (err) {
    console.error("Test execution encountered an error:", err);
  } finally {
    if (server) server.close();
    await mongoose.connection.close();
    if (mongoServer) await mongoServer.stop();
    console.log("\n==========================================================");
    console.log(`📊 TEST RESULTS: ${passedCount} / ${totalCount} PASSED`);
    console.log("==========================================================\n");
    process.exit(passedCount === totalCount ? 0 : 1);
  }
}

runTests();
