const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Config
const generateToken = require("../config/generateToken");
const { sendRegistrationEmail } = require("../config/mailer");

// Models
const addressModel = require("../models/addressModel");
const adminModel = require("../models/adminModel");
const approvalRequestModel = require("../models/approvalRequestModel");
const mandapModel = require("../models/mandapModel");
const notificationModel = require("../models/notificationModel");
const providerModel = require("../models/providerModel");
const userModel = require("../models/userModel");
const bookingModel = require("../models/bookingModel")

//related to provider  -- akshay
exports.registerProvider = async (req, res, io) => {
  try {
    const { name, email, password, phoneNumber } = req.body;
    const providerExists = await providerModel.findOne({ email });

    // Check if email exists in userModel
    const userExists = await userModel.findOne({ email });
    if (userExists) {
      return res
        .status(400)
        .json({ message: "Email is already registered as a user" });
    }

    if (providerExists) {
      return res.status(400).json({ message: "provider already exists!" });
    }

    const provider = await providerModel.create({
      name,
      email,
      password,
      phoneNumber,
    });

    const approvalRequest = await approvalRequestModel.create({
      providerId: provider._id,
      name: provider.name,
      email: provider.email,
      phoneNumber: provider.phoneNumber,
    });

    // Send registration confirmation email
    await sendRegistrationEmail(provider.email, provider.name, "provider");

    // Emit Socket.IO event to notify admins
    const admins = await adminModel.find({});
    const notificationPromises = admins.map(async (admin) => {
      return notificationModel.create({
        recipientId: admin._id,
        type: "provider_registration",
        message: `New provider registered: ${provider.name} (${provider.email})`,
        relatedId: provider._id,
        relatedModel: "Providers",
      });
    });
    await Promise.all(notificationPromises);

    // Emit Socket.IO event to notify admins
    io.emit("newProviderRegistration", {
      requestId: approvalRequest._id,
      provider: {
        _id: provider._id,
        name: provider.name,
        email: provider.email,
      },
      createdAt: approvalRequest.createdAt,
    });

    generateToken(res, 201, provider, "provider");
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.loginProvider = async (req, res, io) => {
  try {
    const { email, password } = req.body;
    const providerExists = await providerModel.findOne({ email });
    if (!providerExists) {
      return res.status(404).json({ message: "Invalid email or password !" });
    }
    const passwordMatch = await bcrypt.compare(
      password,
      providerExists.password
    );
    if (!passwordMatch) {
      return res.status(404).json({ message: "invalid email or password" });
    }
    if (!providerExists.isAuthorized) {
      return res.status(403).json({ message: "You are not authorized yet!" });
    }
    generateToken(res, 200, providerExists, "provider");
    // Emit Socket.IO login success event
    io.to(providerExists._id.toString()).emit("loginSuccess", {
      providerId: providerExists._id,
      message: "Login successful",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.logoutProvider = (req, res) => {
  try {
    res.cookie("providerToken", null, {
      expires: new Date(Date.now()),
      httpOnly: true,
    });
    return res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.getProvider = async (req, res) => {
  try {
    const provider = req.provider;
    if (!provider) return res.status(400).json({ message: "Invalid request" });

    const providerExists = await providerModel.findOne({ email });
    if (!providerExists) {
      return res.status(404).json({ message: "Invalid email or password !" });
    }

    const populatedProvider = await providerModel
      .findById(provider._id)
      .populate("address")
      .select("-password");

    if (!populatedProvider)
      return res.status(404).json({ message: "Provider not found" });

    if (!providerExists.isAuthorized) {
      return res.status(403).json({ message: "You are not authorized yet!" });
    }

    return res.status(200).json({ populatedProvider });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.updateProvider = async (req, res) => {
  try {
    const provider = req.provider; // injected by auth middleware
    if (!provider) {
      return res.status(404).json({ message: "Provider not found" });
    }

    const { name, email, password, phoneNumber, address } = req.body;

    // Update basic provider fields
    if (name) provider.name = name;
    if (email) provider.email = email;
    if (phoneNumber) {
      if (!/^\d{10}$/.test(phoneNumber)) {
        return res.status(400).json({ message: "Invalid phone number" });
      }
      provider.phoneNumber = phoneNumber;
    }
    if (password) {
      provider.password = await bcrypt.hash(password, 10);
    }

    // Handle address
    if (address) {
      let addressDoc;

      // If provider has an existing address
      if (provider.address) {
        addressDoc = await addressModel.findById(provider.address);
        if (!addressDoc) {
          // Address ID is invalid, create new
          addressDoc = await addressModel.create({
            state: address.state || "",
            city: address.city || "",
            pinCode: address.pinCode || "",
            fullAddress: address.fullAddress || "",
          });
          provider.address = addressDoc._id;
        }
      } else {
        // No address reference, create new
        addressDoc = await addressModel.create({
          state: address.state || "",
          city: address.city || "",
          pinCode: address.pinCode || "",
          fullAddress: address.fullAddress || "",
        });
        provider.address = addressDoc._id;
      }

      // Update existing fields if present
      if (address.state) addressDoc.state = address.state;
      if (address.city) addressDoc.city = address.city;
      if (address.pinCode) addressDoc.pinCode = address.pinCode;
      if (address.fullAddress) addressDoc.fullAddress = address.fullAddress;

      await addressDoc.save();
    }

    await provider.save();

    // Fetch updated provider with populated address
    const updatedProvider = await providerModel
      .findById(provider._id)
      .populate("address")
      .select("-password");

    // Generate new token
    const newToken = jwt.sign(
      { id: updatedProvider._id },
      process.env.SECRET_KEY,
      { expiresIn: "5d" }
    );

    return res.status(200).json({
      message: "Provider profile updated successfully",
      provider: updatedProvider,
      token: newToken,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    if (error.code === 11000) {
      return res.status(400).json({ message: "Email already in use" });
    }
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

//related to booking
exports.getAllBookings = async (req, res) => {
  try {
    const provider = req.provider;

    if (!provider || !provider._id) {
      return res.status(401).json({ message: "Unauthorized access" });
    }

    // Get all mandaps owned by the provider
    const mandaps = await mandapModel.find({ providerId: provider._id });

    const mandapIds = mandaps.map((mandap) => mandap._id);

    if (mandapIds.length === 0) {
      return res.status(200).json({ bookings: [], message: "No mandaps found" });
    }

    // Find all bookings related to those mandaps
    const bookings = await bookingModel
      .find({ mandapId: { $in: mandapIds } })
      .populate("userId", "name email")
      .populate("mandapId", "name location")
      .populate("roomId", "roomNumber type price") 
      .populate("photographerId", "name price")    
      .populate("catererId", "name price")      
      .sort({ createdAt: -1 });

    return res.status(200).json({ bookings });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

//Related to mandap   --tanay
exports.createMandap = async (req, res) => {
  if (!req.provider) {
    return res.status(400).json({ message: "Invalid Request" });
  }
  try {
    const {
      mandapName,
      availableDates,
      venueType,
      address,
      penaltyChargesPerHour,
      cancellationPolicy,
      venueImages,
      guestCapacity,
      venuePricing,
      securityDeposit,
      securityDepositType,
      amenities,
      outdoorFacilities,
      paymentOptions,
      isExternalCateringAllowed,
    } = req.body;

    const mandap = await mandapModel.create({
      mandapName,
      providerId: req.provider._id,
      availableDates,
      venueType,
      address,
      penaltyChargesPerHour,
      cancellationPolicy,
      venueImages,
      guestCapacity,
      venuePricing,
      securityDeposit,
      securityDepositType,
      amenities,
      outdoorFacilities,
      paymentOptions,
      isExternalCateringAllowed,
    });
    res.status(201).json({
      message: "Mandap created successfully",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Get all mandaps by provider ID
exports.getAllMandapByProviderID = async (req, res) => {
  if (!req.provider) {
    return res.status(400).json({ message: "Invalid Request" });
  }
  try {
    const result = await mandapModel.find({
      providerId: req.provider._id,
      isActive: true,
    });
    if (result) {
      res.status(200).json({
        message: "Mandap fetched successfully",
        mandap: result,
      });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Update a mandap by ID
exports.updateMandap = async (req, res) => {
  if (!req.provider) {
    return res.status(400).json({ message: "Invalid Request" });
  }
  try {
    const { mandapId } = req.params;
    const mandap = await mandapModel.findById(mandapId);
    if (!mandap) {
      console.log("Mandap not found:", mandapId);
      return res.status(404).json({ message: "Mandap not found" });
    }
    // console.log(req.params)
    const {
      mandapName,
      availableDates,
      venueType,
      address,
      penaltyChargesPerHour,
      cancellationPolicy,
      venueImages,
      guestCapacity,
      venuePricing,
      securityDeposit,
      securityDepositType,
      amenities,
      outdoorFacilities,
      paymentOptions,
      isExternalCateringAllowed,
    } = req.body;

    const updatemandap = await mandapModel.findByIdAndUpdate(
      mandapId,
      {
        mandapName,
        availableDates,
        venueType,
        address,
        penaltyChargesPerHour,
        cancellationPolicy,
        venueImages,
        guestCapacity,
        venuePricing,
        securityDeposit,
        securityDepositType,
        amenities,
        outdoorFacilities,
        paymentOptions,
        isExternalCateringAllowed,
      },
      { new: true }
    );

    res.status(200).json({
      message: "Mandap updated successfully",
      updatemandap,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
exports.deleteMandap = async (req, res) => {
  if (!req.provider) {
    return res.status(400).json({ message: "Invalid Request" });
  }
  try {
    const { mandapId } = req.params;
    const mandap = await mandapModel.findById({
      _id: mandapId,
      providerId: req.provider._id,
    });
    if (!mandap) {
      return res.status(404).json({ message: "Mandap not found" });
    }
    const deleteMandap = await mandapModel.updateOne(
      { _id: mandapId },
      { $set: { isActive: false } }
    );
    if (deleteMandap.modifiedCount > 0) {
      res.status(200).json({
        message: "Mandap deleted successfully",
        mandap: mandap,
      });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

//room related   --- vaishnavi
exports.addRoom = async (req, res) => {};
exports.updateRoom = async (req, res) => {};
exports.deleteRoom = async (req, res) => {};

//Photographer related   -- tanay
exports.addPhotographer = async (req, res) => {};
exports.updatePhotographer = async (req, res) => {};
exports.deletePhotographer = async (req, res) => {};

//caterer related   --tanay
exports.addCaterer = async (req, res) => {};
exports.updateCaterer = async (req, res) => {};
exports.deleteCaterer = async (req, res) => {};
