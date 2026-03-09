import { ApiError } from "../utils/ApiError.js";

export function validate(schema, source = "body") {
  return (req, _res, next) => {
    const input = req[source];
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      return next(new ApiError(400, "Validation failed.", parsed.error.flatten()));
    }
    req[source] = parsed.data;
    return next();
  };
}
