import { Request, Response, NextFunction } from "express";
import { authService } from "@services/authService";
import { throwBadRequestIfMissingObject } from "@utils";
import { BadRequestError } from "@errors/BadRequestError";
import { emailVerificationService } from "@services/emailVerificationService";
import { sendVerificationEmail } from "@services/emailService";
import bcrypt from "bcrypt";
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

  async registerWithVerification(req: Request, res: Response) {
    try {
      const { email, username, firstName, lastName, password } = req.body || {};

      throwBadRequestIfMissingObject({
        email,
        username,
        firstName,
        lastName,
        password,
      });

      const existingUser = await prisma.user.findFirst({
        where: { OR: [{ email }, { username }] },
      });

      if (existingUser) {
        return res.status(409).json({
          error: "Conflict Error",
          message: existingUser.email === email ? "Email is already in use" : "Username is already in use",
        });
      }

      const existingPending = await emailVerificationService.getPendingVerification(email);
      if (existingPending) {
        return res.status(409).json({
          error: "Conflict Error",
          message: "Registration already pending verification. Check your email or request a new code.",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const { code } = await emailVerificationService.createPendingVerification(
        email,
        username,
        firstName,
        lastName,
        hashedPassword,
      );

      await sendVerificationEmail({
        email,
        firstName,
        code,
        resendUrl: `${CONFIG.FRONTEND_URL}/verify-email?email=${encodeURIComponent(email)}`,
      });

      logger.info(`Registration verification email sent to ${email}`);

      return res.status(201).json({
        success: true,
        message: "Verification code sent to your email",
        email,
      });
    } catch (error: any) {
      logger.error("Registration with verification error:", error);
      return res.status(400).json({
        error: "Bad Request",
        message: error?.message || "Registration failed",
      });
    }
  },

  async verifyEmailAndRegister(req: Request, res: Response) {
    try {
      const { emailOrUsername, code } = req.body || {};

      throwBadRequestIfMissingObject({ emailOrUsername, code });

      const isValid = await emailVerificationService.verifyCode(emailOrUsername, code);
      if (!isValid) {
        const pending = await emailVerificationService.getPendingVerification(emailOrUsername);
        if (pending && pending.verificationAttempts >= CONFIG.MAX_VERIFICATION_ATTEMPTS) {
          return res.status(400).json({
            error: "Invalid Code",
            message: "Too many verification attempts. Please register again.",
          });
        }
        return res.status(400).json({
          error: "Invalid Code",
          message: "Verification code is invalid or expired",
        });
      }

      const pendingVerification = await emailVerificationService.completePendingVerification(emailOrUsername);
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
        { expiresIn: "7d" }
      );

      res.cookie("authToken", token, cookieOpts);

      logger.info(`User ${pendingVerification.email} registered and verified successfully`);

      return res.status(201).json({
        success: true,
        message: "Email verified and registration completed",
        user: newUser,
      });
    } catch (error: any) {
      logger.error("Email verification error:", error);
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

      const pending = await emailVerificationService.getPendingVerification(emailOrUsername);
      if (!pending) {
        return res.status(404).json({
          error: "Not Found",
          message: "No pending registration found for this email or username",
        });
      }

      const { code } = await emailVerificationService.createPendingVerification(
        pending.email,
        pending.username,
        pending.firstName,
        pending.lastName,
        pending.password,
      );

      await sendVerificationEmail({
        email: pending.email,
        firstName: pending.firstName,
        code,
        resendUrl: `${CONFIG.FRONTEND_URL}/verify-email?email=${encodeURIComponent(pending.email)}`,
      });

      logger.info(`Resent verification code to ${pending.email}`);

      return res.status(200).json({
        success: true,
        message: "Verification code resent to your email",
      });
    } catch (error: any) {
      logger.error("Resend verification code error:", error);
      return res.status(400).json({
        error: "Bad Request",
        message: error?.message || "Failed to resend verification code",
      });
    }
  },
};
