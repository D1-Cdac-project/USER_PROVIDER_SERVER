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

exports.updateReviewById = async (req, res) => {
  try {
    if (!req.user)
      return res.status(400).json(createErrorResult("Invalid Request"));
    const { reviewId } = req.params;
    const { rating, comment } = req.body;

    const review = await reviewModel.findById(reviewId);
    if (!review)
      return res.status(404).json(createErrorResult("Review not found"));
    if (review.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json(createErrorResult("Unauthorized"));
    }

    await reviewModel.findByIdAndUpdate(
      reviewId,
      { rating, comment },
      { new: true, runValidators: true }
    );

    return res.status(200).json(
      createSuccessResult({
        message: "Review updated successfully",
      })
    );
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};

exports.deleteReviewById = async (req, res) => {
  try {
    if (!req.user)
      return res.status(400).json(createErrorResult("Invalid Request"));
    const { reviewId } = req.params;

    const review = await reviewModel.findById(reviewId);
    if (!review)
      return res.status(404).json(createErrorResult("Review not found"));
    if (review.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json(createErrorResult("Unauthorized"));
    }

    await reviewModel.findByIdAndUpdate(reviewId, { isActive: false });
    return res
      .status(200)
      .json(createSuccessResult({ message: "Review deleted successfully" }));
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};

exports.getReviewByMandapId = async (req, res) => {
  try {
    const { mandapId } = req.params;
    const mandap = await mandapModel.findById(mandapId);
    if (!mandap || !mandap.isActive) {
      return res.status(404).json(createErrorResult("Mandap not found"));
    }

    const reviews = await reviewModel
      .find({ mandapId, isActive: true })
      .populate("userId mandapId");
    return res.status(200).json(createSuccessResult({ reviews }));
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};

exports.getReviewById = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const review = await reviewModel
      .findById(reviewId)
      .populate("userId mandapId");
    if (!review || !review.isActive) {
      return res.status(404).json(createErrorResult("Review not found"));
    }
    return res.status(200).json(createSuccessResult({ review }));
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};
