const bcrypt = require("bcrypt");
const {
  createResult,
  createSuccessResult,
  createErrorResult,
} = require("../config/result");
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

exports.registerAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await adminModel.create({ email, password });
    return generateToken(res, 201, admin, "admin");
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};

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
      isAuthorized: true,
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

exports.getPendingApprovalRequests = async (req, res) => {
  try {
    const pendingRequests = await approvalRequestModel
      .find({ status: "pending" })
      .populate({
        path: "providerId",
        select: "name email phoneNumber",
      });

    return res
      .status(200)
      .json(createSuccessResult({ requests: pendingRequests }));
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};

exports.handleApprovalRequest = async (req, res, io) => {
  try {
    const { providerId, status } = req.body;
    // Find the approval request by providerId and ensure it's pending
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

    if (status === "approved") {
      const provider = await providerModel.findById(providerId);
      if (!provider) {
        return res.status(404).json(createErrorResult("Provider not found"));
      }
      provider.isAuthorized = true;
      await provider.save();

      await sendApprovalEmail(provider.email, provider.name);

      io.to(provider._id.toString()).emit("approvalStatusUpdate", {
        status: "approved",
        message: "Your account has been approved by the BookMyMandap Team!",
      });
    } else {
      io.to(providerId.toString()).emit("approvalStatusUpdate", {
        status: "rejected",
        message:
          "Your account approval request was rejected by the BookMyMandap Team.",
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

    return res.status(200).json(createSuccessResult({ notifications }));
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};

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

exports.getAllUsers = async (req, res) => {
  try {
    const users = await userModel.find({}).select("-password -__v");
    return res.status(200).json(createSuccessResult({ users }));
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};

exports.getAllProviders = async (req, res) => {
  try {
    const providers = await providerModel.find({}).select("-password -__v");
    return res.status(200).json(createSuccessResult({ providers }));
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};

exports.searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    validateInput({ query }, ["query"], "searchUsers", req);

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
    logError(error, "searchUsers", req);
    return res.status(500).json(createErrorResult(error.message));
  }
};

exports.searchProviders = async (req, res) => {
  try {
    const { query } = req.query;
    validateInput({ query }, ["query"], "searchProviders", req);

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
    logError(error, "searchProviders", req);
    return res.status(500).json(createErrorResult(error.message));
  }
};
