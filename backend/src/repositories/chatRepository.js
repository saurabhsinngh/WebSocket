const ChatMessage = require("../models/chatMessageModel");
const ChatGroup = require("../models/chatGroupModel");
const User = require("../models/userModel");

class ChatRepository {
  listUsers() {
    return User.find().sort({ createdAt: 1 });
  }

  createUser(name) {
    return User.create({ name });
  }

  listGroups() {
    return ChatGroup.find()
      .sort({ createdAt: 1 })
      .populate("members", "_id name")
      .populate("createdBy", "_id name");
  }

  createGroup(payload) {
    return ChatGroup.create(payload);
  }

  addMemberToGroup(groupId, userId) {
    return ChatGroup.findByIdAndUpdate(
      groupId,
      { $addToSet: { members: userId } },
      { new: true }
    )
      .populate("members", "_id name")
      .populate("createdBy", "_id name");
  }

  async createMessage(payload) {
    const created = await ChatMessage.create(payload);
    return ChatMessage.findById(created._id)
      .populate("senderId", "_id name")
      .populate("receiverId", "_id name")
      .populate("groupId", "_id name members");
  }

  findGroupById(groupId) {
    return ChatGroup.findById(groupId).populate("members", "_id name");
  }

  findDirectMessages(userAId, userBId) {
    return ChatMessage.find({
      chatType: "direct",
      $or: [
        { senderId: userAId, receiverId: userBId },
        { senderId: userBId, receiverId: userAId }
      ]
    })
      .sort({ createdAt: 1 })
      .populate("senderId", "_id name")
      .populate("receiverId", "_id name");
  }

  findGroupMessages(groupId) {
    return ChatMessage.find({ chatType: "group", groupId })
      .sort({ createdAt: 1 })
      .populate("senderId", "_id name")
      .populate("groupId", "_id name members");
  }
}

module.exports = new ChatRepository();
