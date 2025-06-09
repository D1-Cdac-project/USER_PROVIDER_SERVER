const generateToken = (res, statusCode, user, isUser) => {
  try {
    const token = user.generateJwtToken();
    return token; // Return token for inclusion in response body, no cookie set
  } catch (error) {
    throw new Error(error.message);
  }
};

module.exports = generateToken;
