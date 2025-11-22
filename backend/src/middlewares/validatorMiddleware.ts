import * as OpenApiValidator from "express-openapi-validator";
import path from "path";

const isDocker = process.env.IS_DOCKER === "true";
const swaggerPath = isDocker
  ? "/app/doc/OpenAPI_swagger.yml"
  : path.join(__dirname, "../../../doc/OpenAPI_swagger.yml");

export const openApiValidator = OpenApiValidator.middleware({
  apiSpec: swaggerPath,
  validateRequests: {
    // Enable coercion so values sent as strings (eg. multipart/form-data)
    // are converted to the types expected by the OpenAPI schema (eg.
    // "false" -> false).
    coerceTypes: true,
  },
});
