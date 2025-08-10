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

// Enhanced CORS configuration
app.use(
  cors({
    origin: [
      "http://localhost:5500",
      "http://localhost:3000",
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      "http://localhost:5176",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
      "http://127.0.0.1:5175",
      "http://127.0.0.1:5176",
    ],
    methods: ["GET", "PUT", "POST", "DELETE"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-csrf-token",
      "X-Requested-With",
      "Accept",
      "Origin",
    ],
    credentials: true,
    optionsSuccessStatus: 200, // For legacy browser support
  })
);

// Initialize Socket.IO with CORS configuration
const io = socketIO(server, {
  cors: {
    origin: [
      "http://localhost:5500",
      "http://localhost:3000",
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      "http://localhost:5176",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
      "http://127.0.0.1:5175",
      "http://127.0.0.1:5176",
    ],
    methods: ["GET", "PUT", "POST", "DELETE"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-csrf-token",
      "X-Requested-With",
      "Accept",
      "Origin",
    ],
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
  // Handling provider login to their room
  socket.on("joinProviderRoom", (providerId) => {
    socket.join(providerId);
  });

  // Handling user login to their room
  socket.on("joinUserRoom", (userId) => {
    socket.join(userId);
  });

  // Handling admin login to their room
  socket.on("joinAdminRoom", (adminId) => {
    socket.join(adminId);
  });

  // Handle client disconnection
  socket.on("disconnect", () => {});
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
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log("Server is running on port " + PORT);
});
