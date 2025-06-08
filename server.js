const cors = require("cors");
const env = require("dotenv");
const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");

const userRouter = require("./routes/userRoutes");
const providerRouter = require("./routes/providerRoutes")
const app = express();
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
app.use("/user", userRouter);
app.use("/provider", providerRouter)

// MongoDB connections
mongoose.connect(process.env.MONGODB_CONNECTION).then(() => {
  console.log("Database connected");
});

app.listen(process.env.PORT, () => {
  console.log("Server is running on port " + process.env.PORT);
});
