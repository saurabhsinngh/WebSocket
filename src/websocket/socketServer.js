const { WebSocketServer } = require("ws");
const chatSocketHandler = require("./handlers/chatSocketHandler");

class SocketServer {
  attach(server) {
    const wss = new WebSocketServer({ server });

    wss.on("connection", (socket) => {
      chatSocketHandler.setupConnection(socket);
    });

    console.log("WebSocket server initialized");
  }
}

module.exports = new SocketServer();
