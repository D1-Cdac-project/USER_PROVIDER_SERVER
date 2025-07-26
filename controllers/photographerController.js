const { cloudinary } = require("../config/cloudinary");
const { createErrorResult, createSuccessResult } = require("../config/result");
const mandapModel = require("../models/mandapModel");
const photographerModel = require("../models/photographerModel");

exports.addPhotographer = async (req, res) => {
  if (!req.provider) {
    return res.status(400).json(createErrorResult("Invalid Request"));
  }
  try {
    const { mandapId, photographerName, photographyTypes } = req.body;

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

    let sampleWork = [];
    if (req.files && req.files.length > 0) {
      sampleWork = req.files.map((file) => file.path);
    }

    await photographerModel.create({
      mandapId,
      photographerName,
      photographyTypes: photographyTypes.map((type) => ({
        ...type,
        sampleWork,
      })),
    });

    return res
      .status(201)
      .json(
        createSuccessResult({ message: "Photographer added successfully" })
      );
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};

exports.updatePhotographer = async (req, res) => {
  if (!req.provider) {
    return res.status(400).json(createErrorResult("Invalid Request"));
  }
  try {
    const { photographerId } = req.params;
    const { photographerName, photographyTypes } = req.body;

    const photographer = await photographerModel.findById(photographerId);
    if (!photographer) {
      return res.status(404).json(createErrorResult("Photographer not found"));
    }

    const mandap = await mandapModel.findOne({
      _id: photographer.mandapId,
      providerId: req.provider._id,
    });
    if (!mandap) {
      return res.status(403).json(createErrorResult("Unauthorized"));
    }

    let sampleWork = photographer.photographyTypes.flatMap(
      (type) => type.sampleWork
    );
    if (req.files && req.files.length > 0) {
      for (const imageUrl of sampleWork) {
        const publicId = imageUrl.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`BookMyMandap/${publicId}`);
      }
      sampleWork = req.files.map((file) => file.path);
    }

    await photographerModel.findByIdAndUpdate(
      photographerId,
      {
        photographerName,
        photographyTypes: photographyTypes.map((type) => ({
          ...type,
          sampleWork,
        })),
      },
      { new: true, runValidators: true }
    );

    return res
      .status(200)
      .json(
        createSuccessResult({ message: "Photographer updated successfully" })
      );
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};

exports.deletePhotographer = async (req, res) => {
  if (!req.provider) {
    return res.status(400).json(createErrorResult("Invalid Request"));
  }
  try {
    const { photographerId } = req.params;
    const photographer = await photographerModel.findById(photographerId);
    if (!photographer) {
      return res.status(404).json(createErrorResult("Photographer not found"));
    }

    const mandap = await mandapModel.findOne({
      _id: photographer.mandapId,
      providerId: req.provider._id,
    });
    if (!mandap) {
      return res.status(403).json(createErrorResult("Unauthorized"));
    }

    for (const type of photographer.photographyTypes) {
      for (const imageUrl of type.sampleWork) {
        const publicId = imageUrl.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`BookMyMandap/${publicId}`);
      }
    }

    await photographerModel.updateOne(
      { _id: photographerId },
      { $set: { isActive: false } }
    );

    return res
      .status(200)
      .json(
        createSuccessResult({ message: "Photographer deleted successfully" })
      );
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};

exports.getAllPhotographers = async (req, res) => {
  try {
    const { mandapId } = req.params;
    const mandap = await mandapModel.findById(mandapId);
    if (!mandap) {
      return res.status(404).json(createErrorResult("Mandap not found"));
    }
    if (!mandap.isActive) {
      return res.status(400).json(createErrorResult("Mandap is not active"));
    }

    const photographers = await photographerModel.find({
      mandapId,
      isActive: true,
    });
    if (photographers.length === 0) {
      return res.status(404).json(createErrorResult("No photographers found"));
    }

    return res.status(200).json(
      createSuccessResult({
        message: "Photographers fetched successfully",
        photographers,
      })
    );
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};

exports.getPhotographerById = async (req, res) => {
  try {
    const { photographerId } = req.params;
    const photographer = await photographerModel
      .findById(photographerId)
      .populate("mandapId");
    if (!photographer || !photographer.isActive) {
      return res.status(404).json(createErrorResult("Photographer not found"));
    }
    return res.status(200).json(createSuccessResult({ photographer }));
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};
exports.getPhotographerByMandapId = async (req, res) => {
  try {
    const { mandapId } = req.params;
    const mandap = await mandapModel.findById(mandapId);
    if (!mandap || !mandap.isActive) {
      return res.status(404).json(createErrorResult("Mandap not found"));
    }

    const photographers = await photographerModel.find({
      mandapId,
      isActive: true,
    });
    return res.status(200).json(createSuccessResult({ photographers }));
  } catch (error) {
    return res.status(500).json(createErrorResult(error.message));
  }
};
