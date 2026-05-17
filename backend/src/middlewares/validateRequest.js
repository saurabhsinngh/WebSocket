function validateRequest(schema, source = "body") {
  return async (req, res, next) => {
    try {
      // Validate request payload using Yup and strip unknown fields.
      req[source] = await schema.validate(req[source], {
        abortEarly: false,
        stripUnknown: true
      });
      next();
    } catch (error) {
      error.statusCode = 400;
      next(error);
    }
  };
}

module.exports = validateRequest;
