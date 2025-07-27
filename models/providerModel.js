const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const providerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
    },
    phoneNumber: {
      type: Number,
      required: true,
      match: [/^\d{10}$/, "Please enter a valid 10-digit phone number"],
      min: 10,
    },
    authorizationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    providerLogo: {
      type: String,
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

providerSchema.pre("save", async function (next) {
  const provider = this;
  if (!provider.isModified("password")) {
    next();
  }
  provider.password = await bcrypt.hash(provider.password, 10);
});

providerSchema.methods.generateJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.SECRET_KEY, {
    expiresIn: "5d",
  });
};

module.exports = mongoose.model("Providers", providerSchema);
