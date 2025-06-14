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
} = require("../controllers/userControllers");
const { isUser } = require("../middlewares/verifyUser");
const router = express.Router();

router.post("/signup", registerUser);
router.post("/login", loginUser);
router.post("/logout", isUser, logoutUser);
router.get("/profile", isUser, getUserDetails);
router.put("/update-profile", updateProfile);

router.post("/add-booking", isUser, addBooking)
router.get("/bookings", isUser, getAllBookings)
router.get("/bookings/:id", isUser, getBookingById)

router.get("/favourite-mandaps", isUser, getAllFavoriteMandaps);
router.post("/favourite-mandap", isUser, addFavoriteMandap);
router.delete("/favourite-mandap/:mandapId", isUser, deleteFavoriteMandap);

module.exports = router;
