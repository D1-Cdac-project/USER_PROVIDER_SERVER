const { createErrorResult, createSuccessResult } = require("../config/result");
const userModel = require("../models/userModel");

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
    return res.status(500).json(createErrorResult(error.message));
  }
};

exports.addFavoriteMandap = async (req, res) => {
  try {
    if (!req.user)
      return res.status(400).json(createErrorResult("Invalid Request"));
    const { mandapId } = req.body;
    const user = await userModel.findById(req.user._id);

    if (user.favoriteMandaps && user.favoriteMandaps.includes(mandapId)) {
      return res
        .status(400)
        .json(createErrorResult("Mandap is already in favorites"));
    }

    await userModel.findByIdAndUpdate(
      user._id,
      { $push: { favoriteMandaps: mandapId } },
      { new: true, runValidators: true }
    );

    return res
      .status(200)
      .json(
        createSuccessResult({ message: "Favorite mandap added successfully" })
      );
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};

exports.deleteFavoriteMandap = async (req, res) => {
  try {
    if (!req.user)
      return res.status(400).json(createErrorResult("Invalid Request"));
    const { mandapId } = req.params;
    const user = await userModel.findById(req.user._id);
    if (!user) return res.status(404).json(createErrorResult("User not Found"));
    if (!user.favoriteMandaps.includes(mandapId)) {
      return res
        .status(400)
        .json(createErrorResult("Mandap not in Favourites"));
    }

    await userModel.findByIdAndUpdate(
      req.user._id,
      { $pull: { favoriteMandaps: mandapId } },
      { new: true }
    );
    return res
      .status(200)
      .json(
        createSuccessResult({ message: "Favorite Mandap Removed successfully" })
      );
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};
