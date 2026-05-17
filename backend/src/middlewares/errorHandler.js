const ApiResponse = require("../utils/apiResponse");

function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || 500;

  // Transform Yup validation errors into a cleaner API response.
  if (error.name === "ValidationError") {
    return res
      .status(statusCode)
      .json(ApiResponse.error("Validation failed", error.errors));
  }

  return res
    .status(statusCode)
    .json(ApiResponse.error(error.message || "Internal server error"));
}

module.exports = errorHandler;
