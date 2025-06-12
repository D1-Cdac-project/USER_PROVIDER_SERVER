// Importing required modules
const cors = require("cors");
const cookieParser = require("cookie-parser");
const env = require("dotenv");
const express = require("express");
const mongoose = require("mongoose");

// Importing routers
const adminRouter = require("./routes/adminRoutes");
const providerRouter = require("./routes/providerRoutes");
const userRouter = require("./routes/userRoutes");

// Initialize express app
const app = express();

// Load configuration
env.config();

mongoose.set("strictQuery", true);

//middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin: ["http://localhost:5500", "http://localhost:3000"],
    methods: ["GET", "PUT", "POST", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "x-csrf-token"],
    credentials: true,
  })
);

// Define routes
app.use("/api/admin", adminRouter);
app.use("/api/provider", providerRouter);
app.use("/api/user", userRouter);

// MongoDB connections
mongoose.connect(process.env.MONGODB_CONNECTION).then(() => {
  console.log("Database connected");
});

// Server listening
app.listen(process.env.PORT, () => {
  console.log("Server is running on port " + process.env.PORT);
});
