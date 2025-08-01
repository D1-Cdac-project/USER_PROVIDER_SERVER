const mongoose = require("mongoose");

const catererSchema = new mongoose.Schema(
  {
    mandapId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mandaps",
      required: true,
    },

    catererName: {
      type: String,
      required: true,
    },
    menuCategory: [
      {
        category: {
          type: String,
          enum: ["Basic", "Standard", "Premium", "Luxury"],
          required: true,
        },
        menuItems: [
          {
            itemName: {
              type: String,
              required: true,
            },
            itemPrice: {
              type: Number,
            },
          },
        ],
        pricePerPlate: {
          type: Number,
          required: true,
        },
        categoryImage: {
          type: String,
        },
      },
    ],
    foodType: [
      {
        type: String,
        enum: ["Veg", "Non-Veg", "Both", "Jain"],
        required: true,
      },
    ],

    isCustomizable: {
      type: Boolean,
      default: false,
    },
    customizableItems: [
      {
        itemName: {
          type: String,
        },
        itemPrice: {
          type: Number,
        },
      },
    ],
    hasTastingSession: {
      type: Boolean,
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

module.exports = mongoose.model("Caterers", catererSchema);
