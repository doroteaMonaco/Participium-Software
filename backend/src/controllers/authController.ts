import { Request, Response, NextFunction } from "express";
import { authService } from "@services/authService";
import { throwBadRequestIfMissingObject } from "@utils";
import { BadRequestError } from "@errors/BadRequestError";

export const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV !== "test",
  path: "/",
};

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { identifier, password, role } = req.body || {};

      throwBadRequestIfMissingObject({ identifier, password, role });

      const { user, token } = await authService.login(
        identifier,
        password,
        role,
      );

      res.cookie("authToken", token, cookieOpts);
      res.setHeader("Location", "/reports");

      return res.status(200).json(user);
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        return res.status(400).json({
          error: "Bad Request",
          message: error?.message || "Missing required fields",
        });
      }

      return res.status(401).json({
        error: "Authentication Error",
        message: error?.message || "Invalid username or password",
      });
    }
  },

  async verifyAuth(req: Request, res: Response) {
    try {
      const token = req.cookies?.authToken;

      const user = await authService.verifyAuth(token);
      if (!user) {
        return res.status(401).json({
          error: "Authentication Error",
          message: "Session is invalid or has expired",
        });
      }
      return res.status(200).json(user);
    } catch {
      return res.status(401).json({
        error: "Authentication Error",
        message: "Session is invalid or has expired",
      });
    }
  },

  async logout(req: Request, res: Response) {
    const hasCookie = Boolean(req.cookies?.authToken);
    if (!hasCookie) {
      return res.status(401).json({
        error: "Authentication Error",
        message: "You must be logged in to logout",
      });
    }
    res.clearCookie("authToken", cookieOpts);
    return res.status(204).send();
  },
};
