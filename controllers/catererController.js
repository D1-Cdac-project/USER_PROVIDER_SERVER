const mongoose = require("mongoose");
const catererModel = require("../models/catererModel");
const mandapModel = require("../models/mandapModel");
const { cloudinary } = require("../config/cloudinary");
const { createErrorResult, createSuccessResult } = require("../config/result");

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

    // Validate menuCategory array
    if (!Array.isArray(parsedMenuCategory) || parsedMenuCategory.length === 0) {
      return res
        .status(400)
        .json(createErrorResult("menuCategory must be a non-empty array"));
    }

    // Validate each menuCategory
    for (const category of parsedMenuCategory) {
      if (
        !category.category ||
        !category.menuItems ||
        !category.pricePerPlate ||
        !["Basic", "Standard", "Premium", "Luxury"].includes(category.category)
      ) {
        return res
          .status(400)
          .json(createErrorResult("Invalid or missing menuCategory fields"));
      }
    }

    // Parse and validate foodType
    let parsedFoodType;
    if (typeof foodType === "string") {
      try {
        parsedFoodType = JSON.parse(foodType);
      } catch (e) {
        return res
          .status(400)
          .json(
            createErrorResult("Invalid JSON format for foodType: " + e.message)
          );
      }
    } else {
      parsedFoodType = foodType;
    }
    if (
      !Array.isArray(parsedFoodType) ||
      parsedFoodType.length === 0 ||
      !parsedFoodType.every((type) =>
        ["Veg", "Non-Veg", "Both", "Jain"].includes(type)
      )
    ) {
      return res
        .status(400)
        .json(
          createErrorResult("foodType must be a non-empty array of valid types")
        );
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
          parsedCustomizableItems.length === 0 ||
          !parsedCustomizableItems.every(
            (item) => item.itemName && item.itemPrice
          )
        ) {
          return res
            .status(400)
            .json(createErrorResult("Invalid customizableItems format"));
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
    if (uploadedImages.length > parsedMenuCategory.length) {
      return res
        .status(400)
        .json(
          createErrorResult(
            "Number of images cannot exceed number of menu categories"
          )
        );
    }

    const menuCategoryWithImages = await Promise.all(
      parsedMenuCategory.map(async (category, index) => {
        const file = uploadedImages.find(
          (f) => f.fieldname === `categoryImage[${index}]`
        );
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
      menuCategory: menuCategoryWithImages,
      foodType: parsedFoodType,
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

    console.log("Update request body:", req.body);
    console.log("Update request files:", req.files);

    // Validate caterer existence
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
      if (
        !Array.isArray(parsedMenuCategory) ||
        parsedMenuCategory.length === 0
      ) {
        return res
          .status(400)
          .json(createErrorResult("menuCategory must be a non-empty array"));
      }
      for (const category of parsedMenuCategory) {
        if (
          !category.category ||
          !category.menuItems ||
          !category.pricePerPlate ||
          !["Basic", "Standard", "Premium", "Luxury"].includes(
            category.category
          )
        ) {
          return res
            .status(400)
            .json(createErrorResult("Invalid or missing menuCategory fields"));
        }
      }
    }

    // Parse and validate foodType
    let parsedFoodType = caterer.foodType;
    if (foodType) {
      if (typeof foodType === "string") {
        try {
          parsedFoodType = JSON.parse(foodType);
        } catch (e) {
          return res
            .status(400)
            .json(
              createErrorResult(
                "Invalid JSON format for foodType: " + e.message
              )
            );
        }
      } else {
        parsedFoodType = foodType;
      }
      if (
        !Array.isArray(parsedFoodType) ||
        parsedFoodType.length === 0 ||
        !parsedFoodType.every((type) =>
          ["Veg", "Non-Veg", "Both", "Jain"].includes(type)
        )
      ) {
        return res
          .status(400)
          .json(
            createErrorResult(
              "foodType must be a non-empty array of valid types"
            )
          );
      }
    }

    // Parse customizableItems
    let parsedCustomizableItems = caterer.customizableItems;
    if (isCustomizable !== undefined) {
      if (isCustomizable) {
        if (!customizableItems || typeof customizableItems === "string") {
          try {
            parsedCustomizableItems = customizableItems
              ? JSON.parse(customizableItems)
              : [];
            if (
              parsedCustomizableItems.length > 0 &&
              !parsedCustomizableItems.every(
                (item) => item.itemName && item.itemPrice
              )
            ) {
              return res
                .status(400)
                .json(createErrorResult("Invalid customizableItems format"));
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
          parsedCustomizableItems = customizableItems || [];
        }
      } else {
        parsedCustomizableItems = [];
      }
    }

    // Handle image updates for each menuCategory
    const uploadedImages = req.files || [];
    const menuCategoryWithImages = await Promise.all(
      parsedMenuCategory.map(async (category, index) => {
        const file = uploadedImages.find(
          (f) => f.fieldname === `categoryImage[${index}]`
        );
        let categoryImage =
          category.categoryImage ||
          caterer.menuCategory[index]?.categoryImage ||
          "";
        if (!categoryImage && caterer.menuCategory[index]?.categoryImage) {
          // Delete old image if removed
          const publicId = caterer.menuCategory[index].categoryImage
            .split("/")
            .pop()
            .split(".")[0];
          await cloudinary.uploader.destroy(`BookMyMandap/${publicId}`);
        } else if (file) {
          // Delete old image if exists and upload new one
          if (caterer.menuCategory[index]?.categoryImage) {
            const publicId = caterer.menuCategory[index].categoryImage
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
        menuCategory: menuCategoryWithImages,
        foodType: parsedFoodType,
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
