const express = require("express");
const { isProvider } = require("../middlewares/verifyProvider");
const {
  registerProvider,
  loginProvider,
  logoutProvider,
  getProvider,
  updateProvider,
  getAllBookings,
} = require("../controllers/providerControllers");
const { upload } = require("../config/cloudinary");
const {
  createMandap,
  getAllMandapByProviderID,
  deleteMandap,
  updateMandap,
} = require("../controllers/mandapControllers");
const {
  addPhotographer,
  updatePhotographer,
  getAllPhotographers,
  deletePhotographer,
} = require("../controllers/photographerController");
const {
  deleteCaterer,
  updateCaterer,
  addCaterer,
  getAllCaterer,
  getCatererById,
} = require("../controllers/catererController");
const {
  addRoom,
  updateRoom,
  deleteRoom,
  getAllRooms,
  getRoomById,
} = require("../controllers/roomController");

const router = express.Router();

router.post("/signup", (req, res) => registerProvider(req, res, req.io));
router.post("/login", (req, res) => loginProvider(req, res, req.io));
router.post("/logout", logoutProvider);
router.get("/profile", isProvider, getProvider);
router.get("/bookings", isProvider, getAllBookings);
router.put(
  "/update-profile",
  isProvider,
  upload.single("providerLogo"),
  updateProvider
);
router.post(
  "/mandap",
  isProvider,
  upload.array("venueImages", 10),
  createMandap
);
router.get("/get-mandap", isProvider, getAllMandapByProviderID);
router.put(
  "/update-mandap/:mandapId",
  isProvider,
  upload.array("venueImages", 10),
  updateMandap
);
router.delete("/delete-mandap/:mandapId", isProvider, deleteMandap);
router.post(
  "/add-photographer",
  isProvider,
  upload.array("sampleWork", 10),
  addPhotographer
);
router.get("/get-all-photographers/:mandapId", isProvider, getAllPhotographers);
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
// caterer
router.post(
  "/add-caterer",
  isProvider,
  upload.single("categoryImage"),
  addCaterer
);
router.put(
  "/update-caterer/:catererId",
  isProvider,
  upload.single("categoryImage"),
  updateCaterer
);

router.delete("/delete-caterer/:catererId", isProvider, deleteCaterer);
router.get("/get-all-caterers", isProvider, getAllCaterer);
router.get("/get-caterer/:catererId", isProvider, getCatererById);

router.post("/add-room", isProvider, addRoom);
router.put("/update-room/:roomId", isProvider, updateRoom);
router.delete("/delete-room/:roomId", isProvider, deleteRoom);
router.get("/get-all-rooms", isProvider, getAllRooms);
router.get("/get-room/:roomId", isProvider, getRoomById);

module.exports = router;
