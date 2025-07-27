const mongoose = require("mongoose");

const catererModel = require("../models/catererModel");
const mandapModel = require("../models/mandapModel");

const { cloudinary } = require("../config/cloudinary");
const { createErrorResult, createSuccessResult } = require("../config/result");

// Creates a new caterer with Cloudinary image upload
exports.addCaterer = async (req, res) => {
  if (!req.provider) {
    return res
      .status(400)
      .json(createErrorResult("Invalid Request: Provider not authenticated"));
  }
  try {
    const {
      mandapId,
      catererName,
      menuCategory,
      foodType,
      isCustomizable,
      customizableItems,
      hasTastingSession,
    } = req.body;

    // Validate mandapId
    if (!mongoose.Types.ObjectId.isValid(mandapId)) {
      return res.status(400).json(createErrorResult("Invalid mandapId format"));
    }

    const mandap = await mandapModel.findOne({
      _id: mandapId,
      providerId: req.provider._id,
      isActive: true,
    });
    if (!mandap) {
      return res
        .status(404)
        .json(createErrorResult("Mandap not found or unauthorized"));
    }

    // Parse menuCategory
    let parsedMenuCategory;
    if (typeof menuCategory === "string") {
      try {
        parsedMenuCategory = JSON.parse(menuCategory);
      } catch (e) {
        return res
          .status(400)
          .json(
            createErrorResult(
              "Invalid JSON format for menuCategory: " + e.message
            )
          );
      }
    } else {
      parsedMenuCategory = menuCategory;
    }

    // Validate required menuCategory fields
    if (
      !parsedMenuCategory.category ||
      !parsedMenuCategory.menuItems ||
      !parsedMenuCategory.pricePerPlate
    ) {
      return res
        .status(400)
        .json(createErrorResult("Missing required menuCategory fields"));
    }

    // Parse customizableItems
    let parsedCustomizableItems = [];
    if (isCustomizable) {
      if (!customizableItems || typeof customizableItems !== "string") {
        return res
          .status(400)
          .json(
            createErrorResult(
              "Customizable items are required when isCustomizable is true"
            )
          );
      }
      try {
        parsedCustomizableItems = JSON.parse(customizableItems);
        if (
          !Array.isArray(parsedCustomizableItems) ||
          parsedCustomizableItems.length === 0
        ) {
          throw new Error("customizableItems must be a non-empty array");
        }
      } catch (e) {
        return res
          .status(400)
          .json(
            createErrorResult(
              "Invalid JSON format for customizableItems: " + e.message
            )
          );
      }
    }

    // Handle image upload
    let categoryImage;
    if (req.file) {
      categoryImage = req.file.path;
    }

    await catererModel.create({
      mandapId,
      catererName,
      menuCategory: { ...parsedMenuCategory, categoryImage },
      foodType,
      isCustomizable,
      customizableItems: parsedCustomizableItems,
      hasTastingSession,
    });
    return res
      .status(201)
      .json(createSuccessResult({ message: "Caterer added successfully" }));
  } catch (error) {
    console.error("Error adding caterer:", error);
    return res.status(500).json(createErrorResult(error.message));
  }
};

// Updates a caterer with Cloudinary image handling
exports.updateCaterer = async (req, res) => {
  if (!req.provider) {
    return res
      .status(400)
      .json(createErrorResult("Invalid Request: Provider not authenticated"));
  }
  try {
    const { catererId } = req.params;
    const {
      mandapId,
      catererName,
      menuCategory,
      foodType,
      isCustomizable,
      customizableItems,
      hasTastingSession,
    } = req.body;

    const caterer = await catererModel.findById(catererId);
    if (!caterer) {
      return res.status(404).json(createErrorResult("Caterer not found"));
    }

    // Validate mandapId if provided
    let updatedMandapId = caterer.mandapId;
    if (mandapId) {
      if (!mongoose.Types.ObjectId.isValid(mandapId)) {
        return res
          .status(400)
          .json(createErrorResult("Invalid mandapId format"));
      }
      const mandap = await mandapModel.findOne({
        _id: mandapId,
        providerId: req.provider._id,
        isActive: true,
      });
      if (!mandap) {
        return res
          .status(404)
          .json(createErrorResult("Mandap not found or unauthorized"));
      }
      updatedMandapId = mandapId;
    }

    // Parse menuCategory
    let parsedMenuCategory = caterer.menuCategory;
    if (menuCategory) {
      if (typeof menuCategory === "string") {
        try {
          parsedMenuCategory = JSON.parse(menuCategory);
        } catch (e) {
          return res
            .status(400)
            .json(
              createErrorResult(
                "Invalid JSON format for menuCategory: " + e.message
              )
            );
        }
      } else {
        parsedMenuCategory = menuCategory;
      }
      // Validate required menuCategory fields
      if (
        !parsedMenuCategory.category ||
        !parsedMenuCategory.menuItems ||
        !parsedMenuCategory.pricePerPlate
      ) {
        return res
          .status(400)
          .json(createErrorResult("Missing required menuCategory fields"));
      }
    }

    // Parse customizableItems
    let parsedCustomizableItems = caterer.customizableItems;
    if (isCustomizable !== undefined) {
      if (
        isCustomizable &&
        (!customizableItems || typeof customizableItems !== "string")
      ) {
        return res
          .status(400)
          .json(
            createErrorResult(
              "Customizable items are required when isCustomizable is true"
            )
          );
      }
      if (isCustomizable && customizableItems) {
        try {
          parsedCustomizableItems = JSON.parse(customizableItems);
          if (
            !Array.isArray(parsedCustomizableItems) ||
            parsedCustomizableItems.length === 0
          ) {
            throw new Error("customizableItems must be a non-empty array");
          }
        } catch (e) {
          return res
            .status(400)
            .json(
              createErrorResult(
                "Invalid JSON format for customizableItems: " + e.message
              )
            );
        }
      } else {
        parsedCustomizableItems = [];
      }
    }

    // Handle image update
    let categoryImage = caterer.menuCategory.categoryImage;
    if (req.file) {
      if (categoryImage) {
        const publicId = categoryImage.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`BookMyMandap/${publicId}`);
      }
      categoryImage = req.file.path; // New Cloudinary URL
    }

    await catererModel.findByIdAndUpdate(
      catererId,
      {
        mandapId: updatedMandapId,
        catererName: catererName || caterer.catererName,
        menuCategory: { ...parsedMenuCategory, categoryImage },
        foodType: foodType || caterer.foodType,
        isCustomizable:
          isCustomizable !== undefined
            ? isCustomizable
            : caterer.isCustomizable,
        customizableItems: parsedCustomizableItems,
        hasTastingSession:
          hasTastingSession !== undefined
            ? hasTastingSession
            : caterer.hasTastingSession,
      },
      { new: true, runValidators: true }
    );
    return res
      .status(200)
      .json(createSuccessResult({ message: "Caterer updated successfully" }));
  } catch (error) {
    console.error("Error updating caterer:", error);
    return res.status(500).json(createErrorResult(error.message));
  }
};

// Soft deletes a caterer with Cloudinary image cleanup
exports.deleteCaterer = async (req, res) => {
  if (!req.provider) {
    return res
      .status(400)
      .json(createErrorResult("Invalid Request: Provider not authenticated"));
  }
  try {
    const { catererId } = req.params;
    const caterer = await catererModel.findById(catererId);
    if (!caterer) {
      return res.status(404).json(createErrorResult("Caterer not found"));
    }
    const mandap = await mandapModel.findOne({
      _id: caterer.mandapId,
      providerId: req.provider._id,
    });
    if (!mandap) {
      return res
        .status(403)
        .json(
          createErrorResult("Unauthorized: Provider does not own this mandap")
        );
    }
    if (caterer.menuCategory.categoryImage) {
      const publicId = caterer.menuCategory.categoryImage
        .split("/")
        .pop()
        .split(".")[0];
      await cloudinary.uploader.destroy(`BookMyMandap/${publicId}`);
    }
    await catererModel.findByIdAndUpdate(catererId, { isActive: false });
    return res
      .status(200)
      .json(createSuccessResult({ message: "Caterer deleted successfully" }));
  } catch (error) {
    console.error("Error deleting caterer:", error);
    return res.status(500).json(createErrorResult(error.message));
  }
};

// Fetches all active caterers for provider’s mandaps
exports.getAllCaterer = async (req, res) => {
  if (!req.provider) {
    return res
      .status(400)
      .json(createErrorResult("Invalid Request: Provider not authenticated"));
  }
  try {
    const mandaps = await mandapModel
      .find({ providerId: req.provider._id, isActive: true })
      .distinct("_id");
    if (!mandaps.length) {
      return res.status(404).json(createErrorResult("No mandaps found"));
    }
    const caterers = await catererModel
      .find({ mandapId: { $in: mandaps }, isActive: true })
      .populate("mandapId");
    if (!caterers.length) {
      return res.status(404).json(createErrorResult("No caterers found"));
    }
    return res.status(200).json(
      createSuccessResult({
        caterers,
        message: "Caterers fetched successfully",
      })
    );
  } catch (error) {
    console.error("Error fetching caterers:", error);
    return res.status(500).json(createErrorResult(error.message));
  }
};

// Fetches a single caterer by ID
exports.getCatererById = async (req, res) => {
  if (!req.provider) {
    return res
      .status(400)
      .json(createErrorResult("Invalid Request: Provider not authenticated"));
  }
  try {
    const { catererId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(catererId)) {
      return res.status(400).json(createErrorResult("Invalid catererId"));
    }
    const caterer = await catererModel.findById(catererId).populate("mandapId");
    if (!caterer || !caterer.isActive) {
      return res
        .status(404)
        .json(createErrorResult("Caterer not found or inactive"));
    }
    const mandap = await mandapModel.findOne({
      _id: caterer.mandapId,
      providerId: req.provider._id,
    });
    if (!mandap) {
      return res
        .status(403)
        .json(
          createErrorResult("Unauthorized: Provider does not own this mandap")
        );
    }
    return res.status(200).json(
      createSuccessResult({
        caterer,
        message: "Caterer fetched successfully",
      })
    );
  } catch (error) {
    console.error("Error fetching caterer by ID:", error);
    return res.status(500).json(createErrorResult(error.message));
  }
};

// Fetches all active caterers by mandap ID
exports.getAllCaterersByMandapId = async (req, res) => {
  try {
    const { mandapId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(mandapId)) {
      return res.status(400).json(createErrorResult("Invalid mandapId"));
    }
    const mandap = await mandapModel.findById(mandapId);
    if (!mandap || !mandap.isActive) {
      return res
        .status(404)
        .json(createErrorResult("Mandap not found or inactive"));
    }
    const caterers = await catererModel
      .find({
        mandapId,
        isActive: true,
      })
      .populate("mandapId");
    return res.status(200).json(
      createSuccessResult({
        caterers,
        message: "Caterers fetched successfully",
      })
    );
  } catch (error) {
    console.error("Error fetching caterers by mandap ID:", error);
    return res.status(500).json(createErrorResult(error.message));
  }
};
