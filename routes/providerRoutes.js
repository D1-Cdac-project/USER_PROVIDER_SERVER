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
router.get("/getmandap", isProvider, getAllMandapByProviderID);
router.put("/updatemandap/:mandapid", isProvider, updateMandap);
router.delete("/deletemandap/:mandapid", isProvider, deleteMandap);

module.exports = router;
