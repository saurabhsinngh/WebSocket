const express = require("express");
const chatController = require("../controllers/chatController");
const validateRequest = require("../middlewares/validateRequest");
const { createUserSchema, createGroupSchema, addGroupMemberSchema } = require("../validators/chatValidator");

const router = express.Router();

router.get("/users", (req, res, next) => chatController.listUsers(req, res, next));

router.post("/users", validateRequest(createUserSchema), (req, res, next) =>
  chatController.createUser(req, res, next)
);

router.get("/groups", (req, res, next) => chatController.listGroups(req, res, next));

router.post("/groups", validateRequest(createGroupSchema), (req, res, next) =>
  chatController.createGroup(req, res, next)
);

router.patch("/groups/:groupId/members", validateRequest(addGroupMemberSchema), (req, res, next) =>
  chatController.addMemberToGroup(req, res, next)
);

router.get("/messages/direct", (req, res, next) =>
  chatController.getDirectMessages(req, res, next)
);

router.get("/messages/group/:groupId", (req, res, next) =>
  chatController.getGroupMessages(req, res, next)
);

module.exports = router;
