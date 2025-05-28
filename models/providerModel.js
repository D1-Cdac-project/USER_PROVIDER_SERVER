const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const providerSchema = new mongoose.Schema({
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
    type: String,
    required: true,
  },
  phoneNumber: {
    type: Number,
    required: true,
    min: 10,
  },
  rating: {
    type: Number,
    default: "0",
  },
  isAuthorized: {
    type: boolean,
    default: false,
  },
  providerLogo: {
    type: String,
  },
});

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

module.exports = mongoose.model("providers", providerSchema);
