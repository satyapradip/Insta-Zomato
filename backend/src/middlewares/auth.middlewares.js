const foodPartnerModel = require("../models/foodpartner.models");
const jwt = require("jsonwebtoken");

async function authFoodPartnerMiddleware(req, res, next) {
  const token = req.cookies.token;

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
    return res.status(500).json({ message: "Internal server error" });
  }
}




module.exports = {
  authFoodPartnerMiddleware,
};
