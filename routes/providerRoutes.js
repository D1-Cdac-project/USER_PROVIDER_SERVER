const express = require("express");

const { isProvider } = require("../middlewares/verifyProvider");
const {
  registerProvider,
  loginProvider,
  logoutProvider,
  getProvider,
  updateProvider,
} = require("../controllers/providerControllers");

const router = express.Router();

router.post("/signup", registerProvider);
router.post("/login", loginProvider);
router.post("/logout", logoutProvider);
router.get("/profile", isProvider, getProvider);
router.put("/update-profile", isProvider, updateProvider);

module.exports = router;
