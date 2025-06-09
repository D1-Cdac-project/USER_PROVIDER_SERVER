const jwt = require("jsonwebtoken");
const providerModal = require("../models/provider");

exports.isProvider = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required: No token provided",
      });
    }

    const token = authHeader.split(" ")[1]; // Extract token after "Bearer"
    const decodeData = jwt.verify(token, process.env.SECRET_KEY);
    const provider = await providerModal.findById(decodeData.id);

    if (!provider) {
      return res
        .status(401)
        .json({ success: false, message: "Provider not found" });
    }

    req.provider = provider;
    next();
  } catch (error) {
    console.error("Token verification error:", error.message);
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }
};
