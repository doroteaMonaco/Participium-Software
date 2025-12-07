import "dotenv/config";
import path from "node:path";

if (!process.env.DATABASE_URL) {
  console.error(
    "Missing required env: DATABASE_URL. Copy .env.example in a new .env and set the values.",
  );
  process.exit(1);
}

const APP_BASE_URL = "/api/";

const swaggerPath = path.join(__dirname, "../../../doc/OpenAPI_swagger.yml");

export const SECRET_KEY = process.env.JWT_SECRET || "default_secret_key";

export const CONFIG = {
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  LOG_PATH: process.env.LOG_PATH || "logs",
  ERROR_LOG_FILE: process.env.ERROR_LOG_FILE || "error.log",
  COMBINED_LOG_FILE: process.env.COMBINED_LOG_FILE || "combined.log",

  // Application settings
  APP_HOST: process.env.HOST || "localhost",
  APP_PORT: Number(process.env.PORT) || 4000,
  BACKEND_URL:
    (process.env.HOST || "localhost") + ":" + (process.env.PORT || "4000"),

  // Database settings
  DATABASE_URL: process.env.DATABASE_URL,

  // Redis settings
  REDIS_HOST: process.env.REDIS_HOST || "localhost",
  REDIS_PORT: Number(process.env.REDIS_PORT) || 6379,

  // Frontend settings
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:4173",

  // Swagger path
  SWAGGER_PATH: swaggerPath,

  ROUTES: {
    SWAGGER: APP_BASE_URL + "docs",
    AUTH: APP_BASE_URL + "auth",
    USERS: APP_BASE_URL + "users",
    REPORTS: APP_BASE_URL + "reports",
    // Serve uploads under the API base so frontend URLs using the API
    // base (e.g. http://host:port/api/uploads/...) resolve correctly.
    UPLOADS: APP_BASE_URL + "uploads",
    USER_PROFILES: "/user-profiles",
  },
};
