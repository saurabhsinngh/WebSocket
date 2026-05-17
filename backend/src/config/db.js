const mongoose = require("mongoose");

class Database {
  async connect(mongoUri) {
    // Connect to MongoDB only once during server startup.
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected successfully");
  }
}

module.exports = new Database();
