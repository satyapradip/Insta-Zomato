const express = require("express");
const authController = require("../controllers/auth.controllers");

const router = express.Router();

// @route   POST api/auth/login
// @desc    Authenticate user and get token
// @access  Public

router.post("/user/register", authController.registerUser);
router.post("/user/login", authController.loginUser);
router.post("/user/logout", authController.logoutUser);
module.exports = router;
