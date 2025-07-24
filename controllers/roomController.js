const { createErrorResult, createSuccessResult } = require("../config/result");
const mandapModel = require("../models/mandapModel");
const roomModel = require("../models/roomModel");

exports.addRoom = async (req, res) => {
  if (!req.provider) {
    return res.status(400).json(createErrorResult("Invalid Request"));
  }
  try {
    const { mandapId, AcRoom, NonAcRoom } = req.body;
    const mandap = await mandapModel.findById(mandapId);
    if (
      !mandap ||
      mandap.providerId.toString() !== req.provider._id.toString()
    ) {
      return res
        .status(404)
        .json(createErrorResult("Mandap not found or unauthorized"));
    }

    await roomModel.create({
      mandapId,
      AcRoom,
      NonAcRoom,
    });

    return res.status(201).json(
      createSuccessResult({
        message: "Room added successfully",
      })
    );
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};

exports.updateRoom = async (req, res) => {
  if (!req.provider) {
    return res.status(400).json(createErrorResult("Invalid Request"));
  }
  try {
    const { roomId } = req.params;
    const { AcRoom, NonAcRoom } = req.body;
    const room = await roomModel.findById(roomId);
    if (!room) {
      return res.status(404).json(createErrorResult("Room not found"));
    }

    const mandap = await mandapModel.findById(room.mandapId);
    if (mandap.providerId.toString() !== req.provider._id.toString()) {
      return res.status(403).json(createErrorResult("Unauthorized"));
    }
    await roomModel.findByIdAndUpdate(
      roomId,
      { AcRoom, NonAcRoom },
      { new: true, runValidators: true }
    );

    return res.status(200).json(
      createSuccessResult({
        message: "Room updated successfully",
      })
    );
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};


exports.deleteRoom = async (req, res) => {
  if (!req.provider) {
    return res.status(400).json(createErrorResult("Invalid Request"));
  }
  try {
    const { roomId } = req.params;
    const room = await roomModel.findById(roomId);
    if (!room) {
      return res.status(404).json(createErrorResult("Room not found"));
    }

    const mandap = await mandapModel.findById(room.mandapId);
    if (mandap.providerId.toString() !== req.provider._id.toString()) {
      return res.status(403).json(createErrorResult("Unauthorized"));
    }

    await roomModel.findByIdAndUpdate(roomId, { isActive: false });
    return res
      .status(200)
      .json(createSuccessResult({ message: "Room deleted successfully" }));
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};
exports.getAllRooms = async (req, res) => {
  try {
    if (!req.provider) {
      return res.status(400).json(createErrorResult("Invalid Request"));
    }

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
