const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    mandapId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mandaps",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
    },
    orderDates: [
      {
        type: Date,
        required: true,
      },
    ],
    photographer: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Photographers",
      },
    ],
    caterer: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Caterers",
      },
    ],
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rooms",
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    amountPaid: {
      type: Number,
    },
    paymentStatus: {
      type: String,
      enum: ["Partial", "Completed", "Cancelled"],
    },
    isReviewAdded:{
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Bookings", bookingSchema);
