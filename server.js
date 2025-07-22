// Importing required modules
const cookieParser = require("cookie-parser");
const cors = require("cors");
const env = require("dotenv");
const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const socketIO = require("socket.io");

// Importing routers
const adminRouter = require("./routes/adminRoutes");
const providerRouter = require("./routes/providerRoutes");
const userRouter = require("./routes/userRoutes");

// Initialize express app
const app = express();
const server = http.createServer(app);

// Load configuration
env.config();

//middlewares
app.use(express.static("public")); // Optional: for serving static files
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

// Initialize Socket.IO with CORS configuration
const io = socketIO(server, {
  cors: {
    origin: ["http://localhost:5500", "http://localhost:3000"],
    methods: ["GET", "PUT", "POST", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "x-csrf-token"],
    credentials: true,
  },
});

// Middleware to attach io instance to every request
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Socket.IO connection handler
io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  // Handling provider login to their room
  socket.on("joinProviderRoom", (providerId) => {
    socket.join(providerId);
    console.log(`Provider ${providerId} joined their room`);
  });

  // Handling user login to their room
  socket.on("joinUserRoom", (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their room`);
  });

  // Handling admin login to their room
  socket.on("joinAdminRoom", (adminId) => {
    socket.join(adminId);
    console.log(`Admin ${adminId} joined their room`);
  });

  // Handle client disconnection
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// Define routes
app.use("/api/admin", adminRouter);
app.use("/api/provider", providerRouter);
app.use("/api/user", userRouter);

// Configure Mongoose and connect to MongoDB
mongoose.set("strictQuery", true);
mongoose.connect(process.env.MONGODB_CONNECTION).then(() => {
  console.log("Database connected");
});

// Server listening
app.listen(process.env.PORT, () => {
  console.log("Server is running on port " + process.env.PORT);
});
