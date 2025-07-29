const mongoose = require("mongoose");

const mandapSchema = new mongoose.Schema({
  mandapName: {
    type: String,
    required: true,
    trim: true,
  },
  mandapDesc: {
    type: String,
    trim: true,
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Provider",
    required: true,
  },
  availableDates: [
    {
      type: Date,
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
    },
  ],
  address: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Address",
    required: true,
  },
  penaltyChargesPerHour: {
    type: Number,
    default: 0,
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
    required: true,
  },
  venuePricing: {
    type: Number,
    required: true,
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
    },
  ],
  isExternalCateringAllowed: {
    type: Boolean,
    default: false,
  },
  advancePayment: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

module.exports = mongoose.model("Mandaps", mandapSchema);
