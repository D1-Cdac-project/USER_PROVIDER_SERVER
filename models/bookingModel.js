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
    availableDates: [
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
