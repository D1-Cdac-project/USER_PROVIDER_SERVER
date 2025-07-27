const mongoose = require("mongoose");

const { createSuccessResult, createErrorResult } = require("../config/result");

const bookingModel = require("../models/bookingModel");
const catererModel = require("../models/catererModel");
const mandapModel = require("../models/mandapModel");
const photographerModel = require("../models/photographerModel");
const roomModel = require("../models/roomModel");

// Adds a new booking with validation
exports.addBooking = async (req, res) => {
  try {
    const { mandapId, availableDates, photographer, caterer, room } = req.body;
    const userId = req.user?._id;
    if (!userId)
      return res.status(401).json(createErrorResult("User not authenticated"));
    if (
      !mandapId ||
      !availableDates ||
      !Array.isArray(availableDates) ||
      availableDates.length === 0
    ) {
      return res
        .status(400)
        .json(createErrorResult("mandapId and availableDates are required"));
    }
    if (!mongoose.Types.ObjectId.isValid(mandapId)) {
      return res.status(400).json(createErrorResult("Invalid mandapId"));
    }
    const mandap = await mandapModel
      .findOne({ _id: mandapId, isActive: true })
      .lean();
    if (!mandap) {
      return res
        .status(404)
        .json(createErrorResult("Mandap not found or inactive"));
    }
    const dates = availableDates.map((date) => new Date(date));
    if (dates.some((date) => isNaN(date.getTime()))) {
      return res
        .status(400)
        .json(createErrorResult("Invalid date format in availableDates"));
    }
    const mandapDates = mandap.availableDates.map(
      (date) => new Date(date).toISOString().split("T")[0]
    );
    if (
      !dates.every((date) =>
        mandapDates.includes(date.toISOString().split("T")[0])
      )
    ) {
      return res
        .status(400)
        .json(
          createErrorResult("Selected dates are not available for this mandap")
        );
    }
    if (
      photographer &&
      (!Array.isArray(photographer) ||
        photographer.some((id) => !mongoose.Types.ObjectId.isValid(id)))
    ) {
      return res
        .status(400)
        .json(createErrorResult("Invalid photographer IDs"));
    }
    if (photographer && photographer.length > 0) {
      const photographers = await photographerModel.find({
        _id: { $in: photographer },
        isActive: true,
      });
      if (
        photographers.length !== photographer.length ||
        !photographers.every((p) => p.mandapId && p.mandapId.includes(mandapId))
      ) {
        return res
          .status(400)
          .json(
            createErrorResult(
              "One or more photographers not associated with this mandap"
            )
          );
      }
    }
    if (
      caterer &&
      (!Array.isArray(caterer) ||
        caterer.some((id) => !mongoose.Types.ObjectId.isValid(id)))
    ) {
      return res.status(400).json(createErrorResult("Invalid caterer IDs"));
    }
    if (caterer && caterer.length > 0) {
      const caterers = await catererModel.find({
        _id: { $in: caterer },
        isActive: true,
      });
      if (
        caterers.length !== caterer.length ||
        !caterers.every((c) => c.mandapId && c.mandapId.toString() === mandapId)
      ) {
        return res
          .status(400)
          .json(
            createErrorResult(
              "One or more caterers not associated with this mandap"
            )
          );
      }
    }
    if (room && !mongoose.Types.ObjectId.isValid(room)) {
      return res.status(400).json(createErrorResult("Invalid room ID"));
    }
    if (room) {
      const roomDoc = await roomModel.findOne({
        _id: room,
        mandapId,
        isActive: true,
      });
      if (!roomDoc) {
        return res
          .status(400)
          .json(createErrorResult("Room not associated with this mandap"));
      }
    }
    const booking = await bookingModel.create({
      mandapId,
      userId,
      availableDates: dates,
      photographer: photographer || [],
      caterer: caterer || [],
      room: room || null,
    });
    return res.status(201).json(
      createSuccessResult({
        message: "Booking added successfully",
        booking: booking.toObject(),
      })
    );
  } catch (error) {
    console.error("Error adding booking:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json(
        createErrorResult(
          Object.values(error.errors)
            .map((err) => err.message)
            .join(", ")
        )
      );
    }
    if (error.name === "CastError") {
      return res.status(400).json(createErrorResult("Invalid ID format"));
    }
    return res.status(500).json(createErrorResult(error.message));
  }
};

// Soft deletes a booking by setting isActive to false
exports.deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;
    const providerId = req.provider?._id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json(createErrorResult("Invalid booking ID"));
    }
    const booking = await bookingModel
      .findOne({ _id: id, isActive: true })
      .lean();
    if (!booking) {
      return res
        .status(404)
        .json(createErrorResult("Booking not found or inactive"));
    }
    let hasPermission = false;
    if (userId && booking.userId.toString() === userId.toString()) {
      hasPermission = true;
    } else if (providerId) {
      const mandap = await mandapModel
        .findOne({
          _id: booking.mandapId,
          providerId,
          isActive: true,
        })
        .lean();
      if (mandap) {
        hasPermission = true;
      }
    }
    if (!hasPermission) {
      return res
        .status(403)
        .json(createErrorResult("Not authorized to delete this booking"));
    }
    await bookingModel.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true, runValidators: true }
    );
    return res
      .status(200)
      .json(createSuccessResult({ message: "Booking deleted successfully" }));
  } catch (error) {
    console.error("Error deleting booking:", error);
    if (error.name === "CastError") {
      return res.status(400).json(createErrorResult("Invalid ID format"));
    }
    return res.status(500).json(createErrorResult(error.message));
  }
};

// Updates a booking’s details with validation
exports.updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { availableDates, photographer, caterer, room } = req.body;
    const userId = req.user?._id;
    const providerId = req.provider?._id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json(createErrorResult("Invalid booking ID"));
    }
    const booking = await bookingModel
      .findOne({ _id: id, isActive: true })
      .lean();
    if (!booking) {
      return res
        .status(404)
        .json(createErrorResult("Booking not found or inactive"));
    }
    let hasPermission = false;
    if (userId && booking.userId.toString() === userId.toString()) {
      hasPermission = true;
    } else if (providerId) {
      const mandap = await mandapModel
        .findOne({
          _id: booking.mandapId,
          providerId,
          isActive: true,
        })
        .lean();
      if (mandap) {
        hasPermission = true;
      }
    }
    if (!hasPermission) {
      return res
        .status(403)
        .json(createErrorResult("Not authorized to update this booking"));
    }
    const updateData = {};
    if (availableDates) {
      if (!Array.isArray(availableDates) || availableDates.length === 0) {
        return res
          .status(400)
          .json(createErrorResult("availableDates must be a non-empty array"));
      }
      const dates = availableDates.map((date) => new Date(date));
      if (dates.some((date) => isNaN(date.getTime()))) {
        return res
          .status(400)
          .json(createErrorResult("Invalid date format in availableDates"));
      }
      const mandap = await mandapModel
        .findOne({ _id: booking.mandapId, isActive: true })
        .lean();
      const mandapDates = mandap.availableDates.map(
        (date) => new Date(date).toISOString().split("T")[0]
      );
      if (
        !dates.every((date) =>
          mandapDates.includes(date.toISOString().split("T")[0])
        )
      ) {
        return res
          .status(400)
          .json(
            createErrorResult(
              "Selected dates are not available for this mandap"
            )
          );
      }
      updateData.availableDates = dates;
    }
    if (photographer) {
      if (
        !Array.isArray(photographer) ||
        photographer.some((id) => !mongoose.Types.ObjectId.isValid(id))
      ) {
        return res
          .status(400)
          .json(createErrorResult("Invalid photographer IDs"));
      }
      const photographers = await photographerModel.find({
        _id: { $in: photographer },
        isActive: true,
      });
      if (
        photographers.length !== photographer.length ||
        !photographers.every(
          (p) => p.mandapId && p.mandapId.includes(booking.mandapId)
        )
      ) {
        return res
          .status(400)
          .json(
            createErrorResult(
              "One or more photographers not associated with this mandap"
            )
          );
      }
      updateData.photographer = photographer;
    }
    if (caterer) {
      if (
        !Array.isArray(caterer) ||
        caterer.some((id) => !mongoose.Types.ObjectId.isValid(id))
      ) {
        return res.status(400).json(createErrorResult("Invalid caterer IDs"));
      }
      const caterers = await catererModel.find({
        _id: { $in: caterer },
        isActive: true,
      });
      if (
        caterers.length !== caterer.length ||
        !caterers.every(
          (c) => c.mandapId && c.mandapId.toString() === booking.mandapId
        )
      ) {
        return res
          .status(400)
          .json(
            createErrorResult(
              "One or more caterers not associated with this mandap"
            )
          );
      }
      updateData.caterer = caterer;
    }
    if (room) {
      if (!mongoose.Types.ObjectId.isValid(room)) {
        return res.status(400).json(createErrorResult("Invalid room ID"));
      }
      const roomDoc = await roomModel.findOne({
        _id: room,
        mandapId: booking.mandapId,
        isActive: true,
      });
      if (!roomDoc) {
        return res
          .status(400)
          .json(createErrorResult("Room not associated with this mandap"));
      }
      updateData.room = room;
    }
    const updatedBooking = await bookingModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    if (!updatedBooking) {
      return res.status(404).json(createErrorResult("Booking not found"));
    }
    return res.status(200).json(
      createSuccessResult({
        message: "Booking updated successfully",
        booking: updatedBooking.toObject(),
      })
    );
  } catch (error) {
    console.error("Error updating booking:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json(
        createErrorResult(
          Object.values(error.errors)
            .map((err) => err.message)
            .join(", ")
        )
      );
    }
    if (error.name === "CastError") {
      return res.status(400).json(createErrorResult("Invalid ID format"));
    }
    return res.status(500).json(createErrorResult(error.message));
  }
};

// Fetches all active bookings for provider’s mandaps
exports.getAllBookingsByProvider = async (req, res) => {
  if (!req.provider) {
    return res
      .status(400)
      .json(createErrorResult("Invalid Request: Provider not authenticated"));
  }
  try {
    const mandapIds = await mandapModel
      .find({ providerId: req.provider._id, isActive: true })
      .distinct("_id");
    if (!mandapIds.length) {
      return res.status(200).json(createSuccessResult({ bookings: [] }));
    }
    const bookings = await bookingModel
      .find({ mandapId: { $in: mandapIds }, isActive: true })
      .populate("mandapId userId photographer caterer room")
      .lean();
    return res.status(200).json(createSuccessResult({ bookings }));
  } catch (error) {
    console.error("Error fetching provider bookings:", error);
    if (error.name === "CastError") {
      return res.status(400).json(createErrorResult("Invalid ID format"));
    }
    return res.status(500).json(createErrorResult(error.message));
  }
};

// Fetches all active bookings by user
exports.getAllBookingsByUser = async (req, res) => {
  if (!req.user) {
    return res
      .status(400)
      .json(createErrorResult("Invalid Request: User not authenticated"));
  }
  try {
    console.log("req.user:", req.user); // Debug log
    if (!req.user._id || !mongoose.Types.ObjectId.isValid(req.user._id)) {
      return res.status(400).json(createErrorResult("Invalid user ID format"));
    }
    const bookings = await bookingModel
      .find({ userId: req.user._id, isActive: true })
      .lean();
    // Pre-process to handle invalid room IDs
    const validBookings = await Promise.all(
      bookings.map(async (booking) => {
        if (booking.room && !mongoose.Types.ObjectId.isValid(booking.room)) {
          console.warn(
            `Invalid room ID found: ${booking.room}, setting to null`
          );
          booking.room = null;
        }
        // Manual population if needed (example for room)
        if (booking.room) {
          const roomDoc = await roomModel.findById(booking.room).lean();
          booking.room = roomDoc || null;
        }
        return booking;
      })
    );
    return res
      .status(200)
      .json(createSuccessResult({ bookings: validBookings }));
  } catch (error) {
    console.error("Error fetching user bookings:", error);
    if (error.name === "CastError") {
      return res.status(400).json(createErrorResult("Invalid ID format"));
    }
    return res.status(500).json(createErrorResult(error.message));
  }
};

// Fetches a single booking by ID with ownership check
exports.getBookingById = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json(createErrorResult("Invalid Booking ID"));
  }
  try {
    let booking = await bookingModel
      .findOne({ _id: id, isActive: true })
      .lean();
    if (!booking) {
      return res
        .status(404)
        .json(createErrorResult("Booking not found or inactive"));
    }
    // Handle invalid room ID before population
    if (booking.room && !mongoose.Types.ObjectId.isValid(booking.room)) {
      console.warn(`Invalid room ID found: ${booking.room}, setting to null`);
      booking.room = null;
    }
    // Manual population for room if needed (example)
    if (booking.room) {
      const roomDoc = await roomModel.findById(booking.room).lean();
      booking.room = roomDoc || null;
    }
    // Populate other fields manually or rely on lean data
    // Note: Full population is skipped here to avoid CastError; adjust as needed
    if (req.provider) {
      const mandap = await mandapModel
        .findOne({
          _id: booking.mandapId,
          providerId: req.provider._id,
          isActive: true,
        })
        .lean();
      if (!mandap) {
        return res
          .status(403)
          .json(createErrorResult("Booking does not belong to provider"));
      }
    } else if (req.user) {
      if (booking.userId.toString() !== req.user._id.toString()) {
        return res
          .status(403)
          .json(createErrorResult("Booking does not belong to user"));
      }
    } else {
      return res
        .status(400)
        .json(
          createErrorResult(
            "Invalid Request: No authenticated provider or user"
          )
        );
    }
    return res.status(200).json(createSuccessResult({ booking }));
  } catch (error) {
    console.error("Error fetching booking by ID:", error);
    if (error.name === "CastError") {
      return res.status(400).json(createErrorResult("Invalid ID format"));
    }
    return res.status(500).json(createErrorResult(error.message));
  }
};
