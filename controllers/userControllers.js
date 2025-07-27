const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const generateToken = require("../config/generateToken");
const { createSuccessResult, createErrorResult } = require("../config/result");
const { sendRegistrationEmail } = require("../config/mailer");

const adminModel = require("../models/adminModel");
const notificationModel = require("../models/notificationModel");
const userModel = require("../models/userModel");

//registration of new user
exports.registerUser = async (req, res, io) => {
  try {
    const { fullName, email, phoneNumber, password } = req.body;
    const userExist = await userModel.findOne({ email });
    if (userExist) {
      return res.status(400).json(createErrorResult("User already exists"));
    }

    const user = await userModel.create({
      fullName,
      email,
      phoneNumber,
      password,
    });

    await sendRegistrationEmail(user.email, user.fullName, "user");

    const admins = await adminModel.find({});
    const notificationPromises = admins.map(async (admin) => {
      return notificationModel.create({
        recipientId: admin._id,
        type: "user_registration",
        message: `New user registered: ${user.fullName} (${user.email})`,
        relatedId: user._id,
        relatedModel: "Users",
      });
    });
    await Promise.all(notificationPromises);

    io.emit("newUserRegistration", {
      user: { _id: user._id, fullName: user.fullName, email: user.email },
      createdAt: new Date(),
    });

    return generateToken(res, 201, user, "user");
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};

// function for login
exports.loginUser = async (req, res, io) => {
  try {
    const { email, password } = req.body;
    const userExist = await userModel.findOne({ email });
    if (!userExist) {
      return res
        .status(404)
        .json(createErrorResult("Invalid Email or Password"));
    }

    const passwordMatch = await bcrypt.compare(password, userExist.password);
    if (!passwordMatch) {
      return res
        .status(400)
        .json(createErrorResult("Invalid Email or Password"));
    }

    io.to(userExist._id.toString()).emit("loginSuccess", {
      userId: userExist._id,
      message: "Login successful",
    });

    return generateToken(res, 200, userExist, "user");
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};

//logout
exports.logoutUser = async (req, res) => {
  try {
    res.cookie("userToken", null, {
      expires: new Date(Date.now()),
      httpOnly: true,
    });
    return res
      .status(200)
      .json(createSuccessResult({ message: "Logout successful" }));
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};

// get authenticated user details
exports.getUserDetails = async (req, res) => {
  try {
    if (!req.user)
      return res.status(400).json(createErrorResult("Invalid Request"));
    const user = await userModel
      .findById(req.user._id)
      .select("-password")
      .populate("address");
    if (!user) return res.status(404).json(createErrorResult("No user found"));
    return res.status(200).json(createSuccessResult({ user }));
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};

// update authenticate user
exports.updateProfile = async (req, res) => {
  try {
    const { fullName, email, phoneNumber, password, address } = req.body;
    const update = {};
    if (fullName) update.fullName = fullName;
    if (email) update.email = email;
    if (phoneNumber) update.phoneNumber = phoneNumber;
    if (address) {
      let addressDoc;
      if (
        typeof address === "object" &&
        address.state &&
        address.city &&
        address.pinCode
      ) {
        // Create or find an address
        addressDoc = await mongoose.model("Address").findOne(address);
        if (!addressDoc) {
          addressDoc = await mongoose.model("Address").create({
            ...address,
            fullAddress: address.fullAddress || "",
          });
        }
        update.address = addressDoc._id;
      } else if (mongoose.isValidObjectId(address)) {
        update.address = address;
      } else {
        return res
          .status(400)
          .json(createErrorResult("Invalid address ID or format"));
      }
    }
    if (password) {
      update.password = await bcrypt.hash(password, 10);
    }

    const user = await userModel
      .findByIdAndUpdate(
        req.user._id,
        { $set: update },
        { new: true, runValidators: true }
      )
      .select("-password");

    if (!user) {
      return res.status(404).json(createErrorResult("User not found"));
    }

    const newToken = jwt.sign({ id: user._id }, process.env.SECRET_KEY, {
      expiresIn: "5d",
    });

    return res.status(200).json(
      createSuccessResult({
        message: "Profile updated successfully",
      })
    );
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json(createErrorResult("Invalid token"));
    }
    if (error.name === "ValidationError") {
      return res.status(400).json(createErrorResult(error.message));
    }
    if (error.code === 11000) {
      return res.status(400).json(createErrorResult("Email already in use"));
    }
    return res.status(500).json(createErrorResult(error.message));
  }
};
