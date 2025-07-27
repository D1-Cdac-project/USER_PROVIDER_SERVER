const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    mandapId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mandaps",
      required: true,
    },
    AcRoom: {
      noOfRooms: {
        type: Number,
        required: true,
        min: 0,
      },
      pricePerNight: {
        type: Number,
        required: true,
        min: 0,
      },
      amenities: [
        {
          type: String,
          enum: [
            "WiFi",
            "TV",
            "AirConditioning",
            "MiniBar",
            "RoomService",
            "Balcony",
            "Desk",
            "Safe",
          ],
          default: ["AirConditioning"],
        },
      ],
      roomImages: [
        {
          type: String,
          validate: {
            validator: function (v) {
              return /^(https?:\/\/[^\s$.?#].[^\s]*)$/i.test(v);
            },
            message: (props) => `${props.value} is not a valid URL!`,
          },
        },
      ],
    },
    NonAcRoom: {
      noOfRooms: {
        type: Number,

        min: 0,
      },
      pricePerNight: {
        type: Number,

        min: 0,
      },
      amenities: [
        {
          type: String,
          enum: ["WiFi", "TV", "Fan", "RoomService", "Balcony", "Desk", "Safe"],
          default: ["Fan"],
        },
      ],
      roomImages: [
        {
          type: String,
          validate: {
            validator: function (v) {
              return /^(https?:\/\/[^\s$.?#].[^\s]*)$/i.test(v);
            },
            message: (props) => `${props.value} is not a valid URL!`,
          },
        },
      ],
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

module.exports = mongoose.model("Rooms", roomSchema);
