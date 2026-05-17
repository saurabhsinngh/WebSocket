const mongoose = require("mongoose");
const chatRepository = require("../repositories/chatRepository");

class ChatService {
  listUsers() {
    return chatRepository.listUsers();
  }

  createUser({ name }) {
    return chatRepository.createUser(name);
  }

  listGroups() {
    return chatRepository.listGroups();
  }

  async createGroup({ name, memberIds, createdBy }) {
    // Keep only unique member IDs and ensure creator belongs to the group.
    const allMembers = [...new Set([...memberIds, createdBy])];
    

    return chatRepository.createGroup({
      name,
      members: allMembers,
      createdBy
    });
  }

  async addMemberToGroup({ groupId, userId }) {
    const group = await chatRepository.findGroupById(groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    const alreadyMember = group.members.some((member) => member._id.toString() === userId);
    if (alreadyMember) {
      throw new Error("User is already a member of this group");
    }

    return chatRepository.addMemberToGroup(groupId, userId);
  }

  async sendDirectMessage({ senderId, receiverId, message }) {
    if (senderId === receiverId) {
      throw new Error("Sender and receiver cannot be the same for direct chat");
    }

    return chatRepository.createMessage({
      chatType: "direct",
      senderId,
      receiverId,
      message
    });
  }

  async sendGroupMessage({ senderId, groupId, message }) {
    const group = await chatRepository.findGroupById(groupId);

    if (!group) {
      throw new Error("Group not found");
    }

    const isMember = group.members.some((member) => member._id.toString() === senderId);
    if (!isMember) {
      throw new Error("Sender is not a member of this group");
    }

    return chatRepository.createMessage({
      chatType: "group",
      senderId,
      groupId,
      message
    });
  }

  getDirectMessages({ userAId, userBId }) {
    return chatRepository.findDirectMessages(userAId, userBId);
  }

  getGroupMessages({ groupId }) {
    return chatRepository.findGroupMessages(groupId);
  }

  validateObjectId(id, fieldName) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error(`${fieldName} is not a valid MongoDB ObjectId`);
    }
  }
}

module.exports = new ChatService();
