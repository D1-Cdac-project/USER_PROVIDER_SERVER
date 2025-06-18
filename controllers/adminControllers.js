const bcrypt = require("bcrypt");

// Config
const generateToken = require("../config/generateToken");
const { sendApprovalEmail } = require("../config/mailer");

// Models
const adminModel = require("../models/adminModel");
const userModel = require("../models/userModel");
const providerModel = require("../models/providerModel");
const approvalRequestModel = require("../models/approvalRequestModel");
const notificationModel = require("../models/notificationModel");

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
exports.loginAdmin = async (req, res, io) => {
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

    // Emit Socket.IO login success event
    io.to(adminExists._id.toString()).emit("adminLoginSuccess", {
      adminId: adminExists._id,
      message: "Admin login successful",
    });
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

    // Emit Socket.IO event to notify admins
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

    // Send registration confirmation email
    await sendRegistrationEmail(provider.email, provider.name, "provider");

    // Create notifications for all admins
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
      provider: {
        _id: provider._id,
        name: provider.name,
        email: provider.email,
      },
      createdAt: new Date(),
    });

    generateToken(res, 201, provider, "provider");
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all pending approval requests
exports.getPendingApprovalRequests = async (req, res) => {
  try {
    // Fetch pending approval requests with provider details
    const pendingRequests = await approvalRequestModel
      .find({ status: "pending" })
      .populate({
        path: "providerId",
        select: "name email phoneNumber",
      });

    return res.status(200).json({ requests: pendingRequests });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Handle provider approval request
exports.handleApprovalRequest = async (req, res, io) => {
  try {
    const { requestId, status } = req.body;

    const approvalRequest = await approvalRequestModel.findById(requestId);
    if (!approvalRequest) {
      return res.status(404).json({ message: "Approval request not found" });
    }

    if (approvalRequest.status !== "pending") {
      return res.status(400).json({ message: "Request already processed" });
    }

    // Validate status
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    approvalRequest.status = status;
    await approvalRequest.save();

    if (status === "approved") {
      const provider = await providerModel.findById(approvalRequest.providerId);
      if (!provider) {
        return res.status(404).json({ message: "Provider not found" });
      }
      provider.isAuthorized = true;
      await provider.save();

      await sendApprovalEmail(provider.email, provider.name);

      if (!io || typeof io.emit !== "function") {
        console.error("Socket.IO instance is invalid in handleApprovalRequest");
      } else {
        io.to(provider._id.toString()).emit("approvalStatusUpdate", {
          status: "approved",
          message: "Your account has been approved by the BookMyMandap Team!",
        });
      }
    } else {
      if (!io || typeof io.emit !== "function") {
        console.error("Socket.IO instance is invalid in handleApprovalRequest");
      } else {
        io.to(approvalRequest.providerId.toString()).emit(
          "approvalStatusUpdate",
          {
            status: "rejected",
            message:
              "Your account approval request was rejected by the BookMyMandap Team.",
          }
        );
      }
    }

    return res.status(200).json({ message: `Provider ${status} successfully` });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Get all notifications for an admin
exports.getAdminNotifications = async (req, res) => {
  try {
    const adminId = req.admin._id;
    const notifications = await notificationModel
      .find({ recipientId: adminId })
      .populate({
        path: "relatedId",
        select: "name email fullName",
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({ notifications });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Mark a notification as read
exports.markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.body;
    const notification = await notificationModel.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    if (notification.recipientId.toString() !== req.admin._id.toString()) {
      return res
        .status(403)
        .json({ message: "Unauthorized to modify this notification" });
    }

    notification.isRead = true;
    await notification.save();

    return res.status(200).json({ message: "Notification marked as read" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.getAllUsers = (req, res) => {
  userModel
    .find({})
    .select("-password -__v")
    .then((users) => {
      res.status(200).json({ users });
    })
    .catch((error) => {
      res.status(500).json({ message: error.message });
    });
};

exports.getAllProviders = (req, res) => {
  providerModel
    .find({})
    .select("-password -__v")
    .then((providers) => {
      console.log("Fetched providers:", providers);
      res.status(200).json({ providers });
    })
    .catch((error) => {
      res.status(500).json({ message: error.message });
    });
};
