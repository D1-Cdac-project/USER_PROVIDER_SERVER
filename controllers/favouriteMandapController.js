const mongoose = require("mongoose");
const { createErrorResult, createSuccessResult } = require("../config/result");

const userModel = require("../models/userModel");

// Fetches all favorite mandaps for user
exports.getAllFavoriteMandaps = async (req, res) => {
  try {
    if (!req.user)
      return res.status(400).json(createErrorResult("Invalid Request"));
    const user = await userModel
      .findById(req.user._id)
      .populate("favoriteMandaps");
    if (!user) return res.status(404).json(createErrorResult("User not found"));
    return res
      .status(200)
      .json(createSuccessResult({ favoriteMandaps: user.favoriteMandaps }));
  } catch (error) {
    console.error("Error fetching favorite mandaps:", error);
    return res.status(500).json(createErrorResult(error.message));
  }
};

// Adds a mandap to user’s favorites
exports.addFavoriteMandap = async (req, res) => {
  try {
    if (!req.user)
      return res.status(400).json(createErrorResult("Invalid Request"));
    const { mandapId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(mandapId)) {
      return res.status(400).json(createErrorResult("Invalid mandapId"));
    }
    const user = await userModel.findById(req.user._id);
    if (user.favoriteMandaps.includes(mandapId)) {
      return res
        .status(400)
        .json(createErrorResult("Mandap is already in favorites"));
    }
    await userModel.findByIdAndUpdate(
      req.user._id,
      { $push: { favoriteMandaps: mandapId } },
      { new: true, runValidators: true }
    );
    return res
      .status(200)
      .json(
        createSuccessResult({ message: "Favorite mandap added successfully" })
      );
  } catch (error) {
    console.error("Error adding favorite mandap:", error);
    return res.status(500).json(createErrorResult(error.message));
  }
};

// Removes a mandap from user’s favorites
exports.deleteFavoriteMandap = async (req, res) => {
  try {
    if (!req.user)
      return res.status(400).json(createErrorResult("Invalid Request"));
    const { mandapId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(mandapId)) {
      return res.status(400).json(createErrorResult("Invalid mandapId"));
    }
    const user = await userModel.findById(req.user._id);
    if (!user) return res.status(404).json(createErrorResult("User not found"));
    if (!user.favoriteMandaps.includes(mandapId)) {
      return res.status(400).json(createErrorResult("Mandap not in favorites"));
    }
    await userModel.findByIdAndUpdate(
      req.user._id,
      { $pull: { favoriteMandaps: mandapId } },
      { new: true }
    );
    return res
      .status(200)
      .json(
        createSuccessResult({ message: "Favorite mandap removed successfully" })
      );
  } catch (error) {
    console.error("Error deleting favorite mandap:", error);
    return res.status(500).json(createErrorResult(error.message));
  }
};
