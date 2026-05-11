const chatService = require("../../services/chatService");
const socketRegistry = require("../state/socketRegistry");
const chatRepository = require("../../repositories/chatRepository");

class ChatSocketHandler {
  setupConnection(socket) {
    socket.on("message", async (rawMessage) => {
      try {
        const payload = JSON.parse(rawMessage.toString());
        await this.handleMessage(socket, payload);
      } catch (error) {
        this.send(socket, {
          type: "error",
          message: error.message || "Invalid websocket message"
        });
      }
    });

    socket.on("close", () => {
      socketRegistry.unregister(socket);
    });
  }

  async handleMessage(socket, payload) {
    const { event, data } = payload;

    if (event === "register") {
      return this.handleRegister(socket, data);
    }

    if (event === "direct_message") {
      return this.handleDirectMessage(socket, data);
    }

    if (event === "group_message") {
      return this.handleGroupMessage(socket, data);
    }

    this.send(socket, { type: "error", message: "Unknown event type" });
  }

  handleRegister(socket, data) {
    if (!data || !data.userId) {
      throw new Error("userId is required for register event");
    }

    chatService.validateObjectId(data.userId, "userId");
    socketRegistry.register(data.userId, socket);

    this.send(socket, {
      type: "registered",
      message: "WebSocket user registered successfully"
    });
  }

  async handleDirectMessage(socket, data) {
    const { senderId, receiverId, message } = data || {};

    chatService.validateObjectId(senderId, "senderId");
    chatService.validateObjectId(receiverId, "receiverId");

    const savedMessage = await chatService.sendDirectMessage({
      senderId,
      receiverId,
      message
    });

    // Send to sender so UI can confirm delivery.
    this.send(socket, {
      type: "direct_message_sent",
      data: savedMessage
    });

    // Send to receiver if receiver is online.
    const receiverSocket = socketRegistry.getSocketByUserId(receiverId);
    if (receiverSocket && receiverSocket.readyState === 1) {
      this.send(receiverSocket, {
        type: "direct_message_received",
        data: savedMessage
      });
    }
  }

  async handleGroupMessage(socket, data) {
    const { senderId, groupId, message } = data || {};

    chatService.validateObjectId(senderId, "senderId");
    chatService.validateObjectId(groupId, "groupId");

    const savedMessage = await chatService.sendGroupMessage({
      senderId,
      groupId,
      message
    });

    const group = await chatRepository.findGroupById(groupId);

    // Broadcast to all online group members.
    group.members.forEach((member) => {
      const memberSocket = socketRegistry.getSocketByUserId(member._id.toString());
      if (memberSocket && memberSocket.readyState === 1) {
        this.send(memberSocket, {
          type: "group_message_received",
          data: savedMessage
        });
      }
    });

    this.send(socket, {
      type: "group_message_sent",
      data: savedMessage
    });
  }

  send(socket, payload) {
    socket.send(JSON.stringify(payload));
  }
}

module.exports = new ChatSocketHandler();
