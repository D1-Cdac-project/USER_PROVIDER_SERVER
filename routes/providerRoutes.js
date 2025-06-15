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
  addPhotographer
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
router.get("/getmandap", isProvider, getAllMandapByProviderID);
router.put("/updatemandap/:mandapid", isProvider, updateMandap);
router.delete("/deletemandap/:mandapid", isProvider, deleteMandap);

// Photographer routes
router.post("/addphotographer", isProvider, addPhotographer);
module.exports = router;
