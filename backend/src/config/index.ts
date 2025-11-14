export const CONFIG = {
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  LOG_PATH: process.env.LOG_PATH || "./logs",
  ERROR_LOG_FILE: process.env.ERROR_LOG_FILE || "error.log",
  COMBINED_LOG_FILE: process.env.COMBINED_LOG_FILE || "combined.log",
  PORT: process.env.PORT || 4000,
  DATABASE_URL: process.env.DATABASE_URL,
};
