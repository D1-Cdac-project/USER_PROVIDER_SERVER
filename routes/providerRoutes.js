const express = require("express");

const { isProvider } = require("../middlewares/verifyProvider");
const {
  registerProvider,
  loginProvider,
  logoutProvider,
  getProvider,
  updateProvider,
  createMandap,
  getAllMandapByProviderID,
  updateMandap,
  deleteMandap,
  addPhotographer,
  getAllPhotographers,
  updatePhotographer,
  deletePhotographer
} = require("../controllers/providerControllers");

// Initialize router
const router = express.Router();

// Provider routes
router.post("/signup", (req, res) => registerProvider(req, res, req.io));
router.post("/login", (req, res) => loginProvider(req, res, req.io));
router.post("/logout", logoutProvider);
router.get("/profile", isProvider, getProvider);
router.put("/update-profile", isProvider, updateProvider);

// Mandap routes
router.post("/mandap", isProvider, createMandap);
router.get("/get-mandap", isProvider, getAllMandapByProviderID);
router.put("/update-mandap/:mandapId", isProvider, updateMandap);
router.delete("/delete-mandap/:mandapId", isProvider, deleteMandap);

// Photographer routes
router.post("/addphotographer", isProvider, addPhotographer);
router.get("/get-all-photographers/:mandapId", isProvider, getAllPhotographers);
router.put("/update-photographer/:photographerId", isProvider, updatePhotographer);
router.delete("/delete-photographer/:photographerId", isProvider, deletePhotographer);
module.exports = router;
