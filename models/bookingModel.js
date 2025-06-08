const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    mandapId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "mandaps",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },
    availableDates: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "mandaps",
      },
    ],
    photographer: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "photographers",
      },
    ],
    caterer: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "caterers",
      },
    ],
    room: {
      acRoomCount: {
        type: Number,
        min: 0,
        default: 0,
      },
      nonAcRoomCount: {
        type: Number,
        min: 0,
        default: 0,
      },
    },
    isActive: {
      type: boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("bookings", bookingSchema);
