import { Request, Response } from "express";

jest.mock("@services/authService", () => ({
  authService: {
    registerUser: jest.fn(),
    login: jest.fn(),
    verifyAuth: jest.fn(),
  },
}));

jest.mock("@services/emailVerificationService", () => ({
  emailVerificationService: {
    getPendingVerification: jest.fn(),
    createPendingVerification: jest.fn(),
    resendCode: jest.fn(),
    verifyEmail: jest.fn(),
    verifyCode: jest.fn(),
    completePendingVerification: jest.fn(),
  },
}));

jest.mock("@services/emailService", () => ({
  sendVerificationEmail: jest.fn(),
}));

jest.mock("bcrypt", () => ({
  hash: jest.fn(),
}));

jest.mock("@database", () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

import { authController } from "@controllers/authController";
import { authService } from "@services/authService";
import { emailVerificationService } from "@services/emailVerificationService";
import { sendVerificationEmail } from "@services/emailService";
import { prisma } from "@database";
import { roleType } from "@models/enums";
import { BadRequestError } from "@errors/BadRequestError";
import { NotFoundError } from "@errors/NotFoundError";
import { TooManyRequestsError } from "@errors/TooManyRequestsError";

type ResMock = Partial<Response> & {
  status: jest.Mock;
  json: jest.Mock;
  setHeader: jest.Mock;
  send: jest.Mock;
  cookie: jest.Mock;
  clearCookie: jest.Mock;
};

const makeRes = (): ResMock => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res); // <-- usa cookie(), non setHeader('Set-Cookie', ...)
  res.clearCookie = jest.fn().mockReturnValue(res); // <-- per logout
  return res;
};

const makeUser = (overrides: Partial<any> = {}) => ({
  id: 1,
  email: "mario.rossi@example.com",
  username: "mrossi",
  firstName: "Mario",
  lastName: "Rossi",
  password: "hashed",
  ...overrides,
});

describe("authController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------- login ----------
  describe("login", () => {
    it("returns 200, sets cookie and Location, and returns sanitized user", async () => {
      const req = {
        body: {
          identifier: "mrossi",
          password: "plain",
          role: roleType.CITIZEN,
        },
      } as unknown as Request;
      const res = makeRes();

      const user = makeUser();
      (authService.login as jest.Mock).mockResolvedValue({
        user,
        token: "jwt-abc",
      });

      await authController.login(req, res as unknown as Response, jest.fn());

      expect(authService.login).toHaveBeenCalledWith(
        "mrossi",
        "plain",
        roleType.CITIZEN,
      );
      expect(res.cookie).toHaveBeenCalledWith(
        "authToken",
        "jwt-abc",
        expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/" }),
      );
      expect(res.setHeader).toHaveBeenCalledWith("Location", "/reports");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ ...user, token: "jwt-abc" });
    });

    it("returns 401 on authentication errors", async () => {
      const req = {
        body: {
          identifier: "mrossi",
          password: "wrong",
          role: roleType.CITIZEN,
        },
      } as unknown as Request;
      const res = makeRes();

      (authService.login as jest.Mock).mockRejectedValue(
        new Error("Invalid password"),
      );

      await authController.login(req, res as unknown as Response, jest.fn());

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Authentication Error",
        message: "Invalid password",
      });
    });

    it("returns 400 when identifier or password are missing", async () => {
      const req = {
        body: { identifier: "mrossi" }, // missing password
      } as unknown as Request;
      const res = makeRes();

      await authController.login(req, res as unknown as Response, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Bad Request" }),
      );
    });

    it("returns 400 when throwing BadRequestError", async () => {
      const req = {
        body: {
          identifier: "mrossi",
          password: "wrong",
        },
      } as unknown as Request;
      const res = makeRes();

      (authService.login as jest.Mock).mockRejectedValue(
        new BadRequestError("Invalid input format"),
      );

      await authController.login(req, res as unknown as Response, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Bad Request",
        message: "Invalid input format",
      });
    });

    it("handles login with no body", async () => {
      const req = {} as unknown as Request;
      const res = makeRes();

      await authController.login(req, res as unknown as Response, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ---------- verifyAuth ----------
  describe("verifyAuth", () => {
    it("returns 200 and sanitized user on success", async () => {
      const fullUser = makeUser({ id: 7 });
      const req = { cookies: { authToken: "ok" } } as unknown as Request;
      const res = makeRes();

      (authService.verifyAuth as jest.Mock).mockResolvedValue(fullUser);

      await authController.verifyAuth(req, res as unknown as Response);

      expect(authService.verifyAuth).toHaveBeenCalledWith("ok");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ ...fullUser, token: "ok" });
    });

    it("returns 401 when user is not found", async () => {
      const req = { cookies: { authToken: "expired" } } as unknown as Request;
      const res = makeRes();

      (authService.verifyAuth as jest.Mock).mockResolvedValue(null);

      await authController.verifyAuth(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Authentication Error",
        message: "Session is invalid or has expired",
      });
    });

    it("returns 401 on verification error", async () => {
      const req = { cookies: { authToken: "bad" } } as unknown as Request;
      const res = makeRes();

      (authService.verifyAuth as jest.Mock).mockRejectedValue(
        new Error("Invalid or expired token"),
      );

      await authController.verifyAuth(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Authentication Error",
        message: "Session is invalid or has expired", // <-- messaggio del tuo controller
      });
    });
  });

  // ---------- logout ----------
  describe("logout", () => {
    it("returns 204 and clears cookie when authenticated", async () => {
      const req = { cookies: { authToken: "jwt" } } as unknown as Request; // <-- simula cookie presente
      const res = makeRes();

      await authController.logout(req, res as unknown as Response);

      expect(res.clearCookie).toHaveBeenCalledWith(
        "authToken",
        expect.any(Object),
      );
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it("returns 401 when not authenticated (no cookie)", async () => {
      const req = {} as unknown as Request; // <-- nessun cookie
      const res = makeRes();

      await authController.logout(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Authentication Error",
        message: "You must be logged in to logout",
      });
    });
  });

  // ---------- verifyEmailAndRegister ----------
  describe("verifyEmailAndRegister", () => {
    it("returns 201 when email verification is successful and user is created", async () => {
      const req = {
        body: {
          emailOrUsername: "newuser@example.com",
          code: "123456",
        },
      } as unknown as Request;
      const res = makeRes();

      (emailVerificationService.verifyCode as jest.Mock).mockResolvedValue(
        true,
      );
      (
        emailVerificationService.completePendingVerification as jest.Mock
      ).mockResolvedValue({
        email: "newuser@example.com",
        username: "newuser",
        firstName: "New",
        lastName: "User",
        password: "hashed_password",
      });
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 1,
        email: "newuser@example.com",
        username: "newuser",
        firstName: "New",
        lastName: "User",
      });

      await authController.verifyEmailAndRegister(
        req,
        res as unknown as Response,
      );

      expect(emailVerificationService.verifyCode).toHaveBeenCalledWith(
        "newuser@example.com",
        "123456",
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("returns 400 if verification code is invalid", async () => {
      const req = {
        body: {
          emailOrUsername: "newuser@example.com",
          code: "invalid",
        },
      } as unknown as Request;
      const res = makeRes();

      (emailVerificationService.verifyCode as jest.Mock).mockRejectedValue(
        new Error("Invalid verification code"),
      );
      (
        emailVerificationService.getPendingVerification as jest.Mock
      ).mockResolvedValue(null);

      await authController.verifyEmailAndRegister(
        req,
        res as unknown as Response,
      );

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 when too many verification attempts made", async () => {
      const req = {
        body: {
          emailOrUsername: "newuser@example.com",
          code: "invalid",
        },
      } as unknown as Request;
      const res = makeRes();

      (emailVerificationService.verifyCode as jest.Mock).mockRejectedValue(
        new Error("Too many verification attempts"),
      );
      (
        emailVerificationService.getPendingVerification as jest.Mock
      ).mockResolvedValue({
        email: "newuser@example.com",
        verificationAttempts: 10,
      });

      await authController.verifyEmailAndRegister(
        req,
        res as unknown as Response,
      );

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 if verification code is expired", async () => {
      const req = {
        body: {
          emailOrUsername: "newuser@example.com",
          code: "invalid",
        },
      } as unknown as Request;
      const res = makeRes();

      (emailVerificationService.verifyCode as jest.Mock).mockRejectedValue(
        new Error("Verification code has expired"),
      );
      (
        emailVerificationService.getPendingVerification as jest.Mock
      ).mockResolvedValue(null);

      await authController.verifyEmailAndRegister(
        req,
        res as unknown as Response,
      );

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 if pending verification not found after successful code verification", async () => {
      const req = {
        body: {
          emailOrUsername: "newuser@example.com",
          code: "123456",
        },
      } as unknown as Request;
      const res = makeRes();

      (emailVerificationService.verifyCode as jest.Mock).mockResolvedValue(
        true,
      );
      (
        emailVerificationService.completePendingVerification as jest.Mock
      ).mockResolvedValue(null);

      await authController.verifyEmailAndRegister(
        req,
        res as unknown as Response,
      );

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 on verification completion error", async () => {
      const req = {
        body: {
          emailOrUsername: "newuser@example.com",
          code: "123456",
        },
      } as unknown as Request;
      const res = makeRes();

      (emailVerificationService.verifyCode as jest.Mock).mockResolvedValue(
        true,
      );
      (
        emailVerificationService.completePendingVerification as jest.Mock
      ).mockRejectedValue(new Error("Database error"));

      await authController.verifyEmailAndRegister(
        req,
        res as unknown as Response,
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Bad Request",
          message: "Database error",
        }),
      );
    });

    it("returns 400 if required fields are missing (code)", async () => {
      const req = {
        body: {
          emailOrUsername: "newuser@example.com",
        },
      } as unknown as Request;
      const res = makeRes();

      await authController.verifyEmailAndRegister(
        req,
        res as unknown as Response,
      );

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 if emailOrUsername is missing", async () => {
      const req = {
        body: {
          code: "123456",
        },
      } as unknown as Request;
      const res = makeRes();

      await authController.verifyEmailAndRegister(
        req,
        res as unknown as Response,
      );

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 when verifyCode throws error", async () => {
      const req = {
        body: {
          emailOrUsername: "newuser@example.com",
          code: "invalid",
        },
      } as unknown as Request;
      const res = makeRes();

      (emailVerificationService.verifyCode as jest.Mock).mockRejectedValue(
        new Error("Database error"),
      );

      await authController.verifyEmailAndRegister(
        req,
        res as unknown as Response,
      );

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("successfully creates user, sets JWT token and calls all response methods", async () => {
      const req = {
        body: {
          emailOrUsername: "verify@example.com",
          code: "654321",
        },
      } as unknown as Request;
      const res = makeRes();

      (emailVerificationService.verifyCode as jest.Mock).mockResolvedValue(
        true,
      );
      (
        emailVerificationService.completePendingVerification as jest.Mock
      ).mockResolvedValue({
        email: "verify@example.com",
        username: "verify_user",
        firstName: "Verify",
        lastName: "User",
        password: "hashed_password",
      });
      const newUser = {
        id: 99,
        email: "verify@example.com",
        username: "verify_user",
        firstName: "Verify",
        lastName: "User",
      };
      (prisma.user.create as jest.Mock).mockResolvedValue(newUser);

      await authController.verifyEmailAndRegister(
        req,
        res as unknown as Response,
      );

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: "verify@example.com",
          username: "verify_user",
          firstName: "Verify",
          lastName: "User",
          password: "hashed_password",
        },
      });
      expect(res.cookie).toHaveBeenCalledWith(
        "authToken",
        expect.any(String),
        expect.any(Object),
      );
      expect(res.setHeader).toHaveBeenCalledWith("Location", "/reports");
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Email verified and registration completed",
          user: newUser,
        }),
      );
    });

    it("calls logger.info on successful verification", async () => {
      const req = {
        body: {
          emailOrUsername: "logged@example.com",
          code: "111111",
        },
      } as unknown as Request;
      const res = makeRes();

      const pendingVerif = {
        email: "logged@example.com",
        username: "logged_user",
        firstName: "Log",
        lastName: "Ger",
        password: "pass",
      };

      (emailVerificationService.verifyCode as jest.Mock).mockResolvedValue(
        true,
      );
      (
        emailVerificationService.completePendingVerification as jest.Mock
      ).mockResolvedValue(pendingVerif);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 88,
        ...pendingVerif,
      });

      await authController.verifyEmailAndRegister(
        req,
        res as unknown as Response,
      );

      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  // ---------- resendVerificationCode ----------
  describe("resendVerificationCode", () => {
    it("returns 200 when verification code is resent successfully", async () => {
      const req = {
        body: {
          emailOrUsername: "newuser@example.com",
        },
      } as unknown as Request;
      const res = makeRes();
      (emailVerificationService.resendCode as jest.Mock).mockResolvedValue({
        email: "newuser@example.com",
        firstName: "New",
        code: "654321",
      });
      (sendVerificationEmail as jest.Mock).mockResolvedValue(true);

      await authController.resendVerificationCode(
        req,
        res as unknown as Response,
      );

      expect(emailVerificationService.resendCode).toHaveBeenCalledWith(
        "newuser@example.com",
      );
      expect(sendVerificationEmail).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns 404 if emailOrUsername not found in pending verifications", async () => {
      const req = {
        body: {
          emailOrUsername: "nonexistent@example.com",
        },
      } as unknown as Request;
      const res = makeRes();
      (emailVerificationService.resendCode as jest.Mock).mockRejectedValue(
        new NotFoundError("No pending verification found"),
      );

      await authController.resendVerificationCode(
        req,
        res as unknown as Response,
      );

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "Not Found",
        message: "No pending verification found",
      });
    });

    it("returns 400 if email sending fails", async () => {
      const req = {
        body: {
          emailOrUsername: "newuser@example.com",
        },
      } as unknown as Request;
      const res = makeRes();
      (emailVerificationService.resendCode as jest.Mock).mockResolvedValue({
        email: "newuser@example.com",
        firstName: "New",
        code: "654321",
      });
      (sendVerificationEmail as jest.Mock).mockRejectedValue(
        new Error("Email service unavailable"),
      );

      await authController.resendVerificationCode(
        req,
        res as unknown as Response,
      );

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 if emailOrUsername is missing", async () => {
      const req = {
        body: {},
      } as unknown as Request;
      const res = makeRes();

      await authController.resendVerificationCode(
        req,
        res as unknown as Response,
      );

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 on database error when getting pending verification", async () => {
      const req = {
        body: {
          emailOrUsername: "newuser@example.com",
        },
      } as unknown as Request;
      const res = makeRes();
      (emailVerificationService.resendCode as jest.Mock).mockRejectedValue(
        new Error("Database error"),
      );

      await authController.resendVerificationCode(
        req,
        res as unknown as Response,
      );

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 when createPendingVerification throws error", async () => {
      const req = {
        body: {
          emailOrUsername: "newuser@example.com",
        },
      } as unknown as Request;
      const res = makeRes();
      (emailVerificationService.resendCode as jest.Mock).mockRejectedValue(
        new Error("Code generation failed"),
      );

      await authController.resendVerificationCode(
        req,
        res as unknown as Response,
      );

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("successfully resends code and sends verification email with all parameters", async () => {
      const req = {
        body: {
          emailOrUsername: "resend@example.com",
        },
      } as unknown as Request;
      const res = makeRes();

      (emailVerificationService.resendCode as jest.Mock).mockResolvedValue({
        email: "resend@example.com",
        firstName: "Resend",
        code: "999999",
      });
      (sendVerificationEmail as jest.Mock).mockResolvedValue(true);

      await authController.resendVerificationCode(
        req,
        res as unknown as Response,
      );

      expect(emailVerificationService.resendCode).toHaveBeenCalledWith(
        "resend@example.com",
      );
      expect(sendVerificationEmail).toHaveBeenCalledWith({
        email: "resend@example.com",
        firstName: "Resend",
        code: "999999",
        resendUrl: expect.stringContaining("verify-email?email=resend"),
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Verification code resent to your email",
      });
    });

    it("returns 429 when too many resend attempts", async () => {
      const req = {
        body: {
          emailOrUsername: "toomany@example.com",
        },
      } as unknown as Request;
      const res = makeRes();

      (emailVerificationService.resendCode as jest.Mock).mockRejectedValue(
        new TooManyRequestsError("Too many verification attempts"),
      );

      await authController.resendVerificationCode(
        req,
        res as unknown as Response,
      );

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        error: "Too Many Attempts",
        message: "Too many verification attempts",
      });
    });
  });
});
