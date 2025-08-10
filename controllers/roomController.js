const mongoose = require("mongoose");

const mandapModel = require("../models/mandapModel");
const roomModel = require("../models/roomModel");

const { createErrorResult, createSuccessResult } = require("../config/result");
const { cloudinary } = require("../config/cloudinary");

// Helper to parse room data
const parseRoomData = (input) => {
  if (!input) return {};

  // Handle JSON string case
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      return {
        noOfRooms: parsed.noOfRooms ? Number(parsed.noOfRooms) : undefined,
        pricePerNight: parsed.pricePerNight
          ? Number(parsed.pricePerNight)
          : undefined,
        amenities: parsed.amenities
          ? Array.isArray(parsed.amenities)
            ? parsed.amenities
            : parsed.amenities.split(",").map((s) => s.trim())
          : undefined,
      };
    } catch (error) {
      // Fallback to comma-separated string parsing
      const [noOfRooms, pricePerNight, amenities] = input
        .split(",")
        .map((s) => s.trim());
      return {
        noOfRooms: noOfRooms ? Number(noOfRooms) : undefined,
        pricePerNight: pricePerNight ? Number(pricePerNight) : undefined,
        amenities: amenities
          ? amenities.split("|").map((s) => s.trim())
          : undefined,
      };
    }
  }

  // Handle object case
  if (typeof input === "object") {
    return {
      noOfRooms: input.noOfRooms ? Number(input.noOfRooms) : undefined,
      pricePerNight: input.pricePerNight
        ? Number(input.pricePerNight)
        : undefined,
      amenities: input.amenities
        ? Array.isArray(input.amenities)
          ? input.amenities
          : input.amenities.split(",").map((s) => s.trim())
        : undefined,
    };
  }

  return {};
};

// Adds a new room with image upload
exports.addRoom = async (req, res) => {
  if (!req.provider) {
    return res
      .status(400)
      .json(createErrorResult("Invalid Request: Provider not authenticated"));
  }
  try {
    if (!req.body) {
      return res
        .status(400)
        .json(createErrorResult("Request body is missing or undefined"));
    }

    const { mandapId, AcRoom, NonAcRoom } = req.body;

    if (!mongoose.Types.ObjectId.isValid(mandapId)) {
      return res.status(400).json(createErrorResult("Invalid mandapId format"));
    }

    const mandap = await mandapModel.findById(mandapId);

    if (
      !mandap ||
      mandap.providerId.toString() !== req.provider._id.toString()
    ) {
      return res
        .status(404)
        .json(createErrorResult("Mandap not found or unauthorized"));
    }

    // Parse AcRoom and NonAcRoom
    const parsedAcRoom = parseRoomData(AcRoom);
    const parsedNonAcRoom = parseRoomData(NonAcRoom);
    if (!parsedAcRoom.noOfRooms && !parsedNonAcRoom.noOfRooms) {
      return res
        .status(400)
        .json(
          createErrorResult(
            "At least one of AcRoom or NonAcRoom must be provided"
          )
        );
    }
    if (
      parsedAcRoom.noOfRooms &&
      (!Number.isInteger(parsedAcRoom.noOfRooms) ||
        !parsedAcRoom.pricePerNight ||
        !parsedAcRoom.amenities)
    ) {
      return res
        .status(400)
        .json(
          createErrorResult(
            "AcRoom requires noOfRooms, pricePerNight, and amenities"
          )
        );
    }
    if (
      parsedNonAcRoom.noOfRooms &&
      (!Number.isInteger(parsedNonAcRoom.noOfRooms) ||
        !parsedNonAcRoom.pricePerNight ||
        !parsedNonAcRoom.amenities)
    ) {
      return res
        .status(400)
        .json(
          createErrorResult(
            "NonAcRoom requires noOfRooms, pricePerNight, and amenities"
          )
        );
    }

    // Validate amenities against schema enum
    const acAmenitiesEnum = [
      "WiFi",
      "TV",
      "AirConditioning",
      "MiniBar",
      "RoomService",
      "Balcony",
      "Desk",
      "Safe",
    ];
    const nonAcAmenitiesEnum = [
      "WiFi",
      "TV",
      "Fan",
      "RoomService",
      "Balcony",
      "Desk",
      "Safe",
    ];
    if (
      parsedAcRoom.amenities &&
      !parsedAcRoom.amenities.every((a) => acAmenitiesEnum.includes(a))
    ) {
      return res
        .status(400)
        .json(createErrorResult("Invalid amenities for AcRoom"));
    }
    if (
      parsedNonAcRoom.amenities &&
      !parsedNonAcRoom.amenities.every((a) => nonAcAmenitiesEnum.includes(a))
    ) {
      return res
        .status(400)
        .json(createErrorResult("Invalid amenities for NonAcRoom"));
    }

    let acRoomImages = [],
      nonAcRoomImages = [];
    if (req.files && req.files.length > 0) {
      acRoomImages = req.files
        .filter((file) => file.fieldname.startsWith("acRoomImages"))
        .map((file) => file.path);
      nonAcRoomImages = req.files
        .filter((file) => file.fieldname.startsWith("nonAcRoomImages"))
        .map((file) => file.path);
    }

    await roomModel.create({
      mandapId,
      AcRoom: {
        ...parsedAcRoom,
        roomImages: acRoomImages,
        amenities: parsedAcRoom.amenities || ["AirConditioning"],
      },
      NonAcRoom: {
        ...parsedNonAcRoom,
        roomImages: nonAcRoomImages,
        amenities: parsedNonAcRoom.amenities || ["Fan"],
      },
    });

    return res
      .status(201)
      .json(createSuccessResult({ message: "Room added successfully" }));
  } catch (error) {
    console.error("Error adding room:", error);
    return res.status(500).json(createErrorResult(error.message));
  }
};

// // Updates a room with image handling
exports.updateRoom = async (req, res) => {
  if (!req.provider) {
    return res
      .status(400)
      .json(createErrorResult("Invalid Request: Provider not authenticated"));
  }
  try {
    const { roomId } = req.params;
    const { mandapId, AcRoom, NonAcRoom } = req.body;

    // Validate request body
    if (!req.body) {
      return res
        .status(400)
        .json(createErrorResult("Request body is missing or undefined"));
    }

    // Validate room existence
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json(createErrorResult("Invalid roomId"));
    }
    const room = await roomModel.findById(roomId);
    if (!room) {
      return res.status(404).json(createErrorResult("Room not found"));
    }

    // Validate mandapId if provided
    let updatedMandapId = room.mandapId;
    if (mandapId) {
      if (!mongoose.Types.ObjectId.isValid(mandapId)) {
        return res
          .status(400)
          .json(createErrorResult("Invalid mandapId format"));
      }
      const mandap = await mandapModel.findOne({
        _id: mandapId,
        providerId: req.provider._id,
        isActive: true,
      });
      if (!mandap) {
        return res
          .status(404)
          .json(createErrorResult("Mandap not found or unauthorized"));
      }
      updatedMandapId = mandapId;
    }

    // Parse AcRoom and NonAcRoom
    const parsedAcRoom = AcRoom
      ? typeof AcRoom === "string"
        ? JSON.parse(AcRoom)
        : AcRoom
      : room.AcRoom;
    const parsedNonAcRoom = NonAcRoom
      ? typeof NonAcRoom === "string"
        ? JSON.parse(NonAcRoom)
        : NonAcRoom
      : room.NonAcRoom;

    // Validate AcRoom and NonAcRoom fields
    if (
      parsedAcRoom.noOfRooms &&
      (!Number.isInteger(Number(parsedAcRoom.noOfRooms)) ||
        !parsedAcRoom.pricePerNight ||
        !parsedAcRoom.amenities)
    ) {
      return res
        .status(400)
        .json(
          createErrorResult(
            "AcRoom requires noOfRooms, pricePerNight, and amenities"
          )
        );
    }
    if (
      parsedNonAcRoom.noOfRooms &&
      (!Number.isInteger(Number(parsedNonAcRoom.noOfRooms)) ||
        !parsedNonAcRoom.pricePerNight ||
        !parsedNonAcRoom.amenities)
    ) {
      return res
        .status(400)
        .json(
          createErrorResult(
            "NonAcRoom requires noOfRooms, pricePerNight, and amenities"
          )
        );
    }

    // Validate amenities against schema enum
    const acAmenitiesEnum = [
      "WiFi",
      "TV",
      "AirConditioning",
      "MiniBar",
      "RoomService",
      "Balcony",
      "Desk",
      "Safe",
    ];
    const nonAcAmenitiesEnum = [
      "WiFi",
      "TV",
      "Fan",
      "RoomService",
      "Balcony",
      "Desk",
      "Safe",
    ];
    if (
      parsedAcRoom.amenities &&
      !parsedAcRoom.amenities.every((a) => acAmenitiesEnum.includes(a))
    ) {
      return res
        .status(400)
        .json(createErrorResult("Invalid amenities for AcRoom"));
    }
    if (
      parsedNonAcRoom.amenities &&
      !parsedNonAcRoom.amenities.every((a) => nonAcAmenitiesEnum.includes(a))
    ) {
      return res
        .status(400)
        .json(createErrorResult("Invalid amenities for NonAcRoom"));
    }

    // Handle image updates
    let acRoomImages = parsedAcRoom.roomImages || [];
    let nonAcRoomImages = parsedNonAcRoom.roomImages || [];
    if (req.files && req.files.length > 0) {
      // Delete existing images from Cloudinary
      for (const imageUrl of [
        ...(room.AcRoom.roomImages || []),
        ...(room.NonAcRoom.roomImages || []),
      ]) {
        if (imageUrl) {
          const publicId = imageUrl.split("/").pop().split(".")[0];
          await cloudinary.uploader.destroy(`BookMyMandap/${publicId}`);
        }
      }
      // Upload new images
      const uploadedImages = await Promise.all(
        req.files.map((file) =>
          cloudinary.uploader.upload(file.path, {
            folder: "BookMyMandap",
          })
        )
      ).then((results) => results.map((result) => result.secure_url));

      // Distribute images to AcRoom and NonAcRoom
      acRoomImages = uploadedImages.filter((_, index) =>
        req.files[index].fieldname.startsWith("acRoomImages")
      );
      nonAcRoomImages = uploadedImages.filter((_, index) =>
        req.files[index].fieldname.startsWith("nonAcRoomImages")
      );
    } else if (
      (!parsedAcRoom.roomImages || parsedAcRoom.roomImages.length === 0) &&
      (!parsedNonAcRoom.roomImages || parsedNonAcRoom.roomImages.length === 0)
    ) {
      // Clear existing images if both roomImages arrays are empty
      for (const imageUrl of [
        ...(room.AcRoom.roomImages || []),
        ...(room.NonAcRoom.roomImages || []),
      ]) {
        if (imageUrl) {
          const publicId = imageUrl.split("/").pop().split(".")[0];
          await cloudinary.uploader.destroy(`BookMyMandap/${publicId}`);
        }
      }
      acRoomImages = [];
      nonAcRoomImages = [];
    }

    // Update room in database
    await roomModel.findByIdAndUpdate(
      roomId,
      {
        mandapId: updatedMandapId,
        AcRoom: {
          noOfRooms: parsedAcRoom.noOfRooms || room.AcRoom.noOfRooms,
          pricePerNight:
            parsedAcRoom.pricePerNight || room.AcRoom.pricePerNight,
          amenities: parsedAcRoom.amenities || room.AcRoom.amenities,
          roomImages: acRoomImages,
        },
        NonAcRoom: {
          noOfRooms: parsedNonAcRoom.noOfRooms || room.NonAcRoom.noOfRooms,
          pricePerNight:
            parsedNonAcRoom.pricePerNight || room.NonAcRoom.pricePerNight,
          amenities: parsedNonAcRoom.amenities || room.NonAcRoom.amenities,
          roomImages: nonAcRoomImages,
        },
        isActive: true,
      },
      { new: true, runValidators: true }
    );

    return res
      .status(200)
      .json(createSuccessResult({ message: "Room updated successfully" }));
  } catch (error) {
    console.error("Error updating room:", error);
    return res.status(500).json(createErrorResult(error.message));
  }
};

// Soft deletes a room with image cleanup
exports.deleteRoom = async (req, res) => {
  if (!req.provider) {
    return res
      .status(400)
      .json(createErrorResult("Invalid Request: Provider not authenticated"));
  }
  try {
    const { roomId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json(createErrorResult("Invalid roomId"));
    }

    const room = await roomModel.findById(roomId);
    if (!room) {
      return res.status(404).json(createErrorResult("Room not found"));
    }

    const mandap = await mandapModel.findById(room.mandapId);

    if (
      !mandap ||
      mandap.providerId.toString() !== req.provider._id.toString()
    ) {
      return res
        .status(403)
        .json(
          createErrorResult("Unauthorized: Provider does not own this mandap")
        );
    }

    // Delete images from Cloudinary
    for (const imageUrl of [
      ...room.AcRoom.roomImages,
      ...room.NonAcRoom.roomImages,
    ]) {
      const publicId = imageUrl.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(`BookMyMandap/${publicId}`);
    }

    await roomModel.findByIdAndUpdate(roomId, { isActive: false });

    return res
      .status(200)
      .json(createSuccessResult({ message: "Room deleted successfully" }));
  } catch (error) {
    console.error("Error deleting room:", error);
    return res.status(500).json(createErrorResult(error.message));
  }
};

// Fetches all active rooms for provider’s mandaps
exports.getAllRooms = async (req, res) => {
  if (!req.provider) {
    return res
      .status(400)
      .json(createErrorResult("Invalid Request: Provider not authenticated"));
  }
  try {
    const mandaps = await mandapModel
      .find({ providerId: req.provider._id, isActive: true })
      .distinct("_id");

    if (!mandaps.length) {
      return res.status(404).json(createErrorResult("No mandaps found"));
    }

    const rooms = await roomModel
      .find({ mandapId: { $in: mandaps }, isActive: true })
      .populate("mandapId");
    if (!rooms.length) {
      return res.status(404).json(createErrorResult("No rooms found"));
    }

    return res
      .status(200)
      .json(
        createSuccessResult({ rooms, message: "Rooms fetched successfully" })
      );
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};

// Fetches a single room by ID
exports.getRoomById = async (req, res) => {
  try {
    const { roomId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json(createErrorResult("Invalid roomId"));
    }

    const room = await roomModel.findById(roomId).populate("mandapId");
    if (!room || !room.isActive) {
      return res
        .status(404)
        .json(createErrorResult("Room not found or inactive"));
    }

    const mandap = await mandapModel.findOne({
      _id: room.mandapId,
    });

    if (!mandap) {
      return res
        .status(403)
        .json(
          createErrorResult("Unauthorized: Provider does not own this mandap")
        );
    }

    return res
      .status(200)
      .json(
        createSuccessResult({ room, message: "Room fetched successfully" })
      );
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};

// Fetches all rooms by mandap ID
exports.getRoomByMandapId = async (req, res) => {
  try {
    const { mandapId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(mandapId)) {
      return res.status(400).json(createErrorResult("Invalid mandapId"));
    }

    const mandap = await mandapModel.findById(mandapId);

    if (!mandap || !mandap.isActive) {
      return res
        .status(404)
        .json(createErrorResult("Mandap not found or inactive"));
    }

    const rooms = await roomModel
      .find({ mandapId, isActive: true })
      .populate("mandapId");
    return res.status(200).json(
      createSuccessResult({
        rooms,
        message: "Rooms fetched successfully",
      })
    );
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};
