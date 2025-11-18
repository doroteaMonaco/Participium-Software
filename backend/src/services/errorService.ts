import { ErrorDTO, createErrorDTO } from "../models/dto/ErrorDTO";
import { AppError } from "../models/errors/AppError";
import { logError } from "./loggingService";

export function createAppError(err: any): ErrorDTO {
  let modelError: ErrorDTO = createErrorDTO(
    500,
    "Internal Server Error",
    err?.message || "Internal Server Error",
  );

  logError(err);
  logError(
    `Error: ${err?.message}\nStacktrace:\n${
      err?.stack || "No stacktrace available"
    }`,
  );

  if (
    err instanceof AppError ||
    (err.status && typeof err.status === "number")
  ) {
    modelError = createErrorDTO(err.status, err.error, err.message);
  }

  return modelError;
}
