const generateToken = (res, statusCode, entity, role) => {
  try {
    const token = entity.generateJwtToken();
    const cookieName = `${role}Token`;

    const options = {
      expires: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
    };

    const responseData = { success: true };
    responseData[role] = entity;

    return res
      .status(statusCode)
      .cookie(cookieName, token, options)
      .json(responseData);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = generateToken;
