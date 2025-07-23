const { createSuccessResult, createErrorResult } = require("../config/result");
const bookingModel = require("../models/bookingModel");

exports.addBooking = async (req, res) => {
  try {
    const { mandapId, availableDates, photographer, caterer, room } = req.body;
    const userId = req.user._id;

    await bookingModel.create({
      mandapId,
      userId,
      availableDates,
      photographer,
      caterer,
      room,
    });

    return res.status(201).json(
      createSuccessResult({
        message: "Booking added successfully",
      })
    );
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};

exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await bookingModel
      .find({ isActive: true })
      .populate("mandapId")
      .populate("userId")
      .populate("photographer")
      .populate("caterer");

    return res.status(200).json(createSuccessResult({ bookings }));
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};

exports.getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await bookingModel
      .findById(id)
      .populate("mandapId")
      .populate("userId")
      .populate("photographer")
      .populate("caterer");

    if (!booking) {
      return res.status(404).json(createErrorResult("Booking not found"));
    }

    return res.status(200).json(createSuccessResult({ booking }));
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};

exports.deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await bookingModel.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true, runValidators: true }
    );
    if (!deleted) {
      return res.status(404).json(createErrorResult("Booking not found"));
    }

    return res
      .status(200)
      .json(createSuccessResult({ message: "Booking deleted successfully" }));
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};

exports.updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

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
      })
    );
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};
