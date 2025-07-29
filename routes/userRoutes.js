const express = require("express");

const { isUser } = require("../middlewares/verifyUser");
const { upload } = require("../config/cloudinary");
const {
  registerUser,
  loginUser,
  logoutUser,
  getUserDetails,
  updateProfile,
  aboutUsEmailSender,
} = require("../controllers/userControllers");

const {
  addFavoriteMandap,
  getAllFavoriteMandaps,
  deleteFavoriteMandap,
} = require("../controllers/favouriteMandapController");

const {
  addBooking,
  getBookingById,
  deleteBooking,
  updateBooking,
  getAllBookingsByUser,
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

// user api's 
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
router.post("/send", isUser,aboutUsEmailSender);

// add favourite mandap api's 
router.post("/add-favorite-mandap", isUser, addFavoriteMandap);
router.get("/favourite-mandaps", isUser, getAllFavoriteMandaps);
router.delete("/favourite-mandap/:mandapId", isUser, deleteFavoriteMandap);

// booking  api's 
router.post("/add-booking", isUser, addBooking);
router.get("/bookings", isUser, getAllBookingsByUser);
router.get("/booking/:id", isUser, getBookingById);
router.delete("/delete/:id", isUser, deleteBooking);
router.put("/update/:id", isUser, updateBooking);

// mandap api's 
router.get("/mandaps", getAllMandaps);
router.get("/search-mandap", searchMandap);
router.post("/filter-mandap", getMandapByFilter);
router.get("/mandap/:mandapId", getMandapByID);

//caterer api's
router.get("/caterer/:catererId", getCatererById);
router.get("/caterers/:mandapId", getAllCaterersByMandapId);

// photographer api's 
router.get("/photographers/:mandapId", getPhotographerByMandapId);
router.get("/photographers", getAllPhotographers);

//rooms api's
router.get("/rooms/:mandapId", getRoomByMandapId);
router.get("/rooms", getAllRooms);

//review api's
router.post("/add-review", isUser, addReview);
router.get("/review/:reviewId", isUser, getReviewById);
router.get("/reviews/:mandapId", getReviewByMandapId);
router.put("/update-review/:reviewId", isUser, updateReviewById);
router.delete("/delete-review/:reviewId", isUser, deleteReviewById);

module.exports = router;
