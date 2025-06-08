const jwt = require("jsonwebtoken");
const providerModal = require("../models/providerModel");

exports.isProvider = async (req, res, next) => {
  try {
    const { providerToken } = req.cookies;
    if (!providerToken) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }
    const decodedData = jwt.verify(providerToken, process.env.SECRET_KEY);

    const provider = await providerModal.findOne({ _id: decodedData.id });
    if(!provider){
      return res.status(404).json({ success : false, message : "Provider not found"})
    }
    req.provider = provider;
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
