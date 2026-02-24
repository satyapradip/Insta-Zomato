// create server
const express = require("express");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/auth.routes");
const foodRoutes = require("./routes/food.routes");

// create express app
const app = express();

// middleware to parse JSON, this will allow us to access req.body, which is where the data sent in the request will be stored
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// use auth routes
app.use("/api/auth", authRoutes);
// use food routes
app.use("/api/food", foodRoutes);

// export the app module
module.exports = app;
