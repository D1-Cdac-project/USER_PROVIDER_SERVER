const { cloudinary } = require("../config/cloudinary");
const { createErrorResult, createSuccessResult } = require("../config/result");
const catererModel = require("../models/catererModel");

exports.addCaterer = async (req, res) => {
  if (!req.provider) {
    return res.status(400).json(createErrorResult("Invalid Request"));
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

    if (
      isCustomizable &&
      (!customizableItems || customizableItems.length === 0)
    ) {
      return res
        .status(400)
        .json(
          createErrorResult(
            "Customizable items are required when isCustomizable is true"
          )
        );
    }

    let categoryImage;
    if (req.file) {
      categoryImage = req.file.path;
    }

    await catererModel.create({
      mandapId,
      catererName,
      menuCategory: {
        ...menuCategory,
        categoryImage,
      },
      foodType,
      isCustomizable,
      customizableItems: isCustomizable ? customizableItems : [],
      hasTastingSession,
    });

    return res
      .status(201)
      .json(createSuccessResult({ message: "Caterer added successfully" }));
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};

exports.updateCaterer = async (req, res) => {
  if (!req.provider) {
    return res.status(400).json(createErrorResult("Invalid Request"));
  }
  try {
    const { catererId } = req.params;
    const {
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

    const mandap = await mandapModel.findOne({
      _id: caterer.mandapId[0],
      providerId: req.provider._id,
    });
    if (!mandap) {
      return res.status(403).json(createErrorResult("Unauthorized"));
    }

    if (
      isCustomizable &&
      (!customizableItems || customizableItems.length === 0)
    ) {
      return res
        .status(400)
        .json(
          createErrorResult(
            "Customizable items are required when isCustomizable is true"
          )
        );
    }

    let categoryImage = caterer.menuCategory.categoryImage;
    if (req.file) {
      if (categoryImage) {
        const publicId = categoryImage.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`BookMyMandap/${publicId}`);
      }
      categoryImage = req.file.path;
    }

    await catererModel.findByIdAndUpdate(
      catererId,
      {
        catererName,
        menuCategory: {
          ...menuCategory,
          categoryImage,
        },
        foodType,
        isCustomizable,
        customizableItems: isCustomizable ? customizableItems : [],
        hasTastingSession,
      },
      { new: true, runValidators: true }
    );

    return res
      .status(200)
      .json(createSuccessResult({ message: "Caterer updated successfully" }));
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};

exports.deleteCaterer = async (req, res) => {
  if (!req.provider) {
    return res.status(400).json(createErrorResult("Invalid Request"));
  }
  try {
    const { catererId } = req.params;
    const caterer = await catererModel.findById(catererId);
    if (!caterer) {
      return res.status(404).json(createErrorResult("Caterer not found"));
    }

    const mandap = await mandapModel.findOne({
      _id: caterer.mandapId[0],
      providerId: req.provider._id,
    });
    if (!mandap) {
      return res.status(403).json(createErrorResult("Unauthorized"));
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
    return res.status(500).json(createErrorResult(error.message));
  }
};

exports.getAllCaterer = async (req, res) => {
  try {
    if (!req.provider) {
      return res.status(400).json(createErrorResult("Invalid Request"));
    }

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
    return res.status(500).json(createErrorResult(error.message));
  }
};

exports.getCatererById = async (req, res) => {
  try {
    const { catererId } = req.params;
    if (!req.provider) {
      return res.status(400).json(createErrorResult("Invalid Request"));
    }

    const caterer = await catererModel.findById(catererId).populate("mandapId");
    if (!caterer || !caterer.isActive) {
      return res.status(404).json(createErrorResult("Caterer not found"));
    }

    const mandap = await mandapModel.findOne({
      _id: caterer.mandapId[0],
      providerId: req.provider._id,
    });
    if (!mandap) {
      return res.status(403).json(createErrorResult("Unauthorized"));
    }

    return res.status(200).json(
      createSuccessResult({
        caterer,
        message: "Caterer fetched successfully",
      })
    );
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};

exports.getAllCaterersByMandapId = async (req, res) => {
  try {
    const { mandapId } = req.params;
    const mandap = await mandapModel.findById(mandapId);
    if (!mandap || !mandap.isActive) {
      return res.status(404).json(createErrorResult("Mandap not found"));
    }

    const caterers = await catererModel.find({ mandapId, isActive: true });
    return res.status(200).json(createSuccessResult({ caterers }));
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};
