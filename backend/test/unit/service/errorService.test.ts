import { createAppError } from "@services/errorService";
import { AppError } from "@models/errors/AppError";

jest.mock("@services/loggingService", () => ({
  logError: jest.fn(),
}));

describe("ErrorService", () => {
  describe("createAppError", () => {
    it("should create error DTO for generic error", () => {
      const error = new Error("Test error");
      const result = createAppError(error);

      expect(result).toEqual({
        code: 500,
        error: "Internal Server Error",
        message: "Test error",
      });
    });

    it("should create error DTO for error without message", () => {
      const error = {};
      const result = createAppError(error);

      expect(result).toEqual({
        code: 500,
        error: "Internal Server Error",
        message: "Internal Server Error",
      });
    });

    it("should create error DTO for AppError instance", () => {
      const appError = new AppError("Invalid input", 400);
      const result = createAppError(appError);

      expect(result).toEqual({
        code: 400,
        message: "Invalid input",
      });
    });

    it("should create error DTO for error with status property", () => {
      const error = { status: 404, error: "Not Found", message: "Resource not found" };
      const result = createAppError(error);

      expect(result).toEqual({
        code: 404,
        error: "Not Found",
        message: "Resource not found",
      });
    });

    it("should handle error with numeric status", () => {
      const error = { status: 403, message: "Forbidden" };
      const result = createAppError(error);

      expect(result).toEqual({
        code: 403,
        message: "Forbidden",
      });
    });
  });
});
