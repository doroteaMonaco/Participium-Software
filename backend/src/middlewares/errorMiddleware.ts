import { ErrorDTO, ErrorToJSON } from "@dto/ErrorDTO";
import { createAppError } from "@services/errorService";
import { Request, Response, NextFunction } from "express";

function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  let modelError: ErrorDTO = createAppError(err);
  res.status(modelError.code).json(ErrorToJSON(modelError));
}

export default errorHandler;
