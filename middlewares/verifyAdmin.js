const jwt = require("jsonwebtoken");
const adminModel = require("../models/adminModel");

exports.isAdmin = async (req, res, next) => {
  try {
    const { adminToken } = req.cookies;
    if (!adminToken) return res.status(500).json({ success: false });

    const decodeData = jwt.verify(adminToken, process.env.SECRET_KEY);
    req.admin = await adminModel.findById(decodeData.id);
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
