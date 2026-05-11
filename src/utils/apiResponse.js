class ApiResponse {
  static success(message, data = null) {
    return { success: true, message, data };
  }

  static error(message, details = null) {
    return { success: false, message, details };
  }
}

module.exports = ApiResponse;
