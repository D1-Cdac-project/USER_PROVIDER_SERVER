const mongoose = require("mongoose");

const { cloudinary } = require("../config/cloudinary");
const { createSuccessResult, createErrorResult } = require("../config/result");

const addressModel = require("../models/addressModel");
const mandapModel = require("../models/mandapModel");
const providerModel = require("../models/providerModel");

// Helper to parse FormData arrays or strings
const parseArrayOrString = (input) => {
  if (Array.isArray(input)) return input;
  if (typeof input === "string") {
    try {
      return JSON.parse(input);
    } catch {
      return input.split(",").map((item) => item.trim());
    }
  }
  return [];
};

// Creates a new mandap with image upload and authorization check
exports.createMandap = async (req, res) => {
  if (!req.provider) {
    return res
      .status(400)
      .json(createErrorResult("Invalid Request: Provider not authenticated"));
  }
  try {
    const provider = await providerModel.findById(req.provider._id);
    if (provider.authorizationStatus !== "approved") {
      return res
        .status(403)
        .json(
          createErrorResult("Unauthorized: Provider status must be approved")
        );
    }

    const {
      mandapName,
      mandapDesc,
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
      fullAddress,
      advancePayment,
    } = req.body;

    const trimmedMandapName =
      typeof mandapName === "string" ? mandapName.trim() : mandapName;
    const trimmedMandapDesc =
      typeof mandapDesc === "string" ? mandapDesc.trim() : mandapDesc;
    const trimmedCity = typeof city === "string" ? city.trim() : city;
    const trimmedState = typeof state === "string" ? state.trim() : state;
    const trimmedPinCode =
      typeof pinCode === "string" ? pinCode.trim() : pinCode;
    const trimmedGuestCapacity =
      typeof guestCapacity === "string" ? guestCapacity.trim() : guestCapacity;
    const trimmedVenuePricing =
      typeof venuePricing === "string"
        ? venuePricing.trim()
        : venuePricing?.toString() || "";
    const trimmedFullAddress =
      typeof fullAddress === "string" ? fullAddress.trim() : fullAddress;

    const requiredFields = {
      mandapName: trimmedMandapName,
      mandapDesc: trimmedMandapDesc,
      city: trimmedCity,
      state: trimmedState,
      pinCode: trimmedPinCode,
      availableDates,
      venueType,
      guestCapacity: trimmedGuestCapacity,
      venuePricing: trimmedVenuePricing,
    };
    const missingRequiredFields = Object.entries(requiredFields)
      .filter(
        ([key, value]) => !value || (key === "venuePricing" && value === "")
      )
      .map(([key]) => key);

    if (missingRequiredFields.length > 0) {
      const optionalFields = {
        penaltyChargesPerHour,
        cancellationPolicy,
        securityDeposit,
        securityDepositType,
        amenities,
        outdoorFacilities,
        paymentOptions,
        isExternalCateringAllowed,
        fullAddress: trimmedFullAddress,
        advancePayment,
      };
      const omittedOptionalFields = Object.entries(optionalFields)
        .filter(([key, value]) => !value)
        .map(([key]) => key);

      const errorMessage = `Missing or invalid required fields: ${missingRequiredFields.join(
        ", "
      )}${
        omittedOptionalFields.length > 0
          ? `. Omitted optional fields: ${omittedOptionalFields.join(", ")}`
          : ""
      }`;
      return res.status(400).json(createErrorResult(errorMessage));
    }

    const parsedAvailableDates = parseArrayOrString(availableDates);
    const parsedVenueType = parseArrayOrString(venueType);
    const parsedAmenities = parseArrayOrString(amenities);
    const parsedOutdoorFacilities = parseArrayOrString(outdoorFacilities);
    const parsedPaymentOptions = parseArrayOrString(paymentOptions);

    if (
      parsedAvailableDates.length &&
      !parsedAvailableDates.every((date) => !isNaN(new Date(date).getTime()))
    ) {
      return res
        .status(400)
        .json(createErrorResult("Invalid date format in availableDates"));
    }

    const numericVenuePricing = Number(trimmedVenuePricing);
    if (isNaN(numericVenuePricing)) {
      return res
        .status(400)
        .json(
          createErrorResult("Invalid venuePricing: Must be a valid number")
        );
    }
    const numericGuestCapacity = Number(trimmedGuestCapacity);
    if (isNaN(numericGuestCapacity)) {
      return res
        .status(400)
        .json(
          createErrorResult("Invalid guestCapacity: Must be a valid number")
        );
    }

    let venueImages = [];
    if (req.files && req.files.length > 0) {
      venueImages = req.files.map((file) => file.path);
    }

    const mandapAddress = await addressModel.create({
      state: trimmedState,
      city: trimmedCity,
      pinCode: trimmedPinCode,
      fullAddress: trimmedFullAddress,
    });

    const mandap = await mandapModel.create({
      mandapName: trimmedMandapName,
      mandapDesc: trimmedMandapDesc,
      providerId: req.provider._id,
      availableDates: parsedAvailableDates,
      venueType: parsedVenueType,
      address: mandapAddress._id,
      penaltyChargesPerHour: Number(penaltyChargesPerHour) || 0,
      cancellationPolicy,
      venueImages,
      guestCapacity: numericGuestCapacity,
      venuePricing: numericVenuePricing,
      securityDeposit: Number(securityDeposit) || 0,
      securityDepositType,
      amenities: parsedAmenities,
      outdoorFacilities: parsedOutdoorFacilities,
      paymentOptions: parsedPaymentOptions,
      isExternalCateringAllowed:
        isExternalCateringAllowed === "true" ||
        isExternalCateringAllowed === true,
      advancePayment: Number(advancePayment) || 0,
    });

    return res
      .status(201)
      .json(createSuccessResult({ message: "Mandap created successfully" }));
  } catch (error) {
    console.error("Error creating mandap:", error);
    return res.status(500).json(createErrorResult(error.message));
  }
};

// Updates a mandap with image handling and authorization check
exports.updateMandap = async (req, res) => {
  if (!req.provider) {
    return res
      .status(400)
      .json(createErrorResult("Invalid Request: Provider not authenticated"));
  }
  try {
    const provider = await providerModel.findById(req.provider._id);
    if (provider.authorizationStatus !== "approved") {
      return res
        .status(403)
        .json(
          createErrorResult("Unauthorized: Provider status must be approved")
        );
    }
    const { mandapId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(mandapId)) {
      return res.status(400).json(createErrorResult("Invalid mandapId"));
    }
    const mandap = await mandapModel.findOne({
      _id: mandapId,
      providerId: req.provider._id,
    });
    if (!mandap) {
      return res
        .status(404)
        .json(createErrorResult("Mandap not found or not owned by provider"));
    }
    const {
      mandapName,
      mandapDesc,
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
      fullAddress,
      advancePayment,
    } = req.body;

    const parsedAvailableDates = availableDates
      ? parseArrayOrString(availableDates)
      : mandap.availableDates;
    const parsedVenueType = venueType
      ? parseArrayOrString(venueType)
      : mandap.venueType;
    const parsedAmenities = amenities
      ? parseArrayOrString(amenities)
      : mandap.amenities;
    const parsedOutdoorFacilities = outdoorFacilities
      ? parseArrayOrString(outdoorFacilities)
      : mandap.outdoorFacilities;
    const parsedPaymentOptions = paymentOptions
      ? parseArrayOrString(paymentOptions)
      : mandap.paymentOptions;

    if (
      parsedAvailableDates.length &&
      !parsedAvailableDates.every((date) => !isNaN(new Date(date).getTime()))
    ) {
      return res
        .status(400)
        .json(createErrorResult("Invalid date format in availableDates"));
    }

    let addressId = mandap.address;
    const isAddressProvided = city || state || pinCode || fullAddress;
    if (isAddressProvided) {
      if (!city || !state || !pinCode) {
        return res
          .status(400)
          .json(
            createErrorResult(
              "All address fields are required if any are provided"
            )
          );
      }
      if (addressId) {
        await addressModel.findByIdAndUpdate(
          addressId,
          { city, state, pinCode, fullAddress },
          { new: true, runValidators: true }
        );
      } else {
        const newAddress = await addressModel.create({
          city,
          state,
          pinCode,
          fullAddress,
        });
        addressId = newAddress._id;
      }
    }

    let venueImages = mandap.venueImages;
    if (req.files && req.files.length > 0) {
      for (const imageUrl of mandap.venueImages) {
        const publicId = imageUrl.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`BookMyMandap/${publicId}`);
      }
      venueImages = req.files.map((file) => file.path);
    }

    const updatedMandap = await mandapModel
      .findByIdAndUpdate(
        mandapId,
        {
          mandapName: mandapName || mandap.mandapName,
          mandapDesc: mandapDesc || mandap.mandapDesc,
          availableDates: parsedAvailableDates,
          venueType: parsedVenueType,
          address: addressId,
          penaltyChargesPerHour:
            Number(penaltyChargesPerHour) || mandap.penaltyChargesPerHour,
          cancellationPolicy: cancellationPolicy || mandap.cancellationPolicy,
          venueImages,
          guestCapacity: Number(guestCapacity) || mandap.guestCapacity,
          venuePricing: Number(venuePricing) || mandap.venuePricing,
          securityDeposit: Number(securityDeposit) || mandap.securityDeposit,
          securityDepositType:
            securityDepositType || mandap.securityDepositType,
          amenities: parsedAmenities,
          outdoorFacilities: parsedOutdoorFacilities,
          paymentOptions: parsedPaymentOptions,
          isExternalCateringAllowed:
            isExternalCateringAllowed === "true" ||
            isExternalCateringAllowed === true
              ? true
              : isExternalCateringAllowed === "false" ||
                isExternalCateringAllowed === false
              ? false
              : mandap.isExternalCateringAllowed,
          advancePayment: Number(advancePayment) || mandap.advancePayment,
        },
        { new: true, runValidators: true }
      )
      .populate("address");

    return res.status(200).json(
      createSuccessResult({
        message: "Mandap updated successfully",
      })
    );
  } catch (error) {
    console.error("Error updating mandap:", error);
    return res.status(500).json(createErrorResult(error.message));
  }
};
// Soft deletes a mandap with authorization check
exports.deleteMandap = async (req, res) => {
  if (!req.provider) {
    return res
      .status(400)
      .json(createErrorResult("Invalid Request: Provider not authenticated"));
  }
  try {
    const provider = await providerModel.findById(req.provider._id);
    if (provider.authorizationStatus !== "approved") {
      return res
        .status(403)
        .json(
          createErrorResult("Unauthorized: Provider status must be approved")
        );
    }
    const { mandapId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(mandapId)) {
      return res.status(400).json(createErrorResult("Invalid mandapId"));
    }
    const mandap = await mandapModel.findOne({
      _id: mandapId,
      providerId: req.provider._id,
    });
    if (!mandap) {
      return res
        .status(404)
        .json(createErrorResult("Mandap not found or not owned by provider"));
    }
    await mandapModel.updateOne(
      { _id: mandapId },
      { $set: { isActive: false } }
    );
    return res
      .status(200)
      .json(createSuccessResult({ message: "Mandap deleted successfully" }));
  } catch (error) {
    console.error("Error deleting mandap:", error);
    return res.status(500).json(createErrorResult(error.message));
  }
};

// Fetches all mandaps for provider with authorization check
exports.getAllMandapByProviderID = async (req, res) => {
  if (!req.provider) {
    return res
      .status(400)
      .json(createErrorResult("Invalid Request: Provider not authenticated"));
  }
  try {
    const provider = await providerModel.findById(req.provider._id);
    if (provider.authorizationStatus !== "approved") {
      return res
        .status(403)
        .json(
          createErrorResult("Unauthorized: Provider status must be approved")
        );
    }
    const mandaps = await mandapModel
      .find({ providerId: req.provider._id, isActive: true })
      .populate("address")
      .lean();
    return res.status(200).json(
      createSuccessResult({
        message: "Mandaps fetched successfully",
        mandaps,
      })
    );
  } catch (error) {
    console.error("Error fetching mandaps by provider ID:", error);
    return res.status(500).json(createErrorResult(error.message));
  }
};

// Fetches all active mandaps
exports.getAllMandaps = async (req, res) => {
  try {
    const mandaps = await mandapModel
      .find({ isActive: true })
      .populate("address providerId")
      .lean();
    const mandapsWithProviderName = await Promise.all(
      mandaps.map(async (mandap) => {
        const provider = await providerModel
          .findById(mandap.providerId)
          .select("name")
          .lean();
        return {
          ...mandap,
          providerName: provider ? provider.name : "Unknown Provider",
        };
      })
    );
    return res
      .status(200)
      .json(createSuccessResult({ mandaps: mandapsWithProviderName }));
  } catch (error) {
    console.error("Error fetching all mandaps:", error);
    return res.status(500).json(createErrorResult(error.message));
  }
};

// Searches mandaps by query
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
          ...(state && { state: { $regex: state, $options: "i" } }),
        })
        .distinct("_id");
    }
    if (venueType) {
      searchCriteria.venueType = {
        $in: Array.isArray(venueType) ? venueType : [venueType],
      };
    }
    if (minPrice || maxPrice) {
      searchCriteria.venuePricing = {
        ...(minPrice && { $gte: Number(minPrice) }),
        ...(maxPrice && { $lte: Number(maxPrice) }),
      };
    }
    const mandaps = await mandapModel
      .find(searchCriteria)
      .populate("address")
      .lean();
    return res.status(200).json(createSuccessResult({ mandaps }));
  } catch (error) {
    console.error("Error searching mandaps:", error);
    return res.status(500).json(createErrorResult(error.message));
  }
};

// Filters mandaps by criteria
exports.getMandapByFilter = async (req, res) => {
  try {
    const { city, state, venueType, minPrice, maxPrice, amenities } = req.body;
    const filterCriteria = { isActive: true };
    if (city || state) {
      filterCriteria.address = await addressModel
        .find({
          ...(city && { city: { $regex: city, $options: "i" } }),
          ...(state && { state: { $regex: state, $options: "i" } }),
        })
        .distinct("_id");
    }
    if (venueType) {
      filterCriteria.venueType = {
        $in: Array.isArray(venueType) ? venueType : [venueType],
      };
    }
    if (minPrice || maxPrice) {
      filterCriteria.venuePricing = {
        ...(minPrice && { $gte: Number(minPrice) }),
        ...(maxPrice && { $lte: Number(maxPrice) }),
      };
    }
    if (amenities) {
      filterCriteria.amenities = {
        $all: Array.isArray(amenities)
          ? amenities
          : parseArrayOrString(amenities),
      };
    }
    const mandaps = await mandapModel
      .find(filterCriteria)
      .populate("address")
      .lean();
    return res.status(200).json(createSuccessResult({ mandaps }));
  } catch (error) {
    console.error("Error filtering mandaps:", error);
    return res.status(500).json(createErrorResult(error.message));
  }
};

// Fetches a mandap by ID
exports.getMandapByID = async (req, res) => {
  try {
    const { mandapId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(mandapId)) {
      return res.status(400).json(createErrorResult("Invalid mandapId"));
    }
    const mandap = await mandapModel
      .findById(mandapId)
      .populate("address providerId")
      .lean();
    if (!mandap || !mandap.isActive) {
      return res
        .status(404)
        .json(createErrorResult("Mandap not found or inactive"));
    }
    const provider = await providerModel
      .findById(mandap.providerId)
      .select("name")
      .lean();
    const mandapWithProviderName = {
      ...mandap,
      providerName: provider ? provider.name : "Unknown Provider",
    };
    return res
      .status(200)
      .json(createSuccessResult({ mandap: mandapWithProviderName }));
  } catch (error) {
    console.error("Error fetching mandap by ID:", error);
    return res.status(500).json(createErrorResult(error.message));
  }
};
