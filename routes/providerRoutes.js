const express = require("express");
const { isProvider } = require("../middlewares/verifyProvider");
const {
  registerProvider,
  loginProvider,
  logoutProvider,
  updateProvider,
  getProviderProfile,
  getProviderNotifications,
} = require("../controllers/providerControllers");
const { upload } = require("../config/cloudinary");
const {
  createMandap,
  getAllMandapByProviderID,
  deleteMandap,
  updateMandap,
  getMandapByID,
} = require("../controllers/mandapControllers");
const {
  addPhotographer,
  updatePhotographer,
  getAllPhotographers,
  deletePhotographer,
  getPhotographerById,
} = require("../controllers/photographerController");
const {
  deleteCaterer,
  updateCaterer,
  addCaterer,
  getAllCaterer,
  getCatererById,
  getAllCaterersByMandapId,
} = require("../controllers/catererController");
const {
  addRoom,
  updateRoom,
  deleteRoom,
  getAllRooms,
  getRoomById,
} = require("../controllers/roomController");
const {
  getAllBookingsByProvider,
} = require("../controllers/bookingController");
const {
  getReviewByMandapId,
  getAllReviewsByProviderId,
} = require("../controllers/reviewController");

const router = express.Router();

//provider profile releated
router.post("/signup", (req, res) => registerProvider(req, res, req.io));
router.post("/login", (req, res) => loginProvider(req, res, req.io));
router.post("/logout", logoutProvider);
router.get("/profile", isProvider, getProviderProfile);
router.put(
  "/update-profile",
  isProvider,
  upload.single("providerLogo"),
  updateProvider
);

//get notification
router.get("/notifications", isProvider, getProviderNotifications);

//bookings
router.get("/bookings", isProvider, getAllBookingsByProvider);

//mandaps
router.post(
  "/mandap",
  isProvider,
  upload.array("venueImages", 10),
  createMandap
);
router.get("/get-mandap", isProvider, getAllMandapByProviderID);
router.get("/get-mandap/:mandapId", isProvider, getMandapByID);
router.put(
  "/update-mandap/:mandapId",
  isProvider,
  upload.array("venueImages", 10),
  updateMandap
);
router.delete("/delete-mandap/:mandapId", isProvider, deleteMandap);

//photographer
router.post(
  "/add-photographer",
  isProvider,
  upload.array("sampleWork", 10),
  addPhotographer
);
router.get("/get-all-photographers", isProvider, getAllPhotographers);
router.put(
  "/update-photographer/:photographerId",
  isProvider,
  upload.array("sampleWork", 10),
  updatePhotographer
);
router.delete(
  "/delete-photographer/:photographerId",
  isProvider,
  deletePhotographer
);

router.get(
  "/get-photographer/:photographerId",
  isProvider,
  getPhotographerById
);

// caterer
router.post(
  "/add-caterer",
  isProvider,
  upload.array("categoryImage[]", 10),
  addCaterer
);
router.put(
  "/update-caterer/:catererId",
  isProvider,
  upload.array("categoryImage[]", 10),
  updateCaterer
);
router.delete("/delete-caterer/:catererId", isProvider, deleteCaterer);
router.get("/get-all-caterers", isProvider, getAllCaterer);
router.get("/get-caterer/:catererId", isProvider, getCatererById);
router.get("/get-all-caterer/:mandapId", isProvider, getAllCaterersByMandapId);

//rooms
router.post("/add-room", upload.any(), isProvider, addRoom);
router.put(
  "/update-room/:roomId",
  upload.fields([
    { name: "acRoomImages", maxCount: 10 },
    { name: "nonAcRoomImages", maxCount: 10 },
  ]),
  isProvider,
  updateRoom
);
router.delete("/delete-room/:roomId", isProvider, deleteRoom);
router.get("/get-all-rooms", isProvider, getAllRooms);
router.get("/get-room/:roomId", isProvider, getRoomById);

//reviews
router.get("/get-review/:mandapId", isProvider, getReviewByMandapId);
router.get(
  "/get-all-mandap-reviews/:providerId",
  isProvider,
  getAllReviewsByProviderId
);

module.exports = router;
