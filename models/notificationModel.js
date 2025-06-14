const mongoose = require("mongoose");

// Notification schema definition
const notificationSchema = new mongoose.Schema({
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    required: true,
  },
  type: {
    type: String,
    enum: ["provider_registration", "user_registration", "approval_request"],
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "relatedModel",
  },
  relatedModel: {
    type: String,
    enum: ["Providers", "Users", "ApprovalRequests", "Bookings", "Mandaps"],
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Notifications", notificationSchema);
