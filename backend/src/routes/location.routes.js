// src/routes/location.routes.js
//
// ─── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
// Routes for maps and geospatial services:
//   1. POST /api/location/geocode             - Convert address text to coordinates
//   2. POST /api/location/reverse-geocode     - Convert coordinates to formatted address
//   3. POST /api/location/autocomplete        - Autocomplete suggestions for place search
//   4. GET  /api/location/delivery-estimate   - Compute distance, ETA, and dynamic delivery fee
//   5. GET  /api/location/nearby-restaurants  - Find restaurants within radius sorted by distance
// ─────────────────────────────────────────────────────────────────────────────

const express = require("express");
const locationController = require("../controllers/location.controllers");
const locationValidators = require("../validators/location.validators");
const validate = require("../middlewares/validate.middleware");

const router = express.Router();

// Geocoding & Address Resolution
router.post(
  "/geocode",
  locationValidators.geocodeValidator,
  validate,
  locationController.geocode,
);

router.post(
  "/reverse-geocode",
  locationValidators.reverseGeocodeValidator,
  validate,
  locationController.reverseGeocode,
);

// Autocomplete Suggestions
router.post(
  "/autocomplete",
  locationValidators.autocompleteValidator,
  validate,
  locationController.autocomplete,
);

// Delivery ETA & Dynamic Fee Calculation
router.get(
  "/delivery-estimate",
  locationValidators.deliveryEstimateValidator,
  validate,
  locationController.getDeliveryEstimate,
);

// Nearby Restaurants Discovery
router.get(
  "/nearby-restaurants",
  locationValidators.nearbyRestaurantsValidator,
  validate,
  locationController.getNearbyRestaurants,
);

module.exports = router;
