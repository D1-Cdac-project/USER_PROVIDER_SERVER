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
  addBooking,
  getAllBookings,
  getBookingById,
  deleteBooking,
  updateBooking,
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
router.put("/update-profile", updateProfile);

router.post("/add-booking", isUser, addBooking)
router.get("/bookings", isUser, getAllBookings)
router.get("/booking/:id", isUser, getBookingById)
router.delete("/delete/:id", isUser, deleteBooking)
router.put("/update/:id", isUser, updateBooking)

router.get("/favourite-mandaps", isUser, getAllFavoriteMandaps);
router.post("/favourite-mandap", isUser, addFavoriteMandap);
router.delete("/favourite-mandap/:mandapId", isUser, deleteFavoriteMandap);

module.exports = router;
