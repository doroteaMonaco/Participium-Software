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
import bcrypt from "bcrypt";
import { roleType } from "@models/enums";
import { BadRequestError } from "@errors/BadRequestError";

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
      expect(res.json).toHaveBeenCalledWith(user);
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
      expect(res.json).toHaveBeenCalledWith(fullUser);
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

  // ---------- registerWithVerification ----------
  describe("registerWithVerification", () => {
    it("returns 201 and sends verification email on successful registration", async () => {
      const req = {
        body: {
          username: "newuser",
          email: "newuser@example.com",
          firstName: "New",
          lastName: "User",
          password: "password123",
        },
      } as unknown as Request;
      const res = makeRes();

      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (emailVerificationService.getPendingVerification as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed_password");
      (emailVerificationService.createPendingVerification as jest.Mock).mockResolvedValue({
        code: "123456",
        email: "newuser@example.com",
      });
      (sendVerificationEmail as jest.Mock).mockResolvedValue(true);

      await authController.registerWithVerification(req, res as unknown as Response);

      expect(emailVerificationService.createPendingVerification).toHaveBeenCalled();
      expect(sendVerificationEmail).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("returns 409 if email already exists", async () => {
      const req = {
        body: {
          username: "newuser",
          email: "existing@example.com",
          firstName: "New",
          lastName: "User",
          password: "password123",
        },
      } as unknown as Request;
      const res = makeRes();

      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        email: "existing@example.com",
      });

      await authController.registerWithVerification(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("returns 409 if username already exists", async () => {
      const req = {
        body: {
          username: "existinguser",
          email: "newuser@example.com",
          firstName: "New",
          lastName: "User",
          password: "password123",
        },
      } as unknown as Request;
      const res = makeRes();

      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        username: "existinguser",
      });

      await authController.registerWithVerification(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("Username is already in use"),
        }),
      );
    });

    it("returns 409 if registration already pending verification", async () => {
      const req = {
        body: {
          username: "newuser",
          email: "pending@example.com",
          firstName: "New",
          lastName: "User",
          password: "password123",
        },
      } as unknown as Request;
      const res = makeRes();

      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (emailVerificationService.getPendingVerification as jest.Mock).mockResolvedValue({
        email: "pending@example.com",
        username: "newuser",
      });

      await authController.registerWithVerification(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("returns 400 if verification code generation fails", async () => {
      const req = {
        body: {
          username: "newuser",
          email: "newuser@example.com",
          firstName: "New",
          lastName: "User",
          password: "password123",
        },
      } as unknown as Request;
      const res = makeRes();

      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (emailVerificationService.getPendingVerification as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed_password");
      (emailVerificationService.createPendingVerification as jest.Mock).mockRejectedValue(
        new Error("Code generation failed"),
      );

      await authController.registerWithVerification(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 if email sending fails", async () => {
      const req = {
        body: {
          username: "newuser",
          email: "newuser@example.com",
          firstName: "New",
          lastName: "User",
          password: "password123",
        },
      } as unknown as Request;
      const res = makeRes();

      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (emailVerificationService.getPendingVerification as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed_password");
      (emailVerificationService.createPendingVerification as jest.Mock).mockResolvedValue({
        code: "123456",
      });
      (sendVerificationEmail as jest.Mock).mockRejectedValue(
        new Error("Email service unavailable"),
      );

      await authController.registerWithVerification(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 if required fields are missing", async () => {
      const req = {
        body: {
          username: "newuser",
          email: "newuser@example.com",
        },
      } as unknown as Request;
      const res = makeRes();

      await authController.registerWithVerification(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 if required fields are missing", async () => {
      const req = {
        body: {
          username: "newuser",
          email: "newuser@example.com",
        },
      } as unknown as Request;
      const res = makeRes();

      await authController.registerWithVerification(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(400);
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

      (emailVerificationService.verifyCode as jest.Mock).mockResolvedValue(true);
      (emailVerificationService.completePendingVerification as jest.Mock).mockResolvedValue({
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

      await authController.verifyEmailAndRegister(req, res as unknown as Response);

      expect(emailVerificationService.verifyCode).toHaveBeenCalledWith("newuser@example.com", "123456");
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

      (emailVerificationService.verifyCode as jest.Mock).mockResolvedValue(false);
      (emailVerificationService.getPendingVerification as jest.Mock).mockResolvedValue(null);

      await authController.verifyEmailAndRegister(req, res as unknown as Response);

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

      (emailVerificationService.verifyCode as jest.Mock).mockResolvedValue(false);
      (emailVerificationService.getPendingVerification as jest.Mock).mockResolvedValue({
        email: "newuser@example.com",
        verificationAttempts: 10,
      });

      await authController.verifyEmailAndRegister(req, res as unknown as Response);

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

      (emailVerificationService.verifyCode as jest.Mock).mockResolvedValue(false);
      (emailVerificationService.getPendingVerification as jest.Mock).mockResolvedValue(null);

      await authController.verifyEmailAndRegister(req, res as unknown as Response);

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

      (emailVerificationService.verifyCode as jest.Mock).mockResolvedValue(true);
      (emailVerificationService.completePendingVerification as jest.Mock).mockResolvedValue(null);

      await authController.verifyEmailAndRegister(req, res as unknown as Response);

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

      (emailVerificationService.verifyCode as jest.Mock).mockResolvedValue(true);
      (emailVerificationService.completePendingVerification as jest.Mock).mockRejectedValue(
        new Error("Database error"),
      );

      await authController.verifyEmailAndRegister(req, res as unknown as Response);

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

      await authController.verifyEmailAndRegister(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 if emailOrUsername is missing", async () => {
      const req = {
        body: {
          code: "123456",
        },
      } as unknown as Request;
      const res = makeRes();

      await authController.verifyEmailAndRegister(req, res as unknown as Response);

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

      await authController.verifyEmailAndRegister(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(400);
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

      (emailVerificationService.getPendingVerification as jest.Mock).mockResolvedValue({
        email: "newuser@example.com",
        username: "newuser",
        firstName: "New",
        lastName: "User",
        password: "hashed_password",
      });
      (emailVerificationService.createPendingVerification as jest.Mock).mockResolvedValue({
        code: "654321",
      });
      (sendVerificationEmail as jest.Mock).mockResolvedValue(true);

      await authController.resendVerificationCode(req, res as unknown as Response);

      expect(emailVerificationService.getPendingVerification).toHaveBeenCalledWith("newuser@example.com");
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

      (emailVerificationService.getPendingVerification as jest.Mock).mockResolvedValue(null);

      await authController.resendVerificationCode(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 400 if email sending fails", async () => {
      const req = {
        body: {
          emailOrUsername: "newuser@example.com",
        },
      } as unknown as Request;
      const res = makeRes();

      (emailVerificationService.getPendingVerification as jest.Mock).mockResolvedValue({
        email: "newuser@example.com",
        username: "newuser",
        firstName: "New",
        lastName: "User",
        password: "hashed_password",
      });
      (emailVerificationService.createPendingVerification as jest.Mock).mockResolvedValue({
        code: "654321",
      });
      (sendVerificationEmail as jest.Mock).mockRejectedValue(
        new Error("Email service unavailable"),
      );

      await authController.resendVerificationCode(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 if emailOrUsername is missing", async () => {
      const req = {
        body: {},
      } as unknown as Request;
      const res = makeRes();

      await authController.resendVerificationCode(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 on database error when getting pending verification", async () => {
      const req = {
        body: {
          emailOrUsername: "newuser@example.com",
        },
      } as unknown as Request;
      const res = makeRes();

      (emailVerificationService.getPendingVerification as jest.Mock).mockRejectedValue(
        new Error("Database error"),
      );

      await authController.resendVerificationCode(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 when createPendingVerification throws error", async () => {
      const req = {
        body: {
          emailOrUsername: "newuser@example.com",
        },
      } as unknown as Request;
      const res = makeRes();

      (emailVerificationService.getPendingVerification as jest.Mock).mockResolvedValue({
        email: "newuser@example.com",
        username: "newuser",
        firstName: "New",
        lastName: "User",
        password: "hashed_password",
      });
      (emailVerificationService.createPendingVerification as jest.Mock).mockRejectedValue(
        new Error("Code generation failed"),
      );

      await authController.resendVerificationCode(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
