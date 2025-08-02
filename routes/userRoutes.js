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
  completePayment,
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
  getPhotographerById,
} = require("../controllers/photographerController");
const {
  getRoomByMandapId,
  getAllRooms,
  getRoomById,
} = require("../controllers/roomController");
const {
  addReview,
  getReviewById,
  getReviewByMandapId,
  updateReviewById,
  deleteReviewById,
} = require("../controllers/reviewController");

const router = express.Router();

//user profile
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

//bookings
router.get("/bookings", isUser, getAllBookingsByUser);
router.get("/booking/:id", isUser, getBookingById);
router.post("/add-booking", isUser, addBooking);
router.delete("/delete/:id", isUser, deleteBooking);
router.put("/update/:id", isUser, updateBooking);
router.post("/complete-payment/:id", isUser, completePayment);

//mandaps
router.get("/mandaps", getAllMandaps);
router.get("/search-mandap", searchMandap);
router.post("/filter-mandap", getMandapByFilter);
router.get("/mandap/:mandapId", getMandapByID);

// caterer
router.get("/caterer/:catererId", getCatererById);
router.get("/caterers/:mandapId", getAllCaterersByMandapId);

// photographer
router.get("/photographers/:mandapId", getPhotographerByMandapId);
router.get("/photographers", getAllPhotographers);
router.get("/get-photographer/:photographerId", getPhotographerById);

// rooms
router.get("/rooms/:mandapId", getRoomByMandapId);
router.get("/rooms", getAllRooms);
router.get("/get-room/:roomId", getRoomById);

//reviews
router.post("/add-review", isUser, addReview);
router.get("/review/:reviewId", isUser, getReviewById);
router.get("/reviews/:mandapId", getReviewByMandapId);
router.put("/update-review/:reviewId", isUser, updateReviewById);
router.delete("/delete-review/:reviewId", isUser, deleteReviewById);

module.exports = router;
