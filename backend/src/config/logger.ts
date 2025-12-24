import winston from "winston";
import { CONFIG } from "./config";

const logger = winston.createLogger({
  level: CONFIG.LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(
      ({ level, message, timestamp }) =>
        `[${timestamp}] ${level.toUpperCase()}: ${message}`,
    ),
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: `${CONFIG.LOG_PATH}/${CONFIG.ERROR_LOG_FILE}`,
      level: "error",
    }),
    new winston.transports.File({
      filename: `${CONFIG.LOG_PATH}/${CONFIG.COMBINED_LOG_FILE}`,
    }),
  ],
});

export default logger;
