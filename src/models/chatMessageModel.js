const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    chatType: {
      type: String,
      enum: ["direct", "group"],
      required: true
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatGroup",
      default: null
    },
    message: {
      type: String,
      required: true,
      trim: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
