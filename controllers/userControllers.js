const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

//config
const generateToken = require("../config/generateToken");
const { sendRegistrationEmail } = require("../config/mailer");

const userModel = require("../models/userModel");
const bookingModel = require("../models/bookingModel")
const adminModel = require("../models/adminModel");
const notificationModel = require("../models/notificationModel");

// Register a new user
exports.registerUser = async (req, res, io) => {
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

    // Send registration confirmation email
    await sendRegistrationEmail(user.email, user.fullName, "user");

    // Create notifications for all admins
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

    // Emit Socket.IO event to notify admin
    io.emit("newUserRegistration", {
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
      },
      createdAt: new Date(),
    });

    generateToken(res, 201, user, "user");
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Login an existing user
exports.loginUser = async (req, res, io) => {
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

    generateToken(res, 200, userExist, "user");

    // Emit Socket.IO login success event
    io.to(userExist._id.toString()).emit("loginSuccess", {
      userId: userExist._id,
      message: "Login successful",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Logout the user
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

//getting user details
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

// updating the user profile
exports.updateProfile = async (req, res) => {
  try {
    const { fullName, email, phoneNumber, password, address } = req.body;
    const update = {};
    if (fullName) update.fullName = fullName;
    if (email) update.email = email;
    if (phoneNumber) update.phoneNumber = phoneNumber;
    if (address) {
      if (!mongoose.isValidObjectId(address)) {
        return res.status(400).json({ message: "Invalid address ID" });
      }
      update.address = address;
    }
    if (password) {
      update.password = await bcrypt.hash(password, 10); // Manually hash password
    }

    // Update user
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: update },
      { new: true, runValidators: true }
    ).select("-password"); // Exclude password from response

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate new JWT
    const newToken = jwt.sign({ id: user._id }, process.env.SECRET_KEY, {
      expiresIn: "5d",
    });

    res.status(200).json({
      message: "Profile updated successfully",
      user,
      token: newToken,
    });
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token" });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    if (error.code === 11000) {
      return res.status(400).json({ message: "Email already in use" });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//booking related --akshay
exports.addBooking = async (req, res) => {
  try{
    const{
      mandapId, 
      availableDates, 
      photographer, 
      caterer, 
      room
    } = req.body;

    const userId = req.user.id;

    const newBooking = new bookingModel({
      mandapId, 
      userId,
      availableDates, 
      photographer, 
      caterer,
      room
    });

    await newBooking.save();

    res.status(201).json({message : "Booking added successfully.", booking : newBooking});
  }
  catch(error){
    res.status(500).json({ message : "Server error.", error : error.message});
  }
};

exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await bookingModel
      .find()
      .populate("mandapId")
      .populate("userId")
      .populate("photographer")
      .populate("caterer");

    res.status(200).json({ bookings });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.getBookingById = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await bookingModel
      .findById(id)
      .populate("mandapId")
      .populate("userId")
      .populate("photographer")
      .populate("caterer");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.status(200).json({ booking });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await bookingModel.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.status(200).json({ message: "Booking deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.updateBooking = async (req, res) => {
  try {
    const { id } = req.params;        
    const updateData = req.body;      

    const updatedBooking = await bookingModel.findByIdAndUpdate(id, updateData, {
      new: true,                    
      runValidators: true,           
    });

    if (!updatedBooking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.status(200).json({
      message: "Booking updated successfully",
      booking: updatedBooking,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


//mandap related  --vaishnavi
exports.getAllFavoriteMandaps = async (req, res) => {};
exports.addFavoriteMandap = async (req, res) => {
  try {
    if (!req.user) return res.status(400).json({ message: "Invalid Request" });
    const { mandapId } = req.body;
    const user = await userModel.findById(req.user._id);

    if (user.favoriteMandaps && user.favoriteMandaps.includes(mandapId)) {
      return res.status(400).json({
        success: false,
        message: "Mandap is already in favorites",
      });
    }

    // Add mandapId to user's favorites array using update method
    await userModel.findByIdAndUpdate(
      user._id,
      { $push: { favoriteMandaps: mandapId } },
      { new: true, runValidators: true }
    );

    // Check if the user is authenticated
    return res.status(200).json({
      success: true,
      message: "Favorite mandap added successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

//caterer related  --tanay
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
