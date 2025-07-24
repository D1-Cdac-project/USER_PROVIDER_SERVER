const { createErrorResult, createSuccessResult } = require("../config/result");
const mandapModel = require("../models/mandapModel");
const reviewModel = require("../models/reviewModel");

exports.addReview = async (req, res) => {
  try {
    if (!req.user)
      return res.status(400).json(createErrorResult("Invalid Request"));
    const { mandapId, rating, comment } = req.body;

    const mandap = await mandapModel.findById(mandapId);
    if (!mandap)
      return res.status(404).json(createErrorResult("Mandap not found"));

    await reviewModel.create({
      userId: req.user._id,
      mandapId,
      rating,
      comment,
    });

    return res
      .status(201)
      .json(createSuccessResult({ message: "Review added successfully" }));
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};

