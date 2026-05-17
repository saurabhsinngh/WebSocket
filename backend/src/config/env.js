const dotenv = require("dotenv");

dotenv.config();

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 4050,
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/websocket_chat_app"
};
