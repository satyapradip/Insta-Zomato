const express = require("express");
const authController = require("../controllers/auth.controllers");


const router = express.Router();

// @route   POST api/auth/login
// @desc    Authenticate user and get token
// @access  Public

//routes for the user
router.post("/user/register", authController.registerUser);
router.post("/user/login", authController.loginUser);
router.post("/user/logout", authController.logoutUser);
//routes for the food partner
router.post("/foodpartner/register", authController.registerFoodPartner);
router.post("/foodpartner/login", authController.loginFoodPartner);
router.post("/foodpartner/logout", authController.logoutFoodPartner);



module.exports = router;
