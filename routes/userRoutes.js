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
const router = express.Router();

router.post("/signup", registerUser);
router.post("/login", loginUser);
router.post("/logout", isUser, logoutUser);
router.get("/profile", isUser, getUserDetails);
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
