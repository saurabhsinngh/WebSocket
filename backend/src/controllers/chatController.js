const ApiResponse = require("../utils/apiResponse");
const chatService = require("../services/chatService");

class ChatController {
  async listUsers(req, res, next) {
    try {
      const users = await chatService.listUsers();
      return res.json(ApiResponse.success("Users fetched", users));
    } catch (error) {
      return next(error);
    }
  }

  async createUser(req, res, next) {
    try {
      const user = await chatService.createUser(req.body);
      return res.status(201).json(ApiResponse.success("User created", user));
    } catch (error) {
      return next(error);
    }
  }

  async createGroup(req, res, next) {
    try {
      const group = await chatService.createGroup(req.body);
      return res.status(201).json(ApiResponse.success("Group created", group));
    } catch (error) {
      return next(error);
    }
  }

  async listGroups(req, res, next) {
    try {
      const groups = await chatService.listGroups();
      return res.json(ApiResponse.success("Groups fetched", groups));
    } catch (error) {
      return next(error);
    }
  }

  async addMemberToGroup(req, res, next) {
    try {
      const { groupId } = req.params;
      const { userId } = req.body;

      chatService.validateObjectId(groupId, "groupId");
      chatService.validateObjectId(userId, "userId");

      const group = await chatService.addMemberToGroup({ groupId, userId });
      return res.json(ApiResponse.success("User added successfully", group));
    } catch (error) {
      return next(error);
    }
  }

  async getDirectMessages(req, res, next) {
    try {
      const { userAId, userBId } = req.query;
      chatService.validateObjectId(userAId, "userAId");
      chatService.validateObjectId(userBId, "userBId");

      const messages = await chatService.getDirectMessages({ userAId, userBId });
      return res.json(ApiResponse.success("Direct chat history fetched", messages));
    } catch (error) {
      return next(error);
    }
  }

  async getGroupMessages(req, res, next) {
    try {
      const { groupId } = req.params;
      chatService.validateObjectId(groupId, "groupId");

      const messages = await chatService.getGroupMessages({ groupId });
      return res.json(ApiResponse.success("Group chat history fetched", messages));
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new ChatController();
