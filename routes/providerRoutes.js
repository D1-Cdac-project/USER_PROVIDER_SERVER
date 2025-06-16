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
  getAllPhotographers
} = require("../controllers/providerControllers");

const router = express.Router();

// Provider routes
router.post("/signup", registerProvider);
router.post("/login", loginProvider);
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
router.get("/get-all-photographer/:madapId", isProvider, getAllPhotographers);
module.exports = router;
