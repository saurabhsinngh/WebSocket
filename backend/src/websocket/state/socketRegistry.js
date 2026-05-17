class SocketRegistry {
  constructor() {
    // Map of userId -> active websocket connection.
    this.userSockets = new Map();
    // Map of websocket connection -> userId.
    this.socketUsers = new Map();
  }

  register(userId, socket) {
    const previousUserId = this.socketUsers.get(socket);
    if (previousUserId) {
      this.userSockets.delete(previousUserId);
    }

    const previousSocket = this.userSockets.get(userId);
    if (previousSocket && previousSocket !== socket) {
      this.socketUsers.delete(previousSocket);
    }

    this.userSockets.set(userId, socket);
    this.socketUsers.set(socket, userId);
  }

  unregister(socket) {
    const userId = this.socketUsers.get(socket);
    if (userId) {
      this.userSockets.delete(userId);
      this.socketUsers.delete(socket);
    }
  }

  getSocketByUserId(userId) {
    return this.userSockets.get(userId);
  }
}

module.exports = new SocketRegistry();
