const adminModel = require("../models/adminModel");
const generateToken = require("../config/generateToken");
const bcrypt = require("bcrypt");
const userModel = require("../models/userModel");
const providerModel = require("../models/providerModel");

exports.registerAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await adminModel.create({
      email,
      password,
    });
    generateToken(res, 201, admin, "admin");
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

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

//admin logout
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

// adding user
exports.addUser = async (req, res) => {
  try {
    const { fullName, email, phoneNumber, password } = req.body;
    const userExist = await userModel.findOne({ email });
    if (userExist) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await userModel.create({
      fullName,
      email,
      phoneNumber,
      password,
    });

    generateToken(res, 201, user, "user");
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// adding provider
exports.addProvider = async (req, res) => {
  try {
    const { name, email, password, phoneNumber } = req.body;
    const providerExists = await providerModel.findOne({ email });
    if (providerExists) {
      return res.status(400).json({ message: "provider already exists!" });
    }

    const provider = await providerModel.create({
      name,
      email,
      password,
      phoneNumber,
      isAuthorized: true,
    });

    generateToken(res, 201, provider, "provider");
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllUsers = () => {};

exports.getAllProviders = () => {};
