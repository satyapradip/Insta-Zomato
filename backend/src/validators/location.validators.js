// src/validators/location.validators.js
const { body, query } = require("express-validator");

const geocodeValidator = [
  body("address")
    .trim()
    .notEmpty()
    .withMessage("Address string is required for geocoding"),
];

const reverseGeocodeValidator = [
  body("latitude")
    .notEmpty()
    .withMessage("Latitude is required")
    .isFloat({ min: -90, max: 90 })
    .withMessage("Latitude must be between -90 and 90"),
  body("longitude")
    .notEmpty()
    .withMessage("Longitude is required")
    .isFloat({ min: -180, max: 180 })
    .withMessage("Longitude must be between -180 and 180"),
];

const autocompleteValidator = [
  body("query")
    .trim()
    .notEmpty()
    .withMessage("Query string is required for autocomplete"),
];

const nearbyRestaurantsValidator = [
  query("latitude")
    .notEmpty()
    .withMessage("Latitude query param is required")
    .isFloat({ min: -90, max: 90 })
    .withMessage("Latitude must be between -90 and 90"),
  query("longitude")
    .notEmpty()
    .withMessage("Longitude query param is required")
    .isFloat({ min: -180, max: 180 })
    .withMessage("Longitude must be between -180 and 180"),
  query("radius")
    .optional()
    .isFloat({ min: 0.5, max: 50 })
    .withMessage("Radius must be between 0.5km and 50km"),
];

const deliveryEstimateValidator = [
  query("partnerId")
    .trim()
    .notEmpty()
    .withMessage("Restaurant partnerId is required"),
  query("latitude")
    .notEmpty()
    .withMessage("Customer latitude is required")
    .isFloat({ min: -90, max: 90 })
    .withMessage("Latitude must be between -90 and 90"),
  query("longitude")
    .notEmpty()
    .withMessage("Customer longitude is required")
    .isFloat({ min: -180, max: 180 })
    .withMessage("Longitude must be between -180 and 180"),
];

module.exports = {
  geocodeValidator,
  reverseGeocodeValidator,
  autocompleteValidator,
  nearbyRestaurantsValidator,
  deliveryEstimateValidator,
};
