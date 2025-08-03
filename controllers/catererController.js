const mongoose = require("mongoose");
const { cloudinary } = require("../config/cloudinary");
const { createErrorResult, createSuccessResult } = require("../config/result");
const catererModel = require("../models/catererModel");
const mandapModel = require("../models/mandapModel");

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
      about,
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
    if (!menuCategory) {
      return res
        .status(400)
        .json(createErrorResult("menuCategory is required"));
    }
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
    if (parsedMenuCategory.length > 4) {
      return res
        .status(400)
        .json(
          createErrorResult(
            "menuCategory cannot have more than 4 entries (Basic, Standard, Premium, Luxury)"
          )
        );
    }

    // Validate each menuCategory
    for (const category of parsedMenuCategory) {
      if (
        !category.category ||
        !category.menuItems ||
        !Array.isArray(category.menuItems) ||
        category.menuItems.length === 0 ||
        !category.pricePerPlate ||
        !["Basic", "Standard", "Premium", "Luxury"].includes(category.category)
      ) {
        return res
          .status(400)
          .json(createErrorResult("Invalid or missing menuCategory fields"));
      }
      if (
        !category.menuItems.every(
          (item) => item.itemName && item.itemPrice !== undefined
        )
      ) {
        return res
          .status(400)
          .json(
            createErrorResult("Each menuItem must have itemName and itemPrice")
          );
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
    if (isCustomizable === "true" || isCustomizable === true) {
      if (!customizableItems) {
        return res
          .status(400)
          .json(
            createErrorResult(
              "Customizable items are required when isCustomizable is true"
            )
          );
      }
      try {
        parsedCustomizableItems =
          typeof customizableItems === "string"
            ? JSON.parse(customizableItems)
            : customizableItems;
        if (
          !Array.isArray(parsedCustomizableItems) ||
          parsedCustomizableItems.length === 0 ||
          !parsedCustomizableItems.every(
            (item) => item.itemName && item.itemPrice !== undefined
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

    // Handle profile image upload
    let profileImage = "";
    if (req.files && req.files["profileImage"]) {
      const result = await cloudinary.uploader.upload(
        req.files["profileImage"][0].path,
        {
          folder: "BookMyMandap",
          resource_type: "image",
        }
      );
      profileImage = result.secure_url;
      console.log("Profile image uploaded:", profileImage);
    }

    // Handle image uploads for each menuCategory
    const uploadedImages = req.files
      ? Object.keys(req.files)
          .filter((key) => key.startsWith("categoryImage["))
          .map((key) => req.files[key][0])
      : [];
    if (uploadedImages.length > parsedMenuCategory.length) {
      return res
        .status(400)
        .json(
          createErrorResult(
            "Number of category images cannot exceed number of menu categories"
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
          console.log(`Uploading categoryImage[${index}]:`, file);
          const result = await cloudinary.uploader.upload(file.path, {
            folder: "BookMyMandap",
            resource_type: "image",
          });
          categoryImage = result.secure_url;
          console.log(`Category image [${index}] uploaded:`, categoryImage);
        } else {
          console.log(`No file found for categoryImage[${index}]`);
        }
        return { ...category, categoryImage };
      })
    );

    const newCaterer = await catererModel.create({
      mandapId,
      catererName,
      about: about || "",
      profileImage,
      menuCategory: menuCategoryWithImages,
      foodType: parsedFoodType,
      isCustomizable: isCustomizable === "true" || isCustomizable === true,
      customizableItems: parsedCustomizableItems,
      hasTastingSession:
        hasTastingSession === "true" || hasTastingSession === true,
      isActive: true,
    });

    return res.status(201).json(
      createSuccessResult({
        message: "Caterer added successfully",
        caterer: newCaterer,
      })
    );
  } catch (error) {
    console.error("Error adding caterer:", error);
    return res.status(500).json(createErrorResult(error.message));
  }
};

exports.updateCaterer = async (req, res) => {
  console.log("req.body:", req.body);
  console.log("req.files:", JSON.stringify(req.files, null, 2));
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
      about,
    } = req.body;

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
      if (parsedMenuCategory.length > 4) {
        return res
          .status(400)
          .json(
            createErrorResult(
              "menuCategory cannot have more than 4 entries (Basic, Standard, Premium, Luxury)"
            )
          );
      }
      for (const category of parsedMenuCategory) {
        if (
          !category.category ||
          !category.menuItems ||
          !Array.isArray(category.menuItems) ||
          category.menuItems.length === 0 ||
          !category.pricePerPlate ||
          !["Basic", "Standard", "Premium", "Luxury"].includes(
            category.category
          )
        ) {
          return res
            .status(400)
            .json(createErrorResult("Invalid or missing menuCategory fields"));
        }
        if (
          !category.menuItems.every(
            (item) => item.itemName && item.itemPrice !== undefined
          )
        ) {
          return res
            .status(400)
            .json(
              createErrorResult(
                "Each menuItem must have itemName and itemPrice"
              )
            );
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
      if (isCustomizable === "true" || isCustomizable === true) {
        if (!customizableItems) {
          return res
            .status(400)
            .json(
              createErrorResult(
                "Customizable items are required when isCustomizable is true"
              )
            );
        }
        try {
          parsedCustomizableItems =
            typeof customizableItems === "string"
              ? JSON.parse(customizableItems)
              : customizableItems;
          if (
            !Array.isArray(parsedCustomizableItems) ||
            parsedCustomizableItems.length === 0 ||
            !parsedCustomizableItems.every(
              (item) => item.itemName && item.itemPrice !== undefined
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
        parsedCustomizableItems = [];
      }
    }

    // Handle profile image update
    let profileImage = caterer.profileImage || "";
    if (req.files && req.files["profileImage"]) {
      if (caterer.profileImage) {
        const publicId = caterer.profileImage.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`BookMyMandap/${publicId}`);
        console.log("Deleted old profile image:", caterer.profileImage);
      }
      const result = await cloudinary.uploader.upload(
        req.files["profileImage"][0].path,
        {
          folder: "BookMyMandap",
          resource_type: "image",
        }
      );
      profileImage = result.secure_url;
      console.log("Profile image uploaded:", profileImage);
    }

    // Handle image updates for each menuCategory
    const uploadedImages = req.files
      ? Object.keys(req.files)
          .filter((key) => key.startsWith("categoryImage["))
          .map((key) => req.files[key][0])
      : [];
    if (uploadedImages.length > parsedMenuCategory.length) {
      return res
        .status(400)
        .json(
          createErrorResult(
            "Number of category images cannot exceed number of menu categories"
          )
        );
    }

    const menuCategoryWithImages = await Promise.all(
      parsedMenuCategory.map(async (category, index) => {
        const file = uploadedImages.find(
          (f) => f.fieldname === `categoryImage[${index}]`
        );
        let categoryImage =
          category.categoryImage ||
          caterer.menuCategory[index]?.categoryImage ||
          "";
        if (file) {
          console.log(`Uploading categoryImage[${index}]:`, file);
          if (caterer.menuCategory[index]?.categoryImage) {
            const publicId = caterer.menuCategory[index].categoryImage
              .split("/")
              .pop()
              .split(".")[0];
            await cloudinary.uploader.destroy(`BookMyMandap/${publicId}`);
            console.log(
              `Deleted old categoryImage[${index}]:`,
              caterer.menuCategory[index].categoryImage
            );
          }
          const result = await cloudinary.uploader.upload(file.path, {
            folder: "BookMyMandap",
            resource_type: "image",
          });
          categoryImage = result.secure_url;
          console.log(`Category image [${index}] uploaded:`, categoryImage);
        } else if (
          !categoryImage &&
          caterer.menuCategory[index]?.categoryImage
        ) {
          console.log(`Removing categoryImage[${index}]`);
          const publicId = caterer.menuCategory[index].categoryImage
            .split("/")
            .pop()
            .split(".")[0];
          await cloudinary.uploader.destroy(`BookMyMandap/${publicId}`);
          categoryImage = "";
        } else {
          console.log(`No file found for categoryImage[${index}]`);
        }
        return { ...category, categoryImage };
      })
    );

    const updatedCaterer = await catererModel.findByIdAndUpdate(
      catererId,
      {
        mandapId: updatedMandapId,
        catererName: catererName || caterer.catererName,
        about: about !== undefined ? about : caterer.about,
        profileImage,
        menuCategory: menuCategoryWithImages,
        foodType: parsedFoodType,
        isCustomizable:
          isCustomizable !== undefined
            ? isCustomizable === "true" || isCustomizable === true
            : caterer.isCustomizable,
        customizableItems: parsedCustomizableItems,
        hasTastingSession:
          hasTastingSession !== undefined
            ? hasTastingSession === "true" || hasTastingSession === true
            : caterer.hasTastingSession,
        isActive: true,
      },
      { new: true, runValidators: true }
    );

    return res.status(200).json(
      createSuccessResult({
        message: "Caterer updated successfully",
        caterer: updatedCaterer,
      })
    );
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
        console.log("Deleted category image:", category.categoryImage);
      }
    }
    // Delete profile image
    if (caterer.profileImage) {
      const publicId = caterer.profileImage.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(`BookMyMandap/${publicId}`);
      console.log("Deleted profile image:", caterer.profileImage);
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
