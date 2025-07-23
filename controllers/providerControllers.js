const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { createSuccessResult, createErrorResult } = require("../config/result");
const generateToken = require("../config/generateToken");
const { sendRegistrationEmail } = require("../config/mailer");
const providerModel = require("../models/providerModel");
const approvalRequestModel = require("../models/approvalRequestModel");
const adminModel = require("../models/adminModel");
const notificationModel = require("../models/notificationModel");
const addressModel = require("../models/addressModel");
const mandapModel = require("../models/mandapModel");

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
    return res.status(500).json(createErrorResult(error.message));
  }
};

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
    if (!providerExists.isAuthorized) {
      return res
        .status(403)
        .json(createErrorResult("You are not authorized yet"));
    }

    io.to(providerExists._id.toString()).emit("loginSuccess", {
      providerId: providerExists._id,
      message: "Login successful",
    });

    return generateToken(res, 200, providerExists, "provider");
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};

exports.logoutProvider = (req, res) => {
  try {
    res.cookie("providerToken", null, {
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

exports.getProvider = async (req, res) => {
  try {
    const provider = req.provider;
    if (!provider)
      return res.status(400).json(createErrorResult("Invalid request"));

    const populatedProvider = await providerModel
      .findById(provider._id)
      .populate("address")
      .select("-password");

    if (!populatedProvider)
      return res.status(404).json(createErrorResult("Provider not found"));
    if (!populatedProvider.isAuthorized) {
      return res
        .status(403)
        .json(createErrorResult("You are not authorized yet"));
    }

    return res
      .status(200)
      .json(createSuccessResult({ provider: populatedProvider }));
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};

exports.updateProvider = async (req, res) => {
  try {
    const provider = req.provider;
    if (!provider) {
      return res.status(404).json(createErrorResult("Provider not found"));
    }

    const { name, email, password, phoneNumber, address } = req.body;

    if (req.file) {
      if (provider.providerLogo) {
        const publicId = provider.providerLogo.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`BookMyMandap/${publicId}`);
      }
      provider.providerLogo = req.file.path;
    }

    if (name) provider.name = name;
    if (email) provider.email = email;
    if (phoneNumber) {
      if (!/^\d{10}$/.test(phoneNumber)) {
        return res.status(400).json(createErrorResult("Invalid phone number"));
      }
      provider.phoneNumber = phoneNumber;
    }
    if (password) {
      provider.password = await bcrypt.hash(password, 10);
    }

    if (address) {
      let addressDoc;
      if (provider.address) {
        addressDoc = await addressModel.findById(provider.address);
        if (!addressDoc) {
          addressDoc = await addressModel.create({
            state: address.state || "",
            city: address.city || "",
            pinCode: address.pinCode || "",
            fullAddress: address.fullAddress || "",
          });
          provider.address = addressDoc._id;
        }
      } else {
        addressDoc = await addressModel.create({
          state: address.state || "",
          city: address.city || "",
          pinCode: address.pinCode || "",
          fullAddress: address.fullAddress || "",
        });
        provider.address = addressDoc._id;
      }

      if (address.state) addressDoc.state = address.state;
      if (address.city) addressDoc.city = address.city;
      if (address.pinCode) addressDoc.pinCode = address.pinCode;
      if (address.fullAddress) addressDoc.fullAddress = address.fullAddress;

      await addressDoc.save();
    }

    await provider.save();

    const updatedProvider = await providerModel
      .findById(provider._id)
      .populate("address")
      .select("-password");

    const newToken = jwt.sign(
      { id: updatedProvider._id },
      process.env.SECRET_KEY,
      {
        expiresIn: "5d",
      }
    );

    return res.status(200).json(
      createSuccessResult({
        message: "Provider profile updated successfully",
        provider: updatedProvider,
        token: newToken,
      })
    );
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json(createErrorResult(error.message));
    }
    if (error.code === 11000) {
      return res.status(400).json(createErrorResult("Email already in use"));
    }
    return res.status(500).json(createErrorResult(error.message));
  }
};

exports.getAllBookings = async (req, res) => {
  if (!req.provider) {
    return res.status(400).json(createErrorResult("Invalid Request"));
  }
  try {
    const bookings = await bookingModel
      .find({
        mandapId: {
          $in: await mandapModel
            .find({ providerId: req.provider._id })
            .distinct("_id"),
        },
        isActive: true,
      })
      .populate("mandapId userId photographer caterer");
    return res.status(200).json(createSuccessResult({ bookings }));
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};
