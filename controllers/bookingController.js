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
    const {
      mandapId,
      orderDates,
      photographer,
      caterer,
      room,
      totalAmount,
      amountPaid,
    } = req.body;
    const userId = req.user?._id;

    // Validate user authentication
    if (!userId) {
      return res.status(401).json(createErrorResult("User not authenticated"));
    }

    // Validate required fields
    if (
      !mandapId ||
      !orderDates ||
      !Array.isArray(orderDates) ||
      orderDates.length === 0 ||
      totalAmount === undefined ||
      isNaN(totalAmount) ||
      totalAmount < 0
    ) {
      return res
        .status(400)
        .json(createErrorResult("Invalid request parameters"));
    }

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(mandapId)) {
      return res.status(400).json(createErrorResult("Invalid ID format"));
    }

    // Check mandap existence and activity
    const mandap = await mandapModel
      .findOne({ _id: mandapId, isActive: true })
      .lean();
    if (!mandap) {
      return res
        .status(404)
        .json(createErrorResult("Mandap not found or inactive"));
    }

    // Validate dates
    const dates = orderDates.map((date) => new Date(date));
    if (dates.some((date) => isNaN(date.getTime()))) {
      return res
        .status(400)
        .json(createErrorResult("Invalid date format in orderDates"));
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

    // Check for duplicate bookings
    const existingBookings = await bookingModel
      .find({
        userId,
        mandapId,
        isActive: true,
        orderDates: { $in: dates.map((d) => d.toISOString().split("T")[0]) },
      })
      .lean();
    if (existingBookings.length > 0) {
      return res
        .status(400)
        .json(
          createErrorResult(
            "You already have a booking for this mandap on the selected dates"
          )
        );
    }

    // Validate photographers
    if (photographer && photographer.length > 0) {
      if (photographer.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
        return res.status(400).json(createErrorResult("Invalid ID format"));
      }
      const photographers = await photographerModel
        .find({ _id: { $in: photographer }, isActive: true })
        .lean();
      if (
        photographers.length !== photographer.length ||
        !photographers.every(
          (p) =>
            p.mandapId &&
            p.mandapId.length > 0 &&
            p.mandapId.some((id) => id.toString() === mandapId)
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
    }

    // Validate caterers
    if (caterer && caterer.length > 0) {
      if (caterer.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
        return res.status(400).json(createErrorResult("Invalid ID format"));
      }
      const caterers = await catererModel
        .find({ _id: { $in: caterer }, isActive: true })
        .lean();
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

    // Validate room
    if (room) {
      if (!mongoose.Types.ObjectId.isValid(room)) {
        return res.status(400).json(createErrorResult("Invalid ID format"));
      }
      const roomDoc = await roomModel
        .findOne({ _id: room, mandapId, isActive: true })
        .lean();
      if (!roomDoc) {
        return res
          .status(400)
          .json(createErrorResult("Room not associated with this mandap"));
      }
    }

    // Set payment status
    const paidAmount = Number(amountPaid) || 0;
    if (isNaN(paidAmount) || paidAmount < 0) {
      return res.status(400).json(createErrorResult("Invalid amountPaid"));
    }
    const paymentStatus =
      paidAmount === Number(totalAmount) ? "Completed" : "Partial";

    // Update mandap available dates
    const updatedAvailableDates = mandap.availableDates.filter(
      (mandapDate) =>
        !dates.some(
          (orderDate) =>
            new Date(mandapDate).toISOString().split("T")[0] ===
            orderDate.toISOString().split("T")[0]
        )
    );
    await mandapModel.findByIdAndUpdate(mandapId, {
      $set: { availableDates: updatedAvailableDates },
    });

    // Create booking
    const booking = await bookingModel.create({
      mandapId,
      userId,
      orderDates: dates,
      photographer: photographer || [],
      caterer: caterer || [],
      room: room || null,
      totalAmount: Number(totalAmount),
      amountPaid: paidAmount,
      paymentStatus,
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
      return res.status(400).json(createErrorResult("Invalid ID format"));
    }

    const booking = await bookingModel
      .findOne({ _id: id, isActive: true })
      .lean();
    if (!booking) {
      return res
        .status(404)
        .json(createErrorResult("Booking not found or inactive"));
    }

    // Check permissions
    let hasPermission = false;
    if (userId && booking.userId.toString() === userId.toString()) {
      hasPermission = true;
    } else if (providerId) {
      const mandap = await mandapModel
        .findOne({ _id: booking.mandapId, providerId, isActive: true })
        .lean();
      if (mandap) hasPermission = true;
    }
    if (!hasPermission) {
      return res
        .status(403)
        .json(createErrorResult("Not authorized to perform this action"));
    }

    // Check cancellation date
    if (!booking.orderDates || booking.orderDates.length === 0) {
      return res.status(400).json(createErrorResult("No order dates found"));
    }
    const orderDate = new Date(booking.orderDates[0]);
    const currentDate = new Date();
    if (currentDate >= orderDate) {
      return res
        .status(400)
        .json(
          createErrorResult("Cannot cancel booking on or after order date")
        );
    }

    // Add back dates to mandap
    const mandap = await mandapModel.findById(booking.mandapId).lean();
    const updatedAvailableDates = [
      ...new Set([
        ...mandap.availableDates.map(
          (d) => new Date(d).toISOString().split("T")[0]
        ),
        ...booking.orderDates.map(
          (d) => new Date(d).toISOString().split("T")[0]
        ),
      ]),
    ].map((d) => new Date(d));
    await mandapModel.findByIdAndUpdate(booking.mandapId, {
      $set: { availableDates: updatedAvailableDates },
    });

    await bookingModel.findByIdAndUpdate(
      id,
      { isActive: false, paymentStatus: "Cancelled" },
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
    const { orderDates, photographer, caterer, room, totalAmount, amountPaid } =
      req.body;
    const userId = req.user?._id;
    const providerId = req.provider?._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json(createErrorResult("Invalid ID format"));
    }

    const booking = await bookingModel
      .findOne({ _id: id, isActive: true })
      .lean();
    if (!booking) {
      return res
        .status(404)
        .json(createErrorResult("Booking not found or inactive"));
    }

    // Check permissions
    let hasPermission = false;
    if (userId && booking.userId.toString() === userId.toString()) {
      hasPermission = true;
    } else if (providerId) {
      const mandap = await mandapModel
        .findOne({ _id: booking.mandapId, providerId, isActive: true })
        .lean();
      if (mandap) hasPermission = true;
    }
    if (!hasPermission) {
      return res
        .status(403)
        .json(createErrorResult("Not authorized to perform this action"));
    }

    const updateData = {};
    if (orderDates) {
      if (!Array.isArray(orderDates) || orderDates.length === 0) {
        return res
          .status(400)
          .json(createErrorResult("Invalid request parameters"));
      }
      const dates = orderDates.map((date) => new Date(date));
      if (dates.some((date) => isNaN(date.getTime()))) {
        return res
          .status(400)
          .json(createErrorResult("Invalid date format in orderDates"));
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
      const conflictingBookings = await bookingModel
        .find({
          _id: { $ne: id },
          mandapId: booking.mandapId,
          isActive: true,
          orderDates: { $in: dates.map((d) => d.toISOString().split("T")[0]) },
        })
        .lean();
      if (conflictingBookings.length > 0) {
        return res
          .status(400)
          .json(
            createErrorResult(
              "You already have a booking for this mandap on the selected dates"
            )
          );
      }
      updateData.orderDates = dates;
    }

    if (photographer) {
      if (photographer.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
        return res.status(400).json(createErrorResult("Invalid ID format"));
      }
      const photographers = await photographerModel
        .find({ _id: { $in: photographer }, isActive: true })
        .lean();
      if (
        photographers.length !== photographer.length ||
        !photographers.every(
          (p) =>
            p.mandapId &&
            p.mandapId.length > 0 &&
            p.mandapId.some((id) => id.toString() === booking.mandapId)
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
      if (caterer.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
        return res.status(400).json(createErrorResult("Invalid ID format"));
      }
      const caterers = await catererModel
        .find({ _id: { $in: caterer }, isActive: true })
        .lean();
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
        return res.status(400).json(createErrorResult("Invalid ID format"));
      }
      const roomDoc = await roomModel
        .findOne({ _id: room, mandapId: booking.mandapId, isActive: true })
        .lean();
      if (!roomDoc) {
        return res
          .status(400)
          .json(createErrorResult("Room not associated with this mandap"));
      }
      updateData.room = room;
    }

    if (totalAmount !== undefined) {
      if (isNaN(totalAmount) || totalAmount < 0) {
        return res.status(400).json(createErrorResult("Invalid totalAmount"));
      }
      updateData.totalAmount = Number(totalAmount);
    }

    if (amountPaid !== undefined) {
      if (isNaN(amountPaid) || amountPaid < 0) {
        return res.status(400).json(createErrorResult("Invalid amountPaid"));
      }
      updateData.amountPaid = Number(amountPaid);
      updateData.paymentStatus =
        Number(amountPaid) === Number(totalAmount || booking.totalAmount)
          ? "Completed"
          : "Partial";
    }

    const updatedBooking = await bookingModel
      .findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
      .lean();
    if (!updatedBooking) {
      return res
        .status(404)
        .json(createErrorResult("Booking not found or inactive"));
    }

    return res.status(200).json(
      createSuccessResult({
        message: "Booking updated successfully",
        booking: updatedBooking,
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

// // Fetches all active bookings for provider’s mandaps
exports.getAllBookingsByProvider = async (req, res) => {
  try {
    if (!req.provider) {
      return res
        .status(400)
        .json(createErrorResult("Provider not authenticated"));
    }
    const mandapIds = await mandapModel
      .find({ providerId: req.provider._id, isActive: true })
      .distinct("_id")
      .lean();
    if (!mandapIds.length) {
      return res.status(200).json(createSuccessResult({ bookings: [] }));
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const bookings = await bookingModel
      .find({ mandapId: { $in: mandapIds }, isActive: true })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const populatedBookings = await Promise.all(
      bookings.map(async (booking) => {
        const mandap = await mandapModel.findById(booking.mandapId).lean();
        if (mandap && mandap.address) {
          mandap.address = await mongoose
            .model("Address")
            .findById(mandap.address)
            .lean();
        }
        booking.mandapId = mandap;

        const user = await mongoose
          .model("Users")
          .findById(booking.userId)
          .lean();
        if (user && user.address) {
          user.address = await mongoose
            .model("Address")
            .findById(user.address)
            .lean();
        }
        booking.userId = user;

        booking.photographer = await photographerModel
          .find({ _id: { $in: booking.photographer || [] } })
          .lean();

        booking.caterer = await catererModel
          .find({ _id: { $in: booking.caterer || [] } })
          .lean();

        booking.room = booking.room
          ? await roomModel.findById(booking.room).lean()
          : null;

        const remainingAmount =
          booking.amountPaid < booking.totalAmount
            ? booking.totalAmount - booking.amountPaid
            : 0;

        return { ...booking, remainingAmount };
      })
    );

    return res
      .status(200)
      .json(createSuccessResult({ bookings: populatedBookings }));
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
  try {
    if (!req.user || !mongoose.Types.ObjectId.isValid(req.user._id)) {
      return res.status(400).json(createErrorResult("Invalid user"));
    }
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const bookings = await bookingModel
      .find({ userId: req.user._id, isActive: true })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const populatedBookings = await Promise.all(
      bookings.map(async (booking) => {
        booking.mandapId = await mandapModel.findById(booking.mandapId).populate("address").lean();
        booking.photographer = await photographerModel
          .find({ _id: { $in: booking.photographer || [] } })
          .lean();
        booking.caterer = await catererModel
          .find({ _id: { $in: booking.caterer || [] } })
          .lean();
        booking.room = booking.room
          ? await roomModel.findById(booking.room).lean()
          : null;
        const remainingAmount =
          booking.amountPaid < booking.totalAmount
            ? booking.totalAmount - booking.amountPaid
            : 0;
        return { ...booking, remainingAmount };
      })
    );

    return res
      .status(200)
      .json(createSuccessResult({ bookings: populatedBookings }));
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
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json(createErrorResult("Invalid ID format"));
    }
    const booking = await bookingModel
      .findOne({ _id: id, isActive: true })
      .lean();
    if (!booking) {
      return res
        .status(404)
        .json(createErrorResult("Booking not found or inactive"));
    }

    if (!mongoose.Types.ObjectId.isValid(booking.mandapId)) {
      return res
        .status(400)
        .json(createErrorResult("Invalid mandapId in booking"));
    }

    // Check permissions
    let hasPermission = false;
    if (req.provider) {
      const mandap = await mandapModel
        .findOne({
          _id: booking.mandapId,
          providerId: req.provider._id,
          isActive: true,
        })
        .lean();
      if (mandap) hasPermission = true;
    } else if (
      req.user &&
      booking.userId.toString() === req.user._id.toString()
    ) {
      hasPermission = true;
    }
    if (!hasPermission) {
      return res
        .status(403)
        .json(createErrorResult("Not authorized to perform this action"));
    }

    // Populate references
    booking.mandapId = await mandapModel.findById(booking.mandapId).lean();
    booking.userId = await mongoose
      .model("Users")
      .findById(booking.userId)
      .lean();
    booking.photographer = await photographerModel
      .find({ _id: { $in: booking.photographer || [] } })
      .lean();
    booking.caterer = await catererModel
      .find({ _id: { $in: booking.caterer || [] } })
      .lean();
    booking.room = booking.room
      ? await roomModel.findById(booking.room).lean()
      : null;

    return res.status(200).json(createSuccessResult({ booking }));
  } catch (error) {
    console.error("Error fetching booking by ID:", error);
    if (error.name === "CastError") {
      return res.status(400).json(createErrorResult("Invalid ID format"));
    }
    return res.status(500).json(createErrorResult(error.message));
  }
};

// Completes the remaining payment for a booking with Partial status
exports.completePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentAmount } = req.body;
    const userId = req.user?._id;
    const providerId = req.provider?._id;

    // Validate booking ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json(createErrorResult("Invalid ID format"));
    }

    // Validate payment amount
    if (
      paymentAmount === undefined ||
      isNaN(paymentAmount) ||
      paymentAmount < 0
    ) {
      return res
        .status(400)
        .json(
          createErrorResult(
            "Payment amount does not cover the remaining balance"
          )
        );
    }

    // Find the booking
    const booking = await bookingModel
      .findOne({ _id: id, isActive: true })
      .lean();
    if (!booking) {
      return res
        .status(404)
        .json(createErrorResult("Booking not found or inactive"));
    }

    // Check permissions
    let hasPermission = false;
    if (userId && booking.userId.toString() === userId.toString()) {
      hasPermission = true;
    } else if (providerId) {
      const mandap = await mandapModel
        .findOne({ _id: booking.mandapId, providerId, isActive: true })
        .lean();
      if (mandap) hasPermission = true;
    }
    if (!hasPermission) {
      return res
        .status(403)
        .json(createErrorResult("Not authorized to perform this action"));
    }

    // Check payment status
    if (booking.paymentStatus !== "Partial") {
      return res
        .status(400)
        .json(createErrorResult("Booking payment is not in Partial status"));
    }

    // Calculate remaining amount
    const remainingAmount = booking.totalAmount - booking.amountPaid;
    if (paymentAmount < remainingAmount) {
      return res
        .status(400)
        .json(
          createErrorResult(
            "Payment amount does not cover the remaining balance"
          )
        );
    }

    // Update booking with new payment details
    const updatedBooking = await bookingModel
      .findByIdAndUpdate(
        id,
        {
          amountPaid: booking.amountPaid + paymentAmount,
          paymentStatus: "Completed",
        },
        { new: true, runValidators: true }
      )
      .lean();

    if (!updatedBooking) {
      return res
        .status(404)
        .json(createErrorResult("Booking not found or inactive"));
    }

    return res.status(200).json(
      createSuccessResult({
        message: "Payment completed successfully",
        booking: updatedBooking,
      })
    );
  } catch (error) {
    console.error("Error completing payment:", error);
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
