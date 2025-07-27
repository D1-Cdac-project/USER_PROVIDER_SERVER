const bcrypt = require("bcrypt");
const { createSuccessResult, createErrorResult } = require("../config/result");
const generateToken = require("../config/generateToken");
const {
  sendRegistrationEmail,
  sendApprovalEmail,
} = require("../config/mailer");
const adminModel = require("../models/adminModel");
const userModel = require("../models/userModel");
const providerModel = require("../models/providerModel");
const approvalRequestModel = require("../models/approvalRequestModel");
const notificationModel = require("../models/notificationModel");

// Registers a new admin
exports.registerAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await adminModel.create({ email, password });
    return generateToken(res, 201, admin, "admin");
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};

// Logs in an admin with socket notification
exports.loginAdmin = async (req, res, io) => {
  try {
    const { email, password } = req.body;
    const adminExists = await adminModel.findOne({ email });
    if (!adminExists) {
      return res
        .status(404)
        .json(createErrorResult("Invalid email or password"));
    }
    const passwordMatch = await bcrypt.compare(password, adminExists.password);
    if (!passwordMatch) {
      return res
        .status(404)
        .json(createErrorResult("Invalid email or password"));
    }
    io.to(adminExists._id.toString()).emit("adminLoginSuccess", {
      adminId: adminExists._id,
      message: "Admin login successful",
    });
    return generateToken(res, 200, adminExists, "admin");
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};

// Logs out an admin
exports.logoutAdmin = async (req, res) => {
  try {
    res.cookie("adminToken", null, {
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

// Adds a new user with notifications
exports.addUser = async (req, res, io) => {
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
    const notificationPromises = admins.map((admin) =>
      notificationModel.create({
        recipientId: admin._id,
        type: "user_registration",
        message: `New user registered: ${user.fullName} (${user.email})`,
        relatedId: user._id,
        relatedModel: "Users",
      })
    );
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

// Adds a new provider with notifications
exports.addProvider = async (req, res, io) => {
  try {
    const { name, email, password, phoneNumber } = req.body;
    const providerExists = await providerModel.findOne({ email });
    if (providerExists) {
      return res.status(400).json(createErrorResult("Provider already exists"));
    }
    const provider = await providerModel.create({
      name,
      email,
      password,
      phoneNumber,
      authorizationStatus: "approved",
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
      provider: {
        _id: provider._id,
        name: provider.name,
        email: provider.email,
      },
      createdAt: new Date(),
    });
    return generateToken(res, 201, provider, "provider");
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};

// Fetches pending approval requests
exports.getPendingApprovalRequests = async (req, res) => {
  try {
    const pendingRequests = await approvalRequestModel
      .find({ status: "pending" })
      .populate("providerId", "name email phoneNumber");
    return res
      .status(200)
      .json(createSuccessResult({ requests: pendingRequests }));
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};

// Handles provider approval requests
exports.handleApprovalRequest = async (req, res, io) => {
  try {
    const { providerId, status } = req.body;
    const approvalRequest = await approvalRequestModel.findOne({
      providerId,
      status: "pending",
    });
    if (!approvalRequest) {
      return res
        .status(404)
        .json(
          createErrorResult(
            "Pending approval request not found for this provider"
          )
        );
    }
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json(createErrorResult("Invalid status"));
    }
    approvalRequest.status = status;
    await approvalRequest.save();
    const provider = await providerModel.findById(providerId);
    if (!provider) {
      return res.status(404).json(createErrorResult("Provider not found"));
    }
    provider.authorizationStatus = status;
    await provider.save();
    if (status === "approved") {
      await sendApprovalEmail(provider.email, provider.name);
      io.to(provider._id.toString()).emit("approvalStatusUpdate", {
        status: "approved",
        message: "Your account has been approved!",
      });
    } else {
      io.to(providerId.toString()).emit("approvalStatusUpdate", {
        status: "rejected",
        message: "Your account approval request was rejected.",
      });
    }
    return res
      .status(200)
      .json(
        createSuccessResult({ message: `Provider ${status} successfully` })
      );
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};

// Fetches all unread notifications for the authenticated admin
exports.getAdminNotifications = async (req, res) => {
  try {
    const adminId = req.admin._id;
    const notifications = await notificationModel
      .find({ recipientId: adminId, isRead: false })
      .populate("relatedId", "name email fullName")
      .sort({ createdAt: -1 });
    return res.status(200).json(createSuccessResult({ notifications }));
  } catch (error) {
    console.error("Error fetching unread notifications:", error);
    return res.status(500).json(createErrorResult(error.message));
  }
};

// Marks a notification as read
exports.markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.body;
    const notification = await notificationModel.findById(notificationId);
    if (!notification) {
      return res.status(404).json(createErrorResult("Notification not found"));
    }
    if (notification.recipientId.toString() !== req.admin._id.toString()) {
      return res
        .status(403)
        .json(createErrorResult("Unauthorized to modify this notification"));
    }
    notification.isRead = true;
    await notification.save();
    return res
      .status(200)
      .json(createSuccessResult({ message: "Notification marked as read" }));
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};

// Fetches all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await userModel.find({}).select("-password -__v");
    return res.status(200).json(createSuccessResult({ users }));
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};

// Fetches all providers
exports.getAllProviders = async (req, res) => {
  try {
    const providers = await providerModel.find({}).select("-password -__v");
    return res.status(200).json(createSuccessResult({ providers }));
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};

// Searches users by query
exports.searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query)
      return res.status(400).json(createErrorResult("Query is required"));
    const users = await userModel
      .find({
        $or: [
          { fullName: { $regex: query, $options: "i" } },
          { email: { $regex: query, $options: "i" } },
          { phoneNumber: { $regex: query, $options: "i" } },
        ],
      })
      .select("-password -__v");
    return res.status(200).json(createSuccessResult({ users }));
  } catch (error) {
    console.error("Error searching users:", error);
    return res.status(500).json(createErrorResult(error.message));
  }
};

// Searches providers by query
exports.searchProviders = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query)
      return res.status(400).json(createErrorResult("Query is required"));
    const providers = await providerModel
      .find({
        $or: [
          { name: { $regex: query, $options: "i" } },
          { email: { $regex: query, $options: "i" } },
          { phoneNumber: { $regex: query, $options: "i" } },
        ],
      })
      .select("-password -__v");
    return res.status(200).json(createSuccessResult({ providers }));
  } catch (error) {
    console.error("Error searching providers:", error);
    return res.status(500).json(createErrorResult(error.message));
  }
};
