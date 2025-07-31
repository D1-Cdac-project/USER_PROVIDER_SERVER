const bcrypt = require("bcrypt");
const generateToken = require("../config/generateToken");
const { createSuccessResult, createErrorResult } = require("../config/result");
const { sendRegistrationEmail } = require("../config/mailer");

const addressModel = require("../models/addressModel");
const approvalRequestModel = require("../models/approvalRequestModel");
const adminModel = require("../models/adminModel");
const notificationModel = require("../models/notificationModel");
const providerModel = require("../models/providerModel");
const userModel = require("../models/userModel");

// Registers a new provider with approval request
exports.registerProvider = async (req, res, io) => {
  try {
    const { name, email, password, phoneNumber } = req.body;
    const providerExists = await providerModel.findOne({ email });
    const userExists = await userModel.findOne({ email });
    if (userExists) {
      return res
        .status(400)
        .json(createErrorResult("Email is already registered as a user"));
    }
    if (providerExists) {
      return res.status(400).json(createErrorResult("Provider already exists"));
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
    await sendRegistrationEmail(provider.email, provider.name, "provider");
    const admins = await adminModel.find({});
    const notificationPromises = admins.map((admin) =>
      notificationModel.create({
        recipientId: admin._id,
        type: "provider_registration",
        message: `New provider registered: ${provider.name} (${provider.email})`,
        relatedId: provider._id,
        relatedModel: "Providers",
      })
    );
    await Promise.all(notificationPromises);
    io.emit("newProviderRegistration", {
      requestId: approvalRequest._id,
      provider: {
        _id: provider._id,
        name: provider.name,
        email: provider.email,
      },
      createdAt: approvalRequest.createdAt,
    });
    return generateToken(res, 201, provider, "provider");
  } catch (error) {
    console.error("Error registering provider:", error);
    return res.status(500).json(createErrorResult(error.message));
  }
};

// Logs in a provider with authorization check
exports.loginProvider = async (req, res, io) => {
  try {
    const { email, password } = req.body;
    const providerExists = await providerModel.findOne({ email });
    if (!providerExists) {
      return res
        .status(404)
        .json(createErrorResult("Invalid email or password"));
    }
    const passwordMatch = await bcrypt.compare(
      password,
      providerExists.password
    );
    if (!passwordMatch) {
      return res
        .status(404)
        .json(createErrorResult("Invalid email or password"));
    }
    if (providerExists.authorizationStatus === "pending") {
      return res
        .status(403)
        .json(createErrorResult("You are not authorized yet"));
    }
    if (providerExists.authorizationStatus === "rejected") {
      return res
        .status(403)
        .json(
          createErrorResult("Admin rejected your request, you can't login")
        );
    }
    io.to(providerExists._id.toString()).emit("loginSuccess", {
      providerId: providerExists._id,
      message: "Login successful",
    });
    return generateToken(res, 200, providerExists, "provider");
  } catch (error) {
    console.error("Error logging in provider:", error);
    return res.status(500).json(createErrorResult(error.message));
  }
};

// Logs out a provider
exports.logoutProvider = async (req, res) => {
  try {
    res.cookie("providerToken", null, {
      expires: new Date(Date.now()),
      httpOnly: true,
    });
    return res
      .status(200)
      .json(createSuccessResult({ message: "Logout successful" }));
  } catch (error) {
    console.error("Error logging out provider:", error);
    return res.status(500).json(createErrorResult(error.message));
  }
};

// Updates provider profile with image handling
exports.updateProvider = async (req, res) => {
  try {
    if (!req.provider) {
      return res.status(400).json(createErrorResult("Invalid Request"));
    }
    const { name, phoneNumber, address, password } = req.body;
    const provider = await providerModel.findById(req.provider._id);
    if (!provider) {
      return res.status(404).json(createErrorResult("Provider not found"));
    }
    let profileImage = provider.profileImage;
    if (req.file) {
      if (profileImage) {
        const publicId = profileImage.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`BookMyMandap/${publicId}`);
      }
      profileImage = req.file.path;
    }
    let addressId = provider.address;
    if (address) {
      const parsedAddress = JSON.parse(address);
      if (addressId) {
        await addressModel.findByIdAndUpdate(addressId, parsedAddress, {
          new: true,
          runValidators: true,
        });
      } else {
        const newAddress = await addressModel.create(parsedAddress);
        addressId = newAddress._id;
      }
    }
    const updateData = {
      name: name || provider.name,
      phoneNumber: phoneNumber || provider.phoneNumber,
      address: addressId,
      profileImage,
    };
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    const updatedProvider = await providerModel
      .findByIdAndUpdate(req.provider._id, updateData, {
        new: true,
        runValidators: true,
      })
      .select("-password");
    return res.status(200).json(
      createSuccessResult({
        message: "Provider updated successfully",
        provider: updatedProvider,
      })
    );
  } catch (error) {
    console.error("Error updating provider:", error);
    return res.status(500).json(createErrorResult(error.message));
  }
};

// Fetches provider profile
exports.getProviderProfile = async (req, res) => {
  try {
    if (!req.provider) {
      return res.status(400).json(createErrorResult("Invalid Request"));
    }
    const provider = await providerModel
      .findById(req.provider._id)
      .populate("address")
      .select("-password");
    if (!provider) {
      return res.status(404).json(createErrorResult("Provider not found"));
    }
    return res.status(200).json(createSuccessResult({ provider }));
  } catch (error) {
    console.error("Error fetching provider profile:", error);
    return res.status(500).json(createErrorResult(error.message));
  }
};

// Deletes provider account with image cleanup
exports.deleteProvider = async (req, res) => {
  try {
    if (!req.provider) {
      return res.status(400).json(createErrorResult("Invalid Request"));
    }
    const provider = await providerModel.findById(req.provider._id);
    if (!provider) {
      return res.status(404).json(createErrorResult("Provider not found"));
    }
    if (provider.profileImage) {
      const publicId = provider.profileImage.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(`BookMyMandap/${publicId}`);
    }
    if (provider.address) {
      await addressModel.findByIdAndDelete(provider.address);
    }
    await providerModel.findByIdAndDelete(req.provider._id);
    res.cookie("providerToken", null, {
      expires: new Date(Date.now()),
      httpOnly: true,
    });
    return res.status(200).json(
      createSuccessResult({
        message: "Provider account deleted successfully",
      })
    );
  } catch (error) {
    console.error("Error deleting provider:", error);
    return res.status(500).json(createErrorResult(error.message));
  }
};

// In index.js
exports.getProviderNotifications = async (req, res) => {
  try {
    if (!req.provider) {
      return res
        .status(401)
        .json(createErrorResult("Provider not authenticated"));
    }
    const notifications = await notificationModel
      .find({ recipientId: req.provider._id, recipientModel: "Providers" })
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json(createSuccessResult({ notifications }));
  } catch (error) {
    console.error("Error fetching provider notifications:", error);
    return res.status(500).json(createErrorResult(error.message));
  }
};
