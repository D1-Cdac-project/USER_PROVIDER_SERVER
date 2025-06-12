const express = require("express");
const {
  logoutAdmin,
  loginAdmin,
  getAllUsers,
} = require("../controllers/adminControllers");
const { isAdmin } = require("../middlewares/verifyAdmin");

const router = express.Router();

router.post("/login", loginAdmin);

router.post("/logout", logoutAdmin);

router.get("/getAllUsers", isAdmin, getAllUsers);

module.exports = router;
