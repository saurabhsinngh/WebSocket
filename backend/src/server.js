const http = require("http");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const env = require("./config/env");
const database = require("./config/db");
const chatRoutes = require("./routes/chatRoutes");
const errorHandler = require("./middlewares/errorHandler");
const socketServer = require("./websocket/socketServer");

const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (req, res) => {
  res.json({ success: true, message: "Chat API is healthy" });
});

app.use("/api/chat", chatRoutes);
app.use(errorHandler);

async function startServer() {
  await database.connect(env.mongoUri);

  const server = http.createServer(app);

  // Handle common startup issues with a clean actionable message.
  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${env.port} is already in use. Stop the running process or change PORT in .env.`);
      process.exit(1);
    }
    console.error("Server error:", error);
    process.exit(1);
  });

  server.listen(env.port, () => {
    socketServer.attach(server);
    console.log(`HTTP + WebSocket server running on port ${env.port}`);
  });
}

startServer().catch((error) => {
  console.error("Server failed to start:", error);
  process.exit(1);
});
