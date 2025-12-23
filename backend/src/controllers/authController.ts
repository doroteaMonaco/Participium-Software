import { Request, Response, NextFunction } from "express";
import { authService } from "@services/authService";
import { throwBadRequestIfMissingObject } from "@utils";
import { BadRequestError } from "@errors/BadRequestError";
import { NotFoundError } from "@errors/NotFoundError";
import { TooManyRequestsError } from "@errors/TooManyRequestsError";
import { emailVerificationService } from "@services/emailVerificationService";
import { sendVerificationEmail } from "@services/emailService";
import { prisma } from "@database";
import logger from "@config/logger";
import { CONFIG, SECRET_KEY } from "@config";
import jwt from "jsonwebtoken";

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

      // Only identifier and password are required, role is optional
      throwBadRequestIfMissingObject({ identifier, password });

      const { user, token } = await authService.login(
        identifier,
        password,
        role, // Can be undefined, authService will search all tables
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

  async verifyEmailAndRegister(req: Request, res: Response) {
    try {
      const { emailOrUsername, code } = req.body || {};

      throwBadRequestIfMissingObject({ emailOrUsername, code });

      await emailVerificationService.verifyCode(emailOrUsername, code);

      const pendingVerification =
        await emailVerificationService.completePendingVerification(
          emailOrUsername,
        );
      if (!pendingVerification) {
        return res.status(400).json({
          error: "Invalid Code",
          message: "Verification code not found or expired",
        });
      }

      const newUser = await prisma.user.create({
        data: {
          email: pendingVerification.email,
          username: pendingVerification.username,
          password: pendingVerification.password,
          firstName: pendingVerification.firstName,
          lastName: pendingVerification.lastName,
        },
      });

      const token = jwt.sign(
        { id: newUser.id, email: newUser.email, role: "CITIZEN" },
        SECRET_KEY,
        { expiresIn: "7d" },
      );

      res.cookie("authToken", token, cookieOpts);
      res.setHeader("Location", "/reports");

      logger.info(
        `User ${pendingVerification.email} registered and verified successfully`,
      );

      return res.status(201).json({
        success: true,
        message: "Email verified and registration completed",
        user: newUser,
      });
    } catch (error: any) {
      logger.error("Email verification error:", error);
      if (error instanceof BadRequestError) {
        return res.status(400).json({
          error: "Bad Request",
          message: error?.message || "Missing required fields",
        });
      }
      if (error instanceof NotFoundError) {
        return res.status(404).json({
          error: "Not Found",
          message: error?.message || "No pending verification found",
        });
      }
      if (error instanceof TooManyRequestsError) {
        return res.status(429).json({
          error: "Too Many Attempts",
          message: error?.message || "Too many verification attempts",
        });
      }

      return res.status(400).json({
        error: "Bad Request",
        message: error?.message || "Verification failed",
      });
    }
  },

  async resendVerificationCode(req: Request, res: Response) {
    try {
      const { emailOrUsername } = req.body || {};

      throwBadRequestIfMissingObject({ emailOrUsername });

      const { email, firstName, code } =
        await emailVerificationService.resendCode(emailOrUsername);

      await sendVerificationEmail({
        email,
        firstName,
        code,
        resendUrl: `${CONFIG.FRONTEND_URL}/verify-email?email=${encodeURIComponent(email)}`,
      });

      logger.info(`Resent verification code to ${email}`);

      return res.status(200).json({
        success: true,
        message: "Verification code resent to your email",
      });
    } catch (error: any) {
      logger.error("Resend verification code error:", error);
      if (error instanceof NotFoundError) {
        return res.status(404).json({
          error: "Not Found",
          message: error?.message || "No pending verification found",
        });
      }
      if (error instanceof TooManyRequestsError) {
        return res.status(429).json({
          error: "Too Many Attempts",
          message: error?.message || "Too many verification attempts",
        });
      }

      return res.status(400).json({
        error: "Bad Request",
        message: error?.message || "Failed to resend verification code",
      });
    }
  },
};
