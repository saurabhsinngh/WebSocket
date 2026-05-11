const yup = require("yup");

const createUserSchema = yup.object({
  name: yup.string().trim().required().min(2).max(60)
});

const createGroupSchema = yup.object({
  name: yup.string().trim().required().min(2).max(80),
  memberIds: yup.array().of(yup.string().required()).min(1).required(),
  createdBy: yup.string().required()
});

module.exports = {
  createUserSchema,
  createGroupSchema
};
