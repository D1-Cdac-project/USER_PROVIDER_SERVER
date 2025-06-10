const jwt = require("jsonwebtoken");
const providerModal = require("../models/provider");

exports.isProvider = async (req, res, next) => {
  try {
    const { providerToken } = req.cookies;
    if (!providerToken) {
      return res.status(500).json({ success: false });
    }
    const decodeData = jwt.verify(providerToken, process.env.SECRET_KEY);
    req.provider = await providerModal.findOne(decodeData.id);
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
