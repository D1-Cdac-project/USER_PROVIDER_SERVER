const mongoose = require("mongoose");
const { cloudinary } = require("../config/cloudinary");
const { createErrorResult, createSuccessResult } = require("../config/result");
const mandapModel = require("../models/mandapModel");
const photographerModel = require("../models/photographerModel");

// Adds a new photographer with a single mandapId and Cloudinary image upload
exports.addPhotographer = async (req, res) => {
  if (!req.provider) {
    return res
      .status(400)
      .json(createErrorResult("Invalid Request: Provider not authenticated"));
  }
  try {
    const { mandapId, photographerName, photographyTypes, printOption, about } =
      req.body;

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

    // Parse photographyTypes
    let parsedPhotographyTypes;
    if (typeof photographyTypes === "string") {
      try {
        parsedPhotographyTypes = JSON.parse(photographyTypes);
      } catch (e) {
        return res
          .status(400)
          .json(
            createErrorResult(
              "Invalid JSON format for photographyTypes: " + e.message
            )
          );
      }
    } else {
      parsedPhotographyTypes = photographyTypes;
    }

    // Validate photographyTypes
    if (
      !Array.isArray(parsedPhotographyTypes) ||
      parsedPhotographyTypes.length === 0
    ) {
      return res
        .status(400)
        .json(createErrorResult("photographyTypes must be a non-empty array"));
    }
    if (
      !parsedPhotographyTypes.every((type) => type.phtype && type.pricePerEvent)
    ) {
      return res
        .status(400)
        .json(
          createErrorResult(
            "Each photographyType must have phtype and pricePerEvent"
          )
        );
    }

    // Parse printOption
    let parsedPrintOption = [];
    if (printOption) {
      if (typeof printOption === "string") {
        try {
          parsedPrintOption = JSON.parse(printOption);
        } catch (e) {
          return res
            .status(400)
            .json(
              createErrorResult(
                "Invalid JSON format for printOption: " + e.message
              )
            );
        }
      } else {
        parsedPrintOption = printOption;
      }
      if (!Array.isArray(parsedPrintOption)) {
        return res
          .status(400)
          .json(createErrorResult("printOption must be an array"));
      }
      if (
        parsedPrintOption.length > 0 &&
        !parsedPrintOption.every(
          (opt) => opt.printType || opt.printDesc || opt.printPrice
        )
      ) {
        return res
          .status(400)
          .json(
            createErrorResult(
              "Each printOption must have at least one of printType, printDesc, or printPrice"
            )
          );
      }
    }

    // Handle profile image upload
    let profileImage = "";
    if (
      Array.isArray(req.files) &&
      req.files.some((file) => file.fieldname === "profileImage")
    ) {
      const profileFile = req.files.find(
        (file) => file.fieldname === "profileImage"
      );
      const result = await cloudinary.uploader.upload(profileFile.path, {
        folder: "BookMyMandap",
        resource_type: "image",
      });
      profileImage = result.secure_url;
    } else if (req.files && req.files.profileImage) {
      const result = await cloudinary.uploader.upload(
        req.files.profileImage[0].path,
        {
          folder: "BookMyMandap",
          resource_type: "image",
        }
      );
      profileImage = result.secure_url;
    }

    // Handle image upload for sampleWork
    let sampleWork = [];
    const sampleWorkFiles = Array.isArray(req.files)
      ? req.files.filter((file) => file.fieldname === "sampleWork")
      : req.files && req.files.sampleWork
      ? req.files.sampleWork
      : [];
    if (sampleWorkFiles.length > 0) {
      sampleWork = await Promise.all(
        sampleWorkFiles.map((file) =>
          cloudinary.uploader.upload(file.path, {
            folder: "BookMyMandap",
            resource_type: "auto", // Allow images and videos
          })
        )
      ).then((results) => results.map((result) => result.secure_url));
    }

    const updatedPhotographyTypes = parsedPhotographyTypes.map((type) => ({
      ...type,
      sampleWork: sampleWork.length > 0 ? sampleWork : type.sampleWork || [],
    }));

    await photographerModel.create({
      mandapId,
      photographerName,
      profileImage,
      about: about || "",
      photographyTypes: updatedPhotographyTypes,
      printOption: parsedPrintOption,
    });

    return res
      .status(201)
      .json(
        createSuccessResult({ message: "Photographer added successfully" })
      );
  } catch (error) {
    console.error("Error adding photographer:", error);
    return res.status(500).json(createErrorResult(error.message));
  }
};

// Updates a photographer with Cloudinary image handling
exports.updatePhotographer = async (req, res) => {
  console.log("req.files:", req.files); // Debug log
  if (!req.provider) {
    return res
      .status(400)
      .json(createErrorResult("Invalid Request: Provider not authenticated"));
  }
  try {
    const { photographerId } = req.params;
    const { mandapId, photographerName, photographyTypes, printOption, about } =
      req.body;

    const photographer = await photographerModel.findById(photographerId);
    if (!photographer) {
      return res.status(404).json(createErrorResult("Photographer not found"));
    }

    // Validate mandapId if provided
    let updatedMandapId = photographer.mandapId;
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

    // Parse photographyTypes
    let parsedPhotographyTypes = photographer.photographyTypes;
    if (photographyTypes) {
      if (typeof photographyTypes === "string") {
        try {
          parsedPhotographyTypes = JSON.parse(photographyTypes);
        } catch (e) {
          return res
            .status(400)
            .json(
              createErrorResult(
                "Invalid JSON format for photographyTypes: " + e.message
              )
            );
        }
      } else {
        parsedPhotographyTypes = photographyTypes;
      }
      if (
        !Array.isArray(parsedPhotographyTypes) ||
        parsedPhotographyTypes.length === 0
      ) {
        return res
          .status(400)
          .json(
            createErrorResult("photographyTypes must be a non-empty array")
          );
      }
      if (
        !parsedPhotographyTypes.every(
          (type) => type.phtype && type.pricePerEvent
        )
      ) {
        return res
          .status(400)
          .json(
            createErrorResult(
              "Each photographyType must have phtype and pricePerEvent"
            )
          );
      }
    }

    // Parse printOption
    let parsedPrintOption = photographer.printOption;
    if (printOption) {
      if (typeof printOption === "string") {
        try {
          parsedPrintOption = JSON.parse(printOption);
        } catch (e) {
          return res
            .status(400)
            .json(
              createErrorResult(
                "Invalid JSON format for printOption: " + e.message
              )
            );
        }
      } else {
        parsedPrintOption = printOption;
      }
      if (!Array.isArray(parsedPrintOption)) {
        return res
          .status(400)
          .json(createErrorResult("printOption must be an array"));
      }
      if (
        parsedPrintOption.length > 0 &&
        !parsedPrintOption.every(
          (opt) => opt.printType || opt.printDesc || opt.printPrice
        )
      ) {
        return res
          .status(400)
          .json(
            createErrorResult(
              "Each printOption must have at least one of printType, printDesc, or printPrice"
            )
          );
      }
    }

    // Handle profile image update
    let profileImage = photographer.profileImage || "";
    if (
      Array.isArray(req.files) &&
      req.files.some((file) => file.fieldname === "profileImage")
    ) {
      // Delete existing profile image from Cloudinary
      if (photographer.profileImage) {
        const publicId = photographer.profileImage
          .split("/")
          .pop()
          .split(".")[0];
        await cloudinary.uploader.destroy(`BookMyMandap/${publicId}`);
      }
      const profileFile = req.files.find(
        (file) => file.fieldname === "profileImage"
      );
      const result = await cloudinary.uploader.upload(profileFile.path, {
        folder: "BookMyMandap",
        resource_type: "image",
      });
      profileImage = result.secure_url;
    } else if (req.files && req.files.profileImage) {
      // Handle case where upload.fields stores files as an object
      if (photographer.profileImage) {
        const publicId = photographer.profileImage
          .split("/")
          .pop()
          .split(".")[0];
        await cloudinary.uploader.destroy(`BookMyMandap/${publicId}`);
      }
      const result = await cloudinary.uploader.upload(
        req.files.profileImage[0].path,
        {
          folder: "BookMyMandap",
          resource_type: "image",
        }
      );
      profileImage = result.secure_url;
    }

    // Handle image update for sampleWork
    let sampleWork = parsedPhotographyTypes.flatMap(
      (type) => type.sampleWork || []
    );
    const sampleWorkFiles = Array.isArray(req.files)
      ? req.files.filter((file) => file.fieldname === "sampleWork")
      : req.files && req.files.sampleWork
      ? req.files.sampleWork
      : [];
    if (sampleWorkFiles.length > 0) {
      // Delete existing images from Cloudinary
      for (const imageUrl of photographer.photographyTypes.flatMap(
        (type) => type.sampleWork || []
      )) {
        if (imageUrl) {
          const publicId = imageUrl.split("/").pop().split(".")[0];
          await cloudinary.uploader.destroy(`BookMyMandap/${publicId}`);
        }
      }
      sampleWork = await Promise.all(
        sampleWorkFiles.map((file) =>
          cloudinary.uploader.upload(file.path, {
            folder: "BookMyMandap",
            resource_type: "auto",
          })
        )
      ).then((results) => results.map((result) => result.secure_url));
    } else if (
      parsedPhotographyTypes.every(
        (type) => !type.sampleWork || type.sampleWork.length === 0
      )
    ) {
      // Clear existing images if sampleWork is empty
      for (const imageUrl of photographer.photographyTypes.flatMap(
        (type) => type.sampleWork || []
      )) {
        if (imageUrl) {
          const publicId = imageUrl.split("/").pop().split(".")[0];
          await cloudinary.uploader.destroy(`BookMyMandap/${publicId}`);
        }
      }
      sampleWork = [];
    }

    // Assign sampleWork to each photographyType
    const updatedPhotographyTypes = parsedPhotographyTypes.map(
      (type, index) => ({
        ...type,
        sampleWork:
          sampleWork.length > 0 && index === 0
            ? sampleWork
            : type.sampleWork || [],
      })
    );

    await photographerModel.findByIdAndUpdate(
      photographerId,
      {
        mandapId: updatedMandapId,
        photographerName: photographerName || photographer.photographerName,
        profileImage,
        about: about !== undefined ? about : photographer.about,
        photographyTypes: updatedPhotographyTypes,
        printOption: parsedPrintOption,
        isActive: true,
      },
      { new: true, runValidators: true }
    );

    return res
      .status(200)
      .json(
        createSuccessResult({ message: "Photographer updated successfully" })
      );
  } catch (error) {
    console.error("Error updating photographer:", error);
    return res.status(500).json(createErrorResult(error.message));
  }
};

// Soft deletes a photographer with Cloudinary image cleanup
exports.deletePhotographer = async (req, res) => {
  if (!req.provider) {
    return res
      .status(400)
      .json(createErrorResult("Invalid Request: Provider not authenticated"));
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
      return res
        .status(403)
        .json(
          createErrorResult("Unauthorized: Provider does not own this mandap")
        );
    }

    // Delete images from Cloudinary
    for (const type of photographer.photographyTypes) {
      for (const imageUrl of type.sampleWork) {
        const publicId = imageUrl.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`BookMyMandap/${publicId}`);
      }
    }
    // Delete profile image from Cloudinary
    if (photographer.profileImage) {
      const publicId = photographer.profileImage.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(`BookMyMandap/${publicId}`);
    }

    await photographerModel.findByIdAndUpdate(photographerId, {
      isActive: false,
    });

    return res
      .status(200)
      .json(
        createSuccessResult({ message: "Photographer deleted successfully" })
      );
  } catch (error) {
    console.error("Error deleting photographer:", error);
    return res.status(500).json(createErrorResult(error.message));
  }
};

// Fetches all active photographers for provider’s mandaps
exports.getAllPhotographers = async (req, res) => {
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
    const photographers = await photographerModel
      .find({ mandapId: { $in: mandaps }, isActive: true })
      .populate("mandapId");
    if (!photographers.length) {
      return res.status(404).json(createErrorResult("No photographers found"));
    }
    return res.status(200).json(
      createSuccessResult({
        message: "Photographers fetched successfully",
        photographers,
      })
    );
  } catch (error) {
    console.error("Error fetching photographers:", error);
    return res.status(500).json(createErrorResult(error.message));
  }
};

// Fetches a single photographer by ID
exports.getPhotographerById = async (req, res) => {
  try {
    const { photographerId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(photographerId)) {
      return res.status(400).json(createErrorResult("Invalid photographerId"));
    }
    const photographer = await photographerModel
      .findById(photographerId)
      .populate("mandapId");
    if (!photographer || !photographer.isActive) {
      return res
        .status(404)
        .json(createErrorResult("Photographer not found or inactive"));
    }
    return res.status(200).json(
      createSuccessResult({
        photographer,
        message: "Photographer fetched successfully",
      })
    );
  } catch (error) {
    console.error("Error fetching photographer by ID:", error);
    return res.status(500).json(createErrorResult(error.message));
  }
};

// Fetches all active photographers by mandap ID
exports.getPhotographerByMandapId = async (req, res) => {
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
    const photographers = await photographerModel
      .find({ mandapId, isActive: true })
      .populate("mandapId");
    return res.status(200).json(
      createSuccessResult({
        photographers,
        message: "Photographers fetched successfully",
      })
    );
  } catch (error) {
    console.error("Error fetching photographers by mandap ID:", error);
    return res.status(500).json(createErrorResult(error.message));
  }
};
