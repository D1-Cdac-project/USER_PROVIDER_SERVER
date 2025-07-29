//importing mongoose dependency
const mongoose = require("mongoose");

//creating schema
const mandapSchema = new mongoose.Schema(
  {
    mandapName: {
      type: String,
      required: true,
      trim: true,
    },
    mandapDesc: {
      type: String,
      trim: true,
      required: true,
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Providers",
      required: true,
    },
    availableDates: [
      {
        type: Date,
        required: true,
      },
    ],
    venueType: [
      {
        type: String,
        enum: [
          "Banquet Hall",
          "Community Hall",
          "Lawn",
          "Resort",
          "Farmhouse",
          "Hotel",
          "Rooftop",
          "Convention Centre",
        ],
        required: true,
      },
    ],
    address: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
    },
    penaltyChargesPerHour: {
      type: Number,
      required: true,
    },
    cancellationPolicy: {
      type: String,
      enum: ["No Refund", "Partial Refund", "Full Refund"],
    },
    venueImages: [
      {
        type: String,
      },
    ],
    guestCapacity: {
      type: Number,
      default: 0,
    },
    venuePricing: {
      type: Number,
      default: 0,
    },
    securityDeposit: {
      type: Number,
      default: 0,
    },
    securityDepositType: {
      type: String,
      enum: ["Refundable", "Non-Refundable"],
    },
    amenities: [
      {
        type: String,
        enum: [
          "WiFi",
          "Parking",
          "Air Conditioning",
          "Catering Service",
          "Decoration Service",
          "Sound System",
          "Lighting System",
          "Projector",
          "Stage",
          "Dance Floor",
          "Generator",
          "Security Service",
          "Elevator",
        ],
      },
    ],
    outdoorFacilities: [
      {
        type: String,
        enum: [
          "Garden",
          "Pool",
          "Beach Access",
          "Smoking Zones",
          "Outdoor Lighting",
          "Parking Area",
          "Kids Play Area",
          "Outdoor Bar",
          "Barbeque Area",
          "Terrace",
        ],
      },
    ],
    paymentOptions: [
      {
        type: String,
        enum: ["Cash", "Credit Card", "Debit Card", "UPI", "Net Banking"],
        required: true,
      },
    ],
    advancePayment: {
      type: Number,
      default: 0,
    },
    isExternalCateringAllowed: {
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

module.exports = mongoose.model("Mandaps", mandapSchema);
