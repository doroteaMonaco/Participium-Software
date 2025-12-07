import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { userRepository } from "@repositories/userRepository";
import { AuthenticationError } from "@errors/AuthenticationError";

import { SECRET_KEY } from "@config";
import { BaseUserDto } from "@dto/userDto";

declare global {
  namespace Express {
    interface Request {
      user?: BaseUserDto;
      role?: string;
    }
  }
}

export const isAuthenticated = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = req.cookies?.authToken;

    if (!token) {
      throw new AuthenticationError("No authentication token provided");
    }

    const decoded = jwt.verify(token, SECRET_KEY) as JwtPayload;

    const user = await userRepository.findUserById(decoded.id, decoded.role);

    req.user = user as BaseUserDto;
    req.role = decoded.role;

    next();
  } catch (error: any) {
    if (error instanceof AuthenticationError) {
      return res.status(401).json({
        error: "Authentication Error",
        message: error?.message || "Missing required fields",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "Authentication Error",
        message: "Token has expired",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        error: "Authentication Error",
        message: "Invalid token",
      });
    }

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Authentication verification failed",
    });
  }
};
