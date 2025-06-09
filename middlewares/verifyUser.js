const jwt = require("jsonwebtoken");
const userModel = require("../models/userModel");

exports.isUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required: No token provided",
      });
    }

    const token = authHeader.split(" ")[1];
    const decodeData = jwt.verify(token, process.env.SECRET_KEY);
    const user = await userModel.findById(decodeData.id).populate("address");

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Token verification error:", error.message);
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }
};
