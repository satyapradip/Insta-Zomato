const foodPartnerModel = require("../models/foodpartner.models");
const userModel = require("../models/user.models");
const jwt = require("jsonwebtoken");

async function authFoodPartnerMiddleware(req, res, next) {
  // Accept token from cookie OR Authorization: Bearer <token> header
  let token = req.cookies.token;
  if (!token && req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "Unauthorized access" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.decoded = decoded; // attach decoded token to req

    const foodPartner = await foodPartnerModel.findById(decoded.id);
    if (!foodPartner) {
      return res.status(401).json({ message: "Unauthorized access" });
    }

    req.foodPartner = foodPartner; // attach food partner to req
    next();
  } catch (error) {
    // JWT errors (expired, invalid signature, etc.) should be 401, not 500
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function authUserMiddleware(req, res, next) {
  // Accept token from cookie OR Authorization: Bearer <token> header
  let token = req.cookies.token;
  if (!token && req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "Unauthorized access" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await userModel.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized access" });
    }
    req.user = user; // attach user to req
    next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
}

module.exports = {
  authFoodPartnerMiddleware,
  authUserMiddleware,
};
