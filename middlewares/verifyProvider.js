const jwt = require("jsonwebtoken");
const providerModel = require("../models/providerModel");

exports.isProvider = async (req, res, next) => {
  try {
    const { providerToken } = req.cookies;
    if (!providerToken) {
      return res
        .status(401)
        .json({ success: false, message: "No token provided" });
    }
    const decodedData = jwt.verify(providerToken, process.env.SECRET_KEY);
    const provider = await providerModel.findOne({ _id: decodedData.id });

    if (!provider) {
      return res
        .status(404)
        .json({ success: false, message: "Provider not found" });
    }
    if (provider.authorizationStatus == "rejected") {
      return res
        .status(403)
        .json({ success: false, message: "Admin Rejected your approval" });
    }
    if (provider.authorizationStatus == "pending") {
      return res
        .status(403)
        .json({ success: false, message: "Provider not authorized" });
    }

    req.provider = provider;
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid token", error: error.message });
  }
};
