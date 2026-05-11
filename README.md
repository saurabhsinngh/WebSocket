# Node.js + MongoDB WebSocket Chat Application

This project demonstrates a class-based architecture with:
- Express REST APIs
- MongoDB (Mongoose)
- WebSocket (`ws`) for real-time one-to-one and group chat
- Yup validation

## 1. Project Structure

```text
src/
  app.js
  server.js
  config/
    db.js
    env.js
  controllers/
    chatController.js
  services/
    chatService.js
  repositories/
    chatRepository.js
  models/
    userModel.js
    chatGroupModel.js
    chatMessageModel.js
  routes/
    chatRoutes.js
  validators/
    chatValidator.js
  middlewares/
    validateRequest.js
    errorHandler.js
  utils/
    apiResponse.js
  websocket/
    socketServer.js
    handlers/
      chatSocketHandler.js
    state/
      socketRegistry.js
```

## 2. Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` from `.env.example`.

3. Start MongoDB locally (default expected URI):
```bash
mongodb://127.0.0.1:27017/websocket_chat_app
```

4. Start the app:
```bash
npm run dev
```

## 3. REST APIs (Create Users / Groups)

Base URL: `http://localhost:4000`

### Create User
`POST /api/chat/users`
```json
{
  "name": "Alice"
}
```

### Create Group
`POST /api/chat/groups`
```json
{
  "name": "Team Alpha",
  "memberIds": ["<aliceId>", "<bobId>"],
  "createdBy": "<aliceId>"
}
```

### Direct Message History
`GET /api/chat/messages/direct?userAId=<aliceId>&userBId=<bobId>`

### Group Message History
`GET /api/chat/messages/group/<groupId>`

## 4. WebSocket Testing Steps

WebSocket URL: `ws://localhost:4000`

Use Postman WebSocket client, Hoppscotch, or any WS client.

### One-to-One Chat

1. Open socket for Alice and register:
```json
{ "event": "register", "data": { "userId": "<aliceId>" } }
```

2. Open socket for Bob and register:
```json
{ "event": "register", "data": { "userId": "<bobId>" } }
```

3. Send direct message from Alice:
```json
{
  "event": "direct_message",
  "data": {
    "senderId": "<aliceId>",
    "receiverId": "<bobId>",
    "message": "Hi Bob"
  }
}
```

4. Expected behavior:
- Alice gets `direct_message_sent`
- Bob gets `direct_message_received`

### Group Chat

1. Ensure group exists and both users are group members.

2. From Alice socket, send:
```json
{
  "event": "group_message",
  "data": {
    "senderId": "<aliceId>",
    "groupId": "<groupId>",
    "message": "Hello team"
  }
}
```

3. Expected behavior:
- All connected group members get `group_message_received`
- Sender also gets `group_message_sent`

## 5. Notes

- All database message documents are persisted in MongoDB.
- Yup is used in REST input validation middleware.
- WebSocket events also validate MongoDB ObjectIds before processing.
