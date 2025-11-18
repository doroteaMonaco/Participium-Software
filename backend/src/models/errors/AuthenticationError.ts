import { AppError } from "./AppError";

export class AuthenticationError extends AppError {
  constructor(message: string) {
    super(message, 401);
    this.name = "Authentication Error";
  }
}
