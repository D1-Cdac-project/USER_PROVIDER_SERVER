const { cloudinary } = require("../config/cloudinary");
const addressModel = require("../models/addressModel");
const mandapModel = require("../models/mandapModel");
const { createSuccessResult, createErrorResult } = require("../config/result");

exports.createMandap = async (req, res) => {
  if (!req.provider) {
    return res.status(400).json(createErrorResult("Invalid Request"));
  }
  try {
    const {
      mandapName,
      fullAddress,
      city,
      state,
      pinCode,
      availableDates,
      venueType,
      penaltyChargesPerHour,
      cancellationPolicy,
      guestCapacity,
      venuePricing,
      securityDeposit,
      securityDepositType,
      amenities,
      outdoorFacilities,
      paymentOptions,
      isExternalCateringAllowed,
    } = req.body;

    let venueImages = [];
    if (req.files && req.files.length > 0) {
      venueImages = req.files.map((file) => file.path);
    }

    const mandapAddress = await addressModel.create({
      state,
      city,
      pinCode,
      fullAddress,
    });

    await mandapModel.create({
      mandapName,
      providerId: req.provider._id,
      availableDates,
      venueType,
      address: mandapAddress._id,
      penaltyChargesPerHour,
      cancellationPolicy,
      venueImages,
      guestCapacity,
      venuePricing,
      securityDeposit,
      securityDepositType,
      amenities,
      outdoorFacilities,
      paymentOptions,
      isExternalCateringAllowed,
    });

    return res.status(201).json(
      createSuccessResult({
        message: "Mandap created successfully",
      })
    );
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};

exports.getAllMandapByProviderID = async (req, res) => {
  if (!req.provider) {
    return res.status(400).json(createErrorResult("Invalid Request"));
  }
  try {
    const mandaps = await mandapModel.find({
      providerId: req.provider._id,
      isActive: true,
    });
    return res.status(200).json(
      createSuccessResult({
        message: "Mandaps fetched successfully",
        mandaps,
      })
    );
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};

exports.updateMandap = async (req, res) => {
  if (!req.provider) {
    return res.status(400).json(createErrorResult("Invalid Request"));
  }
  try {
    const { mandapId } = req.params;
    const mandap = await mandapModel.findById(mandapId);
    if (!mandap) {
      return res.status(404).json(createErrorResult("Mandap not found"));
    }

    const {
      mandapName,
      availableDates,
      venueType,
      address,
      penaltyChargesPerHour,
      cancellationPolicy,
      guestCapacity,
      venuePricing,
      securityDeposit,
      securityDepositType,
      amenities,
      outdoorFacilities,
      paymentOptions,
      isExternalCateringAllowed,
    } = req.body;

    let venueImages = mandap.venueImages;
    if (req.files && req.files.length > 0) {
      for (const imageUrl of mandap.venueImages) {
        const publicId = imageUrl.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`BookMyMandap/${publicId}`);
      }
      venueImages = req.files.map((file) => file.path);
    }

    await mandapModel.findByIdAndUpdate(
      mandapId,
      {
        mandapName,
        availableDates,
        venueType,
        address,
        penaltyChargesPerHour,
        cancellationPolicy,
        venueImages,
        guestCapacity,
        venuePricing,
        securityDeposit,
        securityDepositType,
        amenities,
        outdoorFacilities,
        paymentOptions,
        isExternalCateringAllowed,
      },
      { new: true }
    );

    return res.status(200).json(
      createSuccessResult({
        message: "Mandap updated successfully",
      })
    );
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};

exports.deleteMandap = async (req, res) => {
  if (!req.provider) {
    return res.status(400).json(createErrorResult("Invalid Request"));
  }
  try {
    const { mandapId } = req.params;
    const mandap = await mandapModel.findOne({
      _id: mandapId,
      providerId: req.provider._id,
    });
    if (!mandap) {
      return res.status(404).json(createErrorResult("Mandap not found"));
    }
    await mandapModel.updateOne(
      { _id: mandapId },
      { $set: { isActive: false } }
    );
    return res.status(200).json(
      createSuccessResult({
        message: "Mandap deleted successfully",
      })
    );
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};

exports.getAllMandaps = async (req, res) => {
  try {
    const mandaps = await mandapModel
      .find({ isActive: true })
      .populate("address");
    return res.status(200).json(createSuccessResult({ mandaps }));
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};

exports.searchMandap = async (req, res) => {
  try {
    const { query, city, state, venueType, minPrice, maxPrice } = req.query;
    const searchCriteria = { isActive: true };

    if (query) {
      searchCriteria.mandapName = { $regex: query, $options: "i" };
    }
    if (city || state) {
      searchCriteria.address = await addressModel
        .find({
          ...(city && { city: { $regex: city, $options: "i" } }),
          ...(state && { state }),
        })
        .distinct("_id");
    }
    if (venueType) {
      searchCriteria.venueType = venueType;
    }
    if (minPrice || maxPrice) {
      searchCriteria.venuePricing = {
        ...(minPrice && { $gte: Number(minPrice) }),
        ...(maxPrice && { $lte: Number(maxPrice) }),
      };
    }

    const mandaps = await mandapModel.find(searchCriteria).populate("address");
    return res.status(200).json(createSuccessResult({ mandaps }));
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};

exports.getMandapByFilter = async (req, res) => {
  try {
    const { city, state, venueType, minPrice, maxPrice, amenities } = req.body;
    const filterCriteria = { isActive: true };

    if (city || state) {
      filterCriteria.address = await addressModel
        .find({
          ...(city && { city: { $regex: city, $options: "i" } }),
          ...(state && { state }),
        })
        .distinct("_id");
    }
    if (venueType) {
      filterCriteria.venueType = { $in: venueType };
    }
    if (minPrice || maxPrice) {
      filterCriteria.venuePricing = {
        ...(minPrice && { $gte: Number(minPrice) }),
        ...(maxPrice && { $lte: Number(maxPrice) }),
      };
    }
    if (amenities) {
      filterCriteria.amenities = { $all: amenities };
    }

    const mandaps = await mandapModel.find(filterCriteria).populate("address");
    return res.status(200).json(createSuccessResult({ mandaps }));
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};

exports.getMandapByID = async (req, res) => {
  try {
    const { mandapId } = req.params;
    const mandap = await mandapModel.findById(mandapId).populate("address");
    if (!mandap || !mandap.isActive) {
      return res.status(404).json(createErrorResult("Mandap not found"));
    }
    return res.status(200).json(createSuccessResult({ mandap }));
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};
