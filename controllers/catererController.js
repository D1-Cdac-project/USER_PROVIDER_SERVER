const mongoose = require("mongoose");
const catererModel = require("../models/catererModel");
const mandapModel = require("../models/mandapModel");
const { cloudinary } = require("../config/cloudinary");
const { createErrorResult, createSuccessResult } = require("../config/result");

// Creates a new caterer with Cloudinary image uploads for menuCategories
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
      menuCategories,
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

    // Parse menuCategories
    let parsedMenuCategories;
    if (typeof menuCategories === "string") {
      try {
        parsedMenuCategories = JSON.parse(menuCategories);
      } catch (e) {
        return res
          .status(400)
          .json(
            createErrorResult(
              "Invalid JSON format for menuCategories: " + e.message
            )
          );
      }
    } else {
      parsedMenuCategories = menuCategories;
    }

    // Validate menuCategories array
    if (
      !Array.isArray(parsedMenuCategories) ||
      parsedMenuCategories.length === 0
    ) {
      return res
        .status(400)
        .json(createErrorResult("menuCategories must be a non-empty array"));
    }

    // Validate each menuCategory
    for (const category of parsedMenuCategories) {
      if (
        !category.category ||
        !category.menuItems ||
        !category.pricePerPlate
      ) {
        return res
          .status(400)
          .json(createErrorResult("Missing required menuCategory fields"));
      }
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

    // Handle image uploads for each menuCategory
    const uploadedImages = req.files || [];
    if (uploadedImages.length > parsedMenuCategories.length) {
      return res
        .status(400)
        .json(
          createErrorResult(
            "Number of images cannot exceed number of menu categories"
          )
        );
    }

    const menuCategoriesWithImages = await Promise.all(
      parsedMenuCategories.map(async (category, index) => {
        const file = uploadedImages[index];
        let categoryImage = category.categoryImage || "";
        if (file) {
          const result = await cloudinary.uploader.upload(file.path, {
            folder: "BookMyMandap",
          });
          categoryImage = result.secure_url;
        }
        return { ...category, categoryImage };
      })
    );

    await catererModel.create({
      mandapId,
      catererName,
      menuCategory: menuCategoriesWithImages,
      foodType,
      isCustomizable,
      customizableItems: parsedCustomizableItems,
      hasTastingSession,
      isActive: true,
    });

    return res
      .status(201)
      .json(createSuccessResult({ message: "Caterer added successfully" }));
  } catch (error) {
    console.error("Error adding caterer:", error);
    return res.status(500).json(createErrorResult(error.message));
  }
};

// Updates a caterer with Cloudinary image handling for menuCategories
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
      menuCategories,
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

    // Parse menuCategories
    let parsedMenuCategories = caterer.menuCategory;
    if (menuCategories) {
      if (typeof menuCategories === "string") {
        try {
          parsedMenuCategories = JSON.parse(menuCategories);
        } catch (e) {
          return res
            .status(400)
            .json(
              createErrorResult(
                "Invalid JSON format for menuCategories: " + e.message
              )
            );
        }
      } else {
        parsedMenuCategories = menuCategories;
      }
      // Validate each menuCategory
      for (const category of parsedMenuCategories) {
        if (
          !category.category ||
          !category.menuItems ||
          !category.pricePerPlate
        ) {
          return res
            .status(400)
            .json(createErrorResult("Missing required menuCategory fields"));
        }
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

    // Handle image updates for each menuCategory
    const uploadedImages = req.files || [];
    const menuCategoriesWithImages = await Promise.all(
      parsedMenuCategories.map(async (category, index) => {
        const file = uploadedImages[index];
        let categoryImage = category.categoryImage || "";
        if (file) {
          // Delete old image if it exists
          if (category.categoryImage) {
            const publicId = category.categoryImage
              .split("/")
              .pop()
              .split(".")[0];
            await cloudinary.uploader.destroy(`BookMyMandap/${publicId}`);
          }
          const result = await cloudinary.uploader.upload(file.path, {
            folder: "BookMyMandap",
          });
          categoryImage = result.secure_url;
        }
        return { ...category, categoryImage };
      })
    );

    await catererModel.findByIdAndUpdate(
      catererId,
      {
        mandapId: updatedMandapId,
        catererName: catererName || caterer.catererName,
        menuCategory: menuCategoriesWithImages,
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
        isActive: true,
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
    // Delete all category images
    for (const category of caterer.menuCategory) {
      if (category.categoryImage) {
        const publicId = category.categoryImage.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`BookMyMandap/${publicId}`);
      }
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
