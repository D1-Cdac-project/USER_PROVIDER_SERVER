const express = require("express");
const {
  updateProfile,
  registerUser,
  loginUser,
} = require("../controllers/userControllers");
const router = express.Router();

router.post("/signup", registerUser);

router.post("/login", loginUser);

router.post("/profile", updateProfile);

module.exports = router;
