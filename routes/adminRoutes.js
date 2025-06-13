const express = require("express");
const {
  logoutAdmin,
  loginAdmin,
  getAllUsers,
  addProvider,
  addUser,
  registerAdmin,
} = require("../controllers/adminControllers");
const { isAdmin } = require("../middlewares/verifyAdmin");

const router = express.Router();

router.post("/login", loginAdmin);

router.post("/signup", registerAdmin);

router.post("/logout", logoutAdmin);

router.post("/addUser", isAdmin, addUser);

router.post("/addProvider", isAdmin, addProvider);

router.get("/getAllUsers", isAdmin, getAllUsers);

module.exports = router;
