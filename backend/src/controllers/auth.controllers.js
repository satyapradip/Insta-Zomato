const userModel = require("../models/user.models");
const foodPartnerModel = require("../models/foodpartner.models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

async function registerUser(req, res) {
  const { fullName, email, password } = req.body;

  const isUserAlreadyExists = await userModel.findOne({ email });
  if (isUserAlreadyExists) {
    return res.status(400).json({ message: "User already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await userModel.create({
    fullName,
    email,
    password: hashedPassword,
  });

  const token = jwt.sign(
    {
      id: user._id,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" },
  );

  res.cookie("token", token, { httpOnly: true, secure: false });

  res.status(201).json({
    message: "User registered successfully",
    user: {
      id: user._id,
      email: user.email,
      fullName: user.fullName,
    },
  });
}

async function loginUser(req, res) {
  const { email, password } = req.body;

  const user = await userModel.findOne(
    { email },
  )

  if (!user) {
    return res.status(400).json({ message: "Invalid email or password" });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    return res.status(400).json({ message: "Invalid email or password" });
  }

  const token = jwt.sign(
    {
      id: user._id,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" },
  );

  res.cookie("token", token, { httpOnly: true, secure: false });

  res.status(200).json({
    message: "User logged in successfully",
    user: {
      id: user._id,
      email: user.email,
      fullName: user.fullName,
    },
  });
}

async function logoutUser(req, res) {
  res.clearCookie("token");
  res.status(200).json({ message: "User logged out successfully" });
}

async function registerFoodPartner(req, res) {
  const { name, email, password, phone } = req.body;

  const isFoodPartnerAlreadyExists = await foodPartnerModel.findOne({ email });

  if (isFoodPartnerAlreadyExists) {
    return res.status(400).json({ message: "Food partner already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const foodPartner = await foodPartnerModel.create({
    name,
    email,
    password: hashedPassword,
    phone,
  });

  // Generate JWT token for the food partner
  const token = jwt.sign(
    {
      id: foodPartner._id,
      email: foodPartner.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" },
  );
  // Set the token in an HTTP-only cookie
  res.cookie("token", token, { httpOnly: true, secure: false });
// Respond with the food partner details (excluding the password)
  res.status(201).json({
    message: "Food partner registered successfully",
    foodPartner: {
      id: foodPartner._id,
      email: foodPartner.email,
      name: foodPartner.name,
      phone: foodPartner.phone,
    },
  });
}

async function loginFoodPartner(req, res) {
  const { email, password } = req.body;
  const foodPartner = await foodPartnerModel.findOne({ email });

  if (!foodPartner) {
    return res.status(400).json({ message: "Invalid email or password" });
  }

  const isPasswordValid = await bcrypt.compare(password, foodPartner.password);

  if (!isPasswordValid) {
    return res.status(400).json({ message: "Invalid email or password" });
  }

  const token = jwt.sign(
    {
      id: foodPartner._id,
      email: foodPartner.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" },
  );

  res.cookie("token", token, { httpOnly: true, secure: false });

  res.status(200).json({
    message: "Food partner logged in successfully",
    foodPartner: {
      id: foodPartner._id,
      email: foodPartner.email,
      name: foodPartner.name,
      phone: foodPartner.phone,
    },
  });
}

async function logoutFoodPartner(req, res) {
  res.clearCookie("token");
  res.status(200).json({ message: "Food partner logged out successfully" });
}

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  registerFoodPartner,
  loginFoodPartner,
  logoutFoodPartner,
};
