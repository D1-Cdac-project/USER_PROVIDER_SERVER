const mongoose = require("mongoose");

// Notification schema definition
const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "provider_registration",
        "user_registration",
        "approval_request",
        "new_review",
        "new_booking",
        "deleted_booking",
        "updated_booking",
      ],
      required: true,
    },
    title: {
      type: String,
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
      enum: [
        "Providers",
        "Users",
        "ApprovalRequests",
        "Bookings",
        "Mandaps",
        "Reviews",
      ],
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notifications", notificationSchema);
