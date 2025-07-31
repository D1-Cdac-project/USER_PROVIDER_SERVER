const mongoose = require("mongoose");
const { createErrorResult, createSuccessResult } = require("../config/result");

const bookingModel = require("../models/bookingModel");
const mandapModel = require("../models/mandapModel");
const notificationModel = require("../models/notificationModel");
const reviewModel = require("../models/reviewModel");

//adding review to the mandap
exports.addReview = async (req, res) => {
  try {
    if (!req.user)
      return res.status(400).json(createErrorResult("Invalid Request"));
    const { mandapId, rating, comment, bookingId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(mandapId)) {
      return res.status(400).json(createErrorResult("Invalid mandapId format"));
    }

    const mandap = await mandapModel.findById(mandapId);
    if (!mandap) {
      return res.status(404).json(createErrorResult("Mandap not found"));
    }

    // Validate bookingId if provided
    if (bookingId) {
      if (!mongoose.Types.ObjectId.isValid(bookingId)) {
        return res
          .status(400)
          .json(createErrorResult("Invalid bookingId format"));
      }
      const booking = await bookingModel.findById(bookingId);
      if (!booking) {
        return res.status(404).json(createErrorResult("Booking not found"));
      }
      if (booking.userId.toString() !== req.user._id.toString()) {
        return res
          .status(403)
          .json(
            createErrorResult("Unauthorized to add review for this booking")
          );
      }
    }

    // Create the review
    const review = await reviewModel.create({
      userId: req.user._id,
      mandapId,
      rating,
      comment,
    });

    // Update the booking to set isReviewAdded to true
    if (bookingId) {
      await bookingModel.findByIdAndUpdate(
        bookingId,
        { $set: { isReviewAdded: true } },
        { new: true, runValidators: true }
      );
    }

    // Create notification for provider
    const provider = await mandapModel
      .findById(mandapId)
      .select("providerId")
      .lean();
    if (provider) {
      const notificationData = {
        recipientId: provider.providerId,
        recipientModel: "Providers",
        type: "new_review",
        title: "New Review Added",
        message: `A new review for mandap ${mandapId} has been added by user ${req.user._id}.`,
        relatedId: review._id,
        relatedModel: "Reviews",
        isRead: false,
        createdAt: new Date(),
      };

      await notificationModel.create(notificationData);
      req.io.to(provider.providerId.toString()).emit("new_review", {
        ...notificationData,
        id: review._id,
        read: false,
      });
    }

    return res
      .status(201)
      .json(createSuccessResult({ message: "Review added successfully" }));
  } catch (error) {
    console.error("Error adding review:", error);
    return res.status(500).json(createErrorResult(error.message));
  }
};

// updating review as per the reviewId
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

// deleting the reveiw by id
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

// getting all reviews by mandapId
exports.getReviewByMandapId = async (req, res) => {
  try {
    const { mandapId } = req.params;

    // Temporarily skip validation for testing
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

// getting specific review by id
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

//hry all mandaps reviews of provider
exports.getAllReviewsByProviderId = async (req, res) => {
  try {
    const { providerId } = req.params;
    const mandaps = await mandapModel.find({ providerId, isActive: true });
    if (!mandaps || mandaps.length === 0) {
      return res
        .status(404)
        .json(createErrorResult("No active mandaps found for this provider"));
    }

    const mandapIds = mandaps.map((mandap) => mandap._id);
    const reviews = await reviewModel
      .find({ mandapId: { $in: mandapIds }, isActive: true })
      .populate("userId mandapId");

    return res.status(200).json(createSuccessResult({ reviews }));
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};
