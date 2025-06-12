const adminModel = require("../models/adminModel");
const mongoose = require("mongoose");
const generateToken = require("../config/generateToken");
const bcrypt = require("bcrypt");

// admin login
exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const adminExists = await adminModel.findOne({ email });
    if (!adminExists) {
      return res.status(404).json({ message: "Invalid email or password!" });
    }
    const passwordMatch = await bcrypt.compare(password, adminExists.password);
    if (!passwordMatch) {
      return res.status(404).json({ message: "Invalid email or password!" });
    }
    generateToken(res, 200, adminExists, "admin");
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.logoutAdmin = async (req, res) => {
  try {
    res.cookie("adminToken", null, {
      expires: new Date(Date.now()),
      httpOnly: true,
    });
    return res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.getAllUsers = () => {};

exports.getAllProviders = () => {};
