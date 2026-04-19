export function validate(schema, source = "body") {
  return (req, res, next) => {
    const target = req[source] || {};
    const { value, error } = schema.validate(target, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((item) => item.message.replace(/"/g, ""));
      return res.status(400).json({
        error: "Validation failed",
        details,
      });
    }

    req[source] = value;
    return next();
  };
}
