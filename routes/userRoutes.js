const express = require("express");

const { isUser } = require("../middlewares/verifyUser");
const { upload } = require("../config/cloudinary");
const {
  registerUser,
  loginUser,
  logoutUser,
  getUserDetails,
  updateProfile,
} = require("../controllers/userControllers");

const {
  addFavoriteMandap,
  getAllFavoriteMandaps,
  deleteFavoriteMandap,
} = require("../controllers/favouriteMandapController");

const {
  addBooking,
  getAllBookings,
  getBookingById,
  deleteBooking,
  updateBooking,
} = require("../controllers/bookingController");

const {
  getAllMandaps,
  searchMandap,
  getMandapByFilter,
  getMandapByID,
} = require("../controllers/mandapControllers");

const {
  getCatererById,
  getAllCaterersByMandapId,
} = require("../controllers/catererController");

const {
  getPhotographerByMandapId,
  getAllPhotographers,
} = require("../controllers/photographerController");
const {
  getRoomByMandapId,
  getAllRooms,
} = require("../controllers/roomController");
const {
  addReview,
  getReviewById,
  getReviewByMandapId,
  updateReviewById,
  deleteReviewById,
} = require("../controllers/reviewController");

const router = express.Router();

router.post("/signup", (req, res) => registerUser(req, res, req.io));
router.post("/login", (req, res) => loginUser(req, res, req.io));
router.post("/logout", logoutUser);
router.get("/profile", isUser, getUserDetails);
router.put(
  "/update-profile",
  isUser,
  upload.single("profileImage"),
  updateProfile
);
router.post("/add-favorite-mandap", isUser, addFavoriteMandap);
router.get("/favourite-mandaps", isUser, getAllFavoriteMandaps);
router.delete("/favourite-mandap/:mandapId", isUser, deleteFavoriteMandap);

router.post("/add-booking", isUser, addBooking);
router.get("/bookings", isUser, getAllBookings);
router.get("/booking/:id", isUser, getBookingById);
router.delete("/delete/:id", isUser, deleteBooking);
router.put("/update/:id", isUser, updateBooking);

router.get("/mandaps", getAllMandaps);
router.get("/search-mandap", searchMandap);
router.post("/filter-mandap", getMandapByFilter);
router.get("/mandap/:mandapId", getMandapByID);

router.get("/caterer/:catererId", getCatererById);
router.get("/caterers/:mandapId", getAllCaterersByMandapId);

router.get("/photographers/:mandapId", getPhotographerByMandapId);
router.get("/photographers", getAllPhotographers);

router.get("/rooms/:mandapId", getRoomByMandapId);
router.get("/rooms", getAllRooms);

router.post("/add-review", isUser, addReview);
router.get("/review/:reviewId", isUser, getReviewById);
router.get("/reviews/:mandapId", getReviewByMandapId);
router.put("/update-review/:reviewId", isUser, updateReviewById);
router.delete("/delete-review/:reviewId", isUser, deleteReviewById);

module.exports = router;
