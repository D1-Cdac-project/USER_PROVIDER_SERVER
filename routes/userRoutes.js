const express = require("express");
const {
  updateProfile,
  registerUser,
  loginUser,
  getUserDetails,
  logoutUser,
  getAllFavoriteMandaps,
  addFavoriteMandap,
  deleteFavoriteMandap,
} = require("../controllers/userControllers");
const { isUser } = require("../middlewares/verifyUser");

// Initialize router
const router = express.Router();

// User authentication routes
router.post("/signup", (req, res) => registerUser(req, res, req.io));
router.post("/login", (req, res) => loginUser(req, res, req.io));
router.post("/logout", logoutUser);

// User profile routes
router.get("/profile", isUser, getUserDetails);
router.put("/update-profile", isUser, updateProfile);

// Favorite mandap route
router.post("/add-favorite-mandap", isUser, addFavoriteMandap);

module.exports = router;
