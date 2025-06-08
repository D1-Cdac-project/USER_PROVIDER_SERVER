const mongoose = require("mongoose");
const generateToken = require("../config/generateToken");
const bcrypt = require("bcrypt");
const userModel = require("../models/userModel");
const addressModel = require("../models/addressModel");

exports.registerUser = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phoneNumber,
      password,
      state,
      city,
      pinCode,
      fullAddress,
    } = req.body;

    // Check for existing user
    const userExist = await userModel.findOne({ email });
    if (userExist) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }

    // Create address document
    const address = await addressModel.create({
      state,
      city,
      pinCode,
      fullAddress,
    });

    // Create user with address reference
    const user = await userModel.create({
      fullName,
      email,
      phoneNumber,
      password,
      address: address._id,
    });

    // Return response without generating a token
    return res.status(201).json({
      success: true,
      message: "User registered successfully",
    });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ success: false, message: "Email already in use" });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const userExist = await userModel.findOne({ email });
    if (!userExist) {
      return res
        .status(404)
        .json({ success: false, message: "Invalid Email or Password" });
    }

    const passwordMatch = await bcrypt.compare(password, userExist.password);
    if (!passwordMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Email or Password" });
    }

    // Generate token
    const token = generateToken(res, 200, userExist, true);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      fullName: userExist.fullName,
      token,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.logoutUser = async (req, res) => {
  try {
    return res
      .status(200)
      .json({ success: true, message: "Logout successful" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getUserDetails = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Populate the address field
    const populatedUser = await userModel
      .findById(user._id)
      .populate("address")
      .select("-password");

    if (!populatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      message: "User details retrieved successfully",
      user: {
        fullName: populatedUser.fullName,
        email: populatedUser.email,
        phoneNumber: populatedUser.phoneNumber,
        address: populatedUser.address,
      },
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user ID" });
    }
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const { fullName, email, phoneNumber, password, address } = req.body;

    // Update user fields
    if (fullName) user.fullName = fullName;
    if (email) user.email = email;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (password) user.password = password;

    // Update or create address if provided
    if (address) {
      let addressDoc;
      if (user.address) {
        addressDoc = await addressModel.findById(user.address);
        if (!addressDoc) {
          console.log(
            `Address not found for ID: ${user.address}, creating a new address.`
          );
          // Address not found, create a new one
          addressDoc = await addressModel.create({
            state: address.state || "",
            city: address.city || "",
            pinCode: address.pinCode || "",
            fullAddress: address.fullAddress || "",
          });
          user.address = addressDoc._id; // Update the user's address reference
        }
      } else {
        console.log(
          "No address reference found for user, creating a new address."
        );
        // No address reference, create a new one
        addressDoc = await addressModel.create({
          state: address.state || "",
          city: address.city || "",
          pinCode: address.pinCode || "",
          fullAddress: address.fullAddress || "",
        });
        user.address = addressDoc._id; // Set the user's address reference
      }

      // Update address fields if provided
      if (address.state) addressDoc.state = address.state;
      if (address.city) addressDoc.city = address.city;
      if (address.pinCode) addressDoc.pinCode = address.pinCode;
      if (address.fullAddress) addressDoc.fullAddress = address.fullAddress;
      await addressDoc.save();
    }

    await user.save();

    // Fetch updated user with populated address
    const updatedUser = await userModel
      .findById(user._id)
      .populate("address")
      .select("-password");

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        error: error.message,
      });
    }
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ success: false, message: "Email already in use" });
    }
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

//booking related --akshay
exports.getAllBookings = async (req, res) => {};
exports.addBooking = async (req, res) => {};
exports.updateBooking = async (req, res) => {};
exports.deleteBooking = async (req, res) => {};
exports.getBookingById = async (req, res) => {};

//mandap related  --vaishnavi
exports.getAllFavoriteMandaps = async (req, res) => {};
exports.addFavoriteMandap = async (req, res) => {};
exports.deleteFavoriteMandap = async (req, res) => {};

//caterer related  --tanay
exports.getCatererById = async (req, res) => {};

//photographer related  --tanay
exports.getPhotographerById = async (req, res) => {};

//room related  --vaishnavi
exports.getRoomById = async (req, res) => {};

//review related  --vaishnavi
exports.addReview = async (req, res) => {};
exports.updateReviewById = async (req, res) => {};
exports.deleteReviewById = async (req, res) => {};
