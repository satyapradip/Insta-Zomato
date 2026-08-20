const express = require("express");
const orderController = require("../controllers/order.controllers");
const orderValidators = require("../validators/order.validators");
const validate = require("../middlewares/validate.middleware");
const {
  requireAuth,
  requireCustomer,
  requireFoodPartner,
  requireDeliveryPartner,
  requireAdmin,
} = require("../middlewares/auth.middlewares");

const router = express.Router();

// ── All Order Routes Require Valid Authentication ───────────────────────────
router.use(requireAuth);

// ── Customer Order Routes ───────────────────────────────────────────────────
// POST /api/orders — Place order from active cart
router.post(
  "/",
  requireCustomer,
  orderValidators.placeOrder,
  validate,
  orderController.placeOrder,
);

// GET /api/orders — Customer order history
router.get(
  "/",
  requireCustomer,
  orderValidators.queryOrders,
  validate,
  orderController.getCustomerOrders,
);

// POST /api/orders/:id/cancel — Customer cancels pending/confirmed order
router.post(
  "/:id/cancel",
  requireCustomer,
  orderValidators.cancelOrder,
  validate,
  orderController.cancelOrderByCustomer,
);

// ── Food Partner Routes ─────────────────────────────────────────────────────
// GET /api/orders/partner/orders — Incoming & active orders for restaurant
router.get(
  "/partner/orders",
  requireFoodPartner,
  orderValidators.queryOrders,
  validate,
  orderController.getPartnerOrders,
);

// PUT /api/orders/:id/confirm — Partner accepts order (CONFIRMED)
router.put(
  "/:id/confirm",
  requireFoodPartner,
  orderValidators.confirmOrder,
  validate,
  orderController.confirmOrderByPartner,
);

// PUT /api/orders/:id/preparing — Partner begins cooking (PREPARING)
router.put(
  "/:id/preparing",
  requireFoodPartner,
  orderController.preparingOrderByPartner,
);

// PUT /api/orders/:id/ready — Partner packs food (READY_FOR_PICKUP)
router.put(
  "/:id/ready",
  requireFoodPartner,
  orderController.readyOrderByPartner,
);

// PUT /api/orders/:id/partner-cancel — Partner cancels order (CANCELLED)
router.put(
  "/:id/partner-cancel",
  requireFoodPartner,
  orderValidators.partnerCancel,
  validate,
  orderController.cancelOrderByPartner,
);

// ── Delivery Partner (Rider) Routes ─────────────────────────────────────────
// GET /api/orders/rider/available — Query open ready orders for delivery
router.get(
  "/rider/available",
  requireDeliveryPartner,
  orderValidators.queryOrders,
  validate,
  orderController.getAvailableOrdersForRider,
);

// POST /api/orders/:id/accept-delivery — Rider claims delivery assignment
router.post(
  "/:id/accept-delivery",
  requireDeliveryPartner,
  orderController.acceptDeliveryByRider,
);

// PUT /api/orders/:id/pickup — Rider collects food from restaurant (PICKED_UP)
router.put(
  "/:id/pickup",
  requireDeliveryPartner,
  orderController.pickupOrderByRider,
);

// PUT /api/orders/:id/out-for-delivery — Rider heads towards customer (OUT_FOR_DELIVERY)
router.put(
  "/:id/out-for-delivery",
  requireDeliveryPartner,
  orderController.outForDeliveryByRider,
);

// PUT /api/orders/:id/deliver — Rider confirms delivery with OTP (DELIVERED)
router.put(
  "/:id/deliver",
  requireDeliveryPartner,
  orderValidators.deliverOrder,
  validate,
  orderController.deliverOrderByRider,
);

// PUT /api/orders/:id/delivery-failed — Rider marks delivery failed (FAILED)
router.put(
  "/:id/delivery-failed",
  requireDeliveryPartner,
  orderValidators.failDelivery,
  validate,
  orderController.failDeliveryByRider,
);

// ── Shared / Universal Order Tracking & Detail Routes ───────────────────────
// GET /api/orders/:id/track — Live tracking metadata
router.get("/:id/track", orderController.trackOrder);

// GET /api/orders/:id — Detailed order view (Customer/Partner/Rider/Admin)
router.get("/:id", orderController.getOrderDetail);

// ── Admin Routes ────────────────────────────────────────────────────────────
// GET /api/orders/admin/all — Global order audit stream
router.get(
  "/admin/all",
  requireAdmin,
  orderValidators.queryOrders,
  validate,
  orderController.getAllOrdersAdmin,
);

module.exports = router;
