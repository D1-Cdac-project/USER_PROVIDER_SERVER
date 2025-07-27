const mongoose = require("mongoose");

const photographerSchema = new mongoose.Schema(
  {
    mandapId: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Mandaps",
        required: true,
      },
    ],
    photographerName: {
      type: String,
      required: true,
    },
    photographyTypes: [
      {
        phtype: {
          type: String,
          enum: [
            "Candid",
            "Traditional",
            "Pre-wedding",
            "Post-wedding",
            "Drone Photography",
          ],
          required: true,
        },
        pricePerEvent: {
          type: Number,
          required: true,
        },
        sampleWork: [
          {
            type: String,
            required: true,
          },
        ],
      },
    ],
    printOption: [
      {
        printType: {
          type: String,
        },
        printDesc: {
          type: String,
        },
        printPrice: {
          type: Number,
        },
      },
    ],
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

module.exports = mongoose.model("Photographers", photographerSchema);
