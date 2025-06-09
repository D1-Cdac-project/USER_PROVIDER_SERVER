const express = require("express");
const {
  updateProfile,
  registerUser,
  loginUser,
  getUserDetails,
  logoutUser,
} = require("../controllers/userControllers");
const { isUser } = require("../middlewares/verifyUser");
const router = express.Router();

router.post("/signup", registerUser);
router.post("/login", loginUser);
router.post("/logout", isUser, logoutUser);
router.get("/profile", isUser, getUserDetails);
router.put("/update-profile", isUser, updateProfile);

module.exports = router;
