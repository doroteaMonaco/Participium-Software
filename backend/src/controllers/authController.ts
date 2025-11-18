import { Request, Response } from "express";
import { authService } from "@services/authService";

export const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV !== "test",
  path: "/",
};

export const authController = {
  async login(req: Request, res: Response) {
    try {
      const { identifier, password } = req.body || {};
      if (!identifier || !password) {
        return res.status(400).json({
          error: "Bad Request",
          message: "identifier and password are required",
        });
      }

      const { user, token } = await authService.login(identifier, password);

      res.cookie("authToken", token, cookieOpts);
      res.setHeader("Location", "/reports");

      return res.status(200).json({
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        role: user.role,
      });
    } catch (error: any) {
      return res.status(401).json({
        error: "Authentication Error",
        message: error?.message || "Invalid username or password",
      });
    }
  },

  async verifyAuth(req: Request, res: Response) {
    try {
      const user = await authService.verifyAuth(req);
      return res.status(200).json({
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        role: user.role,
      });
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
