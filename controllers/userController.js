const userModel = require("../models/user");
const generateToken = require("../config/generateToken");
const bcrypt = require("bcrypt");

exports.registerUser = async (req, res) => {
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

    generateToken(res, 201, user, true);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const userExist = await userModel.findOne({ email });
    if (!userExist) {
      return res.status(404).json({ message: "Invalid Email or Password" });
    }

    const passwordMatch = await bcrypt.compare(password, userExist.password);
    if (!passwordMatch) {
      return res.status(400).json({ message: "Invalid Email or Password" });
    }

    generateToken(res, 200, userExist, true);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.logoutUser = async (req, res) => {
  try {
    res.cookie("userToken", null, {
      expires: new Date(Date.now()),
      httpOnly: true,
    });
    return res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.getUserDetails = async (req, res) => {
  try {
    if (!req.user) return res.status(400).json({ message: "Invalid Request" });
    const user = await userModel.findOne({ _id: req.user._id });

    if (!user) return res.status(404).json({ message: "No user found" });
    return res.status(200).json({ user });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
