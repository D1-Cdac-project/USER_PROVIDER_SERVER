const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  state: {
    type: String,
    required: true,
    trim: true,
    enum: [
      "Andhra Pradesh",
      "Arunachal Pradesh",
      "Assam",
      "Bihar",
      "Chhattisgarh",
      "Goa",
      "Gujarat",
      "Haryana",
      "Himachal Pradesh",
      "Jharkhand",
      "Karnataka",
      "Kerala",
      "Madhya Pradesh",
      "Maharashtra",
      "Manipur",
      "Meghalaya",
      "Mizoram",
      "Nagaland",
      "Odisha",
      "Punjab",
      "Rajasthan",
      "Sikkim",
      "Tamil Nadu",
      "Telangana",
      "Tripura",
      "Uttar Pradesh",
      "Uttarakhand",
      "West Bengal",
    ],
    city: {
      type: String,
      required: true,
    },
    pinCode: {
      type: Number,
      required: true,
      trim: true,
      min: 6,
    },
    fullAddress: {
      type: String,
      required: true,
      trim: true,
    },
  },
});

module.exports = mongoose.model("address", addressSchema);
