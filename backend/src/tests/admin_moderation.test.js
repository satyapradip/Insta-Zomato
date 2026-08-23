// src/tests/admin_moderation.test.js
//
// ─── WHY THIS TEST EXISTS ─────────────────────────────────────────────────────
// Automated Integration Test Suite for Phase 14: SuperAdmin Moderation & Analytics:
//   1. Strict RBAC Enforcement (Non-admin 403 Forbidden, Admin 200 OK)
//   2. Platform Analytics & KPIs Overview (GMV, Active Orders, Fleet, Users)
//   3. Restaurant Partner KYC Verification & Approval / Status Toggle
//   4. Delivery Partner Fleet Onboarding & Approval
//   5. Customer Account Suspension / Ban Enforcement (Blocked from auth middleware)
//   6. Video Reel Content Moderation (Take-down & Restore)
// ─────────────────────────────────────────────────────────────────────────────

require("dotenv").config();
const http = require("http");
const { prisma, connectPostgres } = require("../db/prisma");
const app = require("../app");
const jwt = require("jsonwebtoken");
const config = require("../config/index");

let server;
let serverUrl;
let adminToken, customerToken, partnerToken, riderToken;
let adminId, customerId, partnerId, riderId, testFoodId;

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
  console.log("  🚀 RUNNING PHASE 14: SUPERADMIN & MODERATION TESTS");
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

    // 1. Seed Admin, Customer, Food Partner, and Delivery Rider
    console.log("\n--- [Step 1] Seeding Test Entities & Admin User ---");
    // Customer
    const custReg = await httpRequest("POST", "/api/auth/user/register", {
      fullName: `Standard Customer ${testSuffix}`,
      email: `customer_admin_${testSuffix}@example.com`,
      phone: `9111${String(testSuffix).slice(-6)}`,
      password: "Password@123",
    });
    assert(custReg.status === 201, "Customer register failed");
    customerId = custReg.body.data.user.id || custReg.body.data.user._id;
    customerToken = custReg.body.data.accessToken;

    // Admin User (Directly in DB with role 'admin')
    const adminUser = await prisma.user.create({
      data: {
        fullName: `Super Admin ${testSuffix}`,
        email: `superadmin_${testSuffix}@example.com`,
        password: "$2b$10$hashedpasswordforexample",
        role: "admin",
      },
    });
    adminId = adminUser.id;
    adminToken = jwt.sign(
      { id: adminUser.id, email: adminUser.email, role: "admin" },
      config.jwt.secret,
      { expiresIn: "1d" },
    );

    // Restaurant Partner (Starts with isApproved: false)
    const partnerReg = await httpRequest("POST", "/api/auth/foodpartner/register", {
      name: `Chef KYC ${testSuffix}`,
      email: `kyc_chef_${testSuffix}@example.com`,
      phone: `9222${String(testSuffix).slice(-6)}`,
      password: "Password@123",
      restaurantName: `KYC Bistro ${testSuffix}`,
      address: "MG Road, Bangalore",
    });
    assert(partnerReg.status === 201, "Partner register failed");
    partnerId = (partnerReg.body.data.partner && (partnerReg.body.data.partner.id || partnerReg.body.data.partner._id)) ||
                (partnerReg.body.data.foodPartner && (partnerReg.body.data.foodPartner.id || partnerReg.body.data.foodPartner._id));
    partnerToken = partnerReg.body.data.accessToken;

    // Delivery Partner (Starts with isApproved: false)
    const riderReg = await httpRequest("POST", "/api/auth/delivery/register", {
      name: `Rider Onboarding ${testSuffix}`,
      email: `kyc_rider_${testSuffix}@example.com`,
      phone: `9333${String(testSuffix).slice(-6)}`,
      password: "Password@123",
      vehicleType: "bike",
      vehicleNumber: "KA-04-XY-9999",
    });
    assert(riderReg.status === 201, "Rider register failed");
    riderId = (riderReg.body.data.rider && (riderReg.body.data.rider.id || riderReg.body.data.rider._id)) ||
              (riderReg.body.data.deliveryPartner && (riderReg.body.data.deliveryPartner.id || riderReg.body.data.deliveryPartner._id));
    riderToken = riderReg.body.data.accessToken;

    console.log(`✅ Seeded: Admin (${adminId}), Customer (${customerId}), Partner (${partnerId}), Rider (${riderId})`);

    // 2. Test RBAC Security on Admin Endpoints
    console.log("\n--- [Step 2] Testing RBAC Security Guard on /api/admin ---");
    // No token -> 401
    const noAuthRes = await httpRequest("GET", "/api/admin/analytics");
    assert(noAuthRes.status === 401, "Expected 401 without auth token");

    // Customer token -> 403 Forbidden
    const custAuthRes = await httpRequest("GET", "/api/admin/analytics", null, customerToken);
    assert(custAuthRes.status === 403, "Expected 403 when customer accesses admin API");

    // Partner token -> 403 Forbidden
    const partnerAuthRes = await httpRequest("GET", "/api/admin/analytics", null, partnerToken);
    assert(partnerAuthRes.status === 403, "Expected 403 when partner accesses admin API");

    // Admin token -> 200 OK
    const adminAuthRes = await httpRequest("GET", "/api/admin/analytics", null, adminToken);
    assert(adminAuthRes.status === 200, "Expected 200 when admin accesses admin API");
    console.log("✅ RBAC security verified: Only valid Administrator JWT granted access");

    // 3. Test Platform KPIs & Analytics Dashboard
    console.log("\n--- [Step 3] Testing Platform Analytics Dashboard ---");
    const analytics = adminAuthRes.body.data;
    assert(analytics.financials !== undefined, "Missing financials in analytics");
    assert(analytics.orders !== undefined, "Missing orders in analytics");
    assert(analytics.fleet !== undefined, "Missing fleet in analytics");
    assert(analytics.partners !== undefined, "Missing partners in analytics");
    assert(analytics.users !== undefined, "Missing users in analytics");
    console.log(`✅ Analytics KPIs verified: Total Partners: ${analytics.partners.totalPartners}, Total Users: ${analytics.users.totalUsers}, Total Riders: ${analytics.fleet.totalRiders}`);

    // 4. Test Restaurant Partner KYC Approval & Status Toggle
    console.log("\n--- [Step 4] Testing Restaurant KYC Approval & Status ---");
    // Get partner list
    const partnerListRes = await httpRequest("GET", "/api/admin/partners?status=all", null, adminToken);
    assert(partnerListRes.status === 200, "Failed to get partners list");
    const foundPartner = partnerListRes.body.data.partners.find((p) => p.id === partnerId);
    assert(foundPartner, "Test partner not found in admin list");

    // Approve Partner
    const approvePartnerRes = await httpRequest("PATCH", `/api/admin/partners/${partnerId}/approval`, {
      isApproved: true,
      reason: "FSSAI license verified successfully",
    }, adminToken);
    assert(approvePartnerRes.status === 200, "Partner approval failed");
    assert(approvePartnerRes.body.data.partner.isApproved === true, "Partner isApproved should be true");
    console.log("✅ Partner KYC approved successfully (isApproved: true)");

    // Toggle Partner Open/Close Status
    const toggleStatusRes = await httpRequest("PATCH", `/api/admin/partners/${partnerId}/status`, {
      isOpen: false,
    }, adminToken);
    assert(toggleStatusRes.status === 200, "Partner status toggle failed");
    assert(toggleStatusRes.body.data.partner.isOpen === false, "Partner isOpen should be false");
    console.log("✅ Restaurant operational status toggled to CLOSED");

    // 5. Test Delivery Partner Onboarding Verification & Approval
    console.log("\n--- [Step 5] Testing Delivery Partner Onboarding Approval ---");
    const riderListRes = await httpRequest("GET", "/api/admin/riders?status=all", null, adminToken);
    assert(riderListRes.status === 200, "Failed to get riders list");
    const foundRider = riderListRes.body.data.riders.find((r) => r.id === riderId);
    assert(foundRider, "Test rider not found in admin list");

    // Approve Rider
    const approveRiderRes = await httpRequest("PATCH", `/api/admin/riders/${riderId}/approval`, {
      isApproved: true,
      reason: "Driving license and RC verified",
    }, adminToken);
    assert(approveRiderRes.status === 200, "Rider approval failed");
    assert(approveRiderRes.body.data.rider.isApproved === true, "Rider isApproved should be true");
    console.log("✅ Delivery partner approved successfully (isApproved: true)");

    // 6. Test Customer Account Suspension & Ban Enforcement
    console.log("\n--- [Step 6] Testing Customer Account Suspension (Ban / Unban) ---");
    // Ban customer
    const banRes = await httpRequest("PATCH", `/api/admin/users/${customerId}/ban`, {
      isBanned: true,
      reason: "Fraudulent chargeback attempt",
    }, adminToken);
    assert(banRes.status === 200, "User ban failed");
    assert(banRes.body.data.user.isBanned === true, "User isBanned should be true");

    // Attempt authenticated request with banned customer token -> 403 Forbidden
    const bannedRequest = await httpRequest("GET", "/api/users/me", null, customerToken);
    assert(bannedRequest.status === 403, "Expected 403 when banned user accesses authenticated route");
    console.log("✅ User ban enforced: Banned user immediately blocked with 403 Forbidden");

    // Unban customer
    const unbanRes = await httpRequest("PATCH", `/api/admin/users/${customerId}/ban`, {
      isBanned: false,
    }, adminToken);
    assert(unbanRes.status === 200, "User unban failed");
    assert(unbanRes.body.data.user.isBanned === false, "User isBanned should be false");
    console.log("✅ Customer account reinstated successfully (isBanned: false)");

    // 7. Test Video Reel Content Moderation (Take-down & Restore)
    console.log("\n--- [Step 7] Testing Video Reel Moderation (Take-down / Restore) ---");
    // Create test food item
    const food = await prisma.food.create({
      data: {
        foodPartnerId: partnerId,
        name: `Moderation Test Burger ${testSuffix}`,
        description: "Reel to test moderation take down",
        category: "Burgers",
        price: 260,
        video: "https://res.cloudinary.com/demo/video/upload/burger.mp4",
        thumbnailUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd",
        isVeg: false,
        isAvailable: true,
      },
    });
    testFoodId = food.id;

    // Take down food reel
    const takeDownRes = await httpRequest("PATCH", `/api/admin/reels/${testFoodId}/availability`, {
      isAvailable: false,
      reason: "Copyrighted music flagged in background audio",
    }, adminToken);
    assert(takeDownRes.status === 200, "Reel take-down failed");
    assert(takeDownRes.body.data.reel.isAvailable === false, "Food isAvailable should be false");

    // Verify dish is hidden from public search
    const searchCheckRes = await httpRequest("GET", `/api/search?q=Moderation%20Test%20Burger%20${testSuffix}`);
    assert(searchCheckRes.status === 200, "Search check failed");
    const foundInSearch = searchCheckRes.body.data.foods.find((f) => f.id === testFoodId);
    assert(!foundInSearch, "Taken down food item should NOT appear in public search");
    console.log("✅ Food reel taken down: Instantly hidden from public search");

    // Restore food reel
    const restoreRes = await httpRequest("PATCH", `/api/admin/reels/${testFoodId}/availability`, {
      isAvailable: true,
      reason: "Audio replaced and verified",
    }, adminToken);
    assert(restoreRes.status === 200, "Reel restore failed");
    assert(restoreRes.body.data.reel.isAvailable === true, "Food isAvailable should be true");
    console.log("✅ Food reel restored to active catalog (isAvailable: true)");

    console.log("\n=======================================================");
    console.log("  🎉 ALL PHASE 14 SUPERADMIN & MODERATION TESTS PASSED (100% OK)");
    console.log("=======================================================");
  } catch (error) {
    console.error("\n❌ PHASE 14 TEST SUITE FAILED:", error);
    process.exit(1);
  } finally {
    if (server) server.close();
    await prisma.$disconnect();
    process.exit(0);
  }
}

runTests();
