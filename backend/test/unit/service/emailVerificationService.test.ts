jest.mock("@database", () => ({
  prisma: {
    pending_verification_user: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

jest.mock("bcrypt", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock("@config/logger", () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { emailVerificationService } from "@services/emailVerificationService";
import { prisma } from "@database";
import bcrypt from "bcrypt";
import logger from "@config/logger";
import { CONFIG } from "@config";

type PrismaType = {
  pending_verification_user: {
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    deleteMany: jest.Mock;
  };
};

const db = prisma as unknown as PrismaType;

const makePendingUser = (overrides: Partial<any> = {}) => ({
  id: 1,
  username: "testuser",
  email: "test@example.com",
  firstName: "Test",
  lastName: "User",
  password: "hashed-password",
  verificationCodeHash: "hashed-code-123",
  verificationCodeExpiry: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
  verificationAttempts: 0,
  createdAt: new Date(),
  ...overrides,
});

describe("emailVerificationService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("generateVerificationCode", () => {
    it("generates a code of correct length", async () => {
      const code = await emailVerificationService.generateVerificationCode();

      expect(code).toHaveLength(CONFIG.VERIFICATION_CODE_LENGTH);
      expect(/^\d+$/.test(code)).toBe(true);
    });

    it("generates random codes", async () => {
      const codes = new Set<string>();
      for (let i = 0; i < 10; i++) {
        const code = await emailVerificationService.generateVerificationCode();
        codes.add(code);
      }

      expect(codes.size).toBeGreaterThan(1);
    });

    it("generates codes with leading zeros if needed", async () => {
      let hasLeadingZero = false;
      for (let i = 0; i < 100; i++) {
        const code = await emailVerificationService.generateVerificationCode();
        if (code.startsWith("0")) {
          hasLeadingZero = true;
          break;
        }
      }
      const code = await emailVerificationService.generateVerificationCode();
      expect(/^\d{6}$/.test(code)).toBe(true);
    });
  });

  describe("hashCode", () => {
    it("hashes a code using bcrypt", async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-code-abc123");

      const result = await emailVerificationService.hashCode("123456");

      expect(result).toBe("hashed-code-abc123");
      expect(bcrypt.hash).toHaveBeenCalledWith("123456", 10);
    });

    it("throws if bcrypt fails", async () => {
      (bcrypt.hash as jest.Mock).mockRejectedValue(new Error("Hash failed"));

      await expect(emailVerificationService.hashCode("123456")).rejects.toThrow(
        "Hash failed",
      );
    });
  });

  describe("verifyCodeHash", () => {
    it("returns true when code matches hash", async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await emailVerificationService.verifyCodeHash(
        "123456",
        "hashed-code-abc123",
      );

      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        "123456",
        "hashed-code-abc123",
      );
    });

    it("returns false when code does not match hash", async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await emailVerificationService.verifyCodeHash(
        "654321",
        "hashed-code-abc123",
      );

      expect(result).toBe(false);
    });

    it("throws if bcrypt.compare fails", async () => {
      (bcrypt.compare as jest.Mock).mockRejectedValue(
        new Error("Compare failed"),
      );

      await expect(
        emailVerificationService.verifyCodeHash("123456", "hashed-code-abc123"),
      ).rejects.toThrow("Compare failed");
    });
  });

  describe("createPendingVerification", () => {
    it("creates a pending verification with correct data", async () => {
      const mockCode = "123456";
      const mockCodeHash = "hashed-123456";

      jest
        .spyOn(emailVerificationService, "generateVerificationCode")
        .mockResolvedValue(mockCode);
      jest
        .spyOn(emailVerificationService, "hashCode")
        .mockResolvedValue(mockCodeHash);

      const createdUser = makePendingUser({ id: 1 });
      db.pending_verification_user.create.mockResolvedValue(createdUser);

      const result = await emailVerificationService.createPendingVerification(
        "test@example.com",
        "testuser",
        "Test",
        "User",
        "hashed-password",
      );

      expect(result.code).toBe(mockCode);
      expect(result.expiresIn).toBe(
        CONFIG.VERIFICATION_CODE_EXPIRY_MINUTES * 60,
      );

      expect(db.pending_verification_user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: "test@example.com",
          username: "testuser",
          firstName: "Test",
          lastName: "User",
          password: "hashed-password",
          verificationCodeHash: mockCodeHash,
        }),
      });
    });

    it("deletes existing pending verification for same email", async () => {
      const mockCode = "123456";
      const mockCodeHash = "hashed-123456";

      jest
        .spyOn(emailVerificationService, "generateVerificationCode")
        .mockResolvedValue(mockCode);
      jest
        .spyOn(emailVerificationService, "hashCode")
        .mockResolvedValue(mockCodeHash);

      const createdUser = makePendingUser();
      db.pending_verification_user.create.mockResolvedValue(createdUser);

      await emailVerificationService.createPendingVerification(
        "test@example.com",
        "testuser",
        "Test",
        "User",
        "hashed-password",
      );

      expect(db.pending_verification_user.deleteMany).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
      });
    });

    it("sets correct expiry time", async () => {
      const mockCode = "123456";
      const mockCodeHash = "hashed-123456";

      jest
        .spyOn(emailVerificationService, "generateVerificationCode")
        .mockResolvedValue(mockCode);
      jest
        .spyOn(emailVerificationService, "hashCode")
        .mockResolvedValue(mockCodeHash);

      const createdUser = makePendingUser();
      db.pending_verification_user.create.mockResolvedValue(createdUser);

      const beforeTime = Date.now();
      await emailVerificationService.createPendingVerification(
        "test@example.com",
        "testuser",
        "Test",
        "User",
        "hashed-password",
      );
      const afterTime = Date.now();

      const callArgs = (db.pending_verification_user.create as jest.Mock).mock
        .calls[0][0];
      const expiryTime = callArgs.data.verificationCodeExpiry.getTime();
      const expectedExpiry =
        CONFIG.VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000;

      expect(expiryTime).toBeGreaterThanOrEqual(
        beforeTime + expectedExpiry - 1000,
      );
      expect(expiryTime).toBeLessThanOrEqual(afterTime + expectedExpiry + 1000);
    });
  });

  describe("getPendingVerification", () => {
    it("finds pending verification by email", async () => {
      const pending = makePendingUser();
      db.pending_verification_user.findFirst.mockResolvedValue(pending);

      const result =
        await emailVerificationService.getPendingVerification(
          "test@example.com",
        );

      expect(result).toEqual(pending);
      expect(db.pending_verification_user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ email: "test@example.com" }, { username: "test@example.com" }],
        },
      });
    });

    it("finds pending verification by username", async () => {
      const pending = makePendingUser();
      db.pending_verification_user.findFirst.mockResolvedValue(pending);

      const result =
        await emailVerificationService.getPendingVerification("testuser");

      expect(result).toEqual(pending);
      expect(db.pending_verification_user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ email: "testuser" }, { username: "testuser" }],
        },
      });
    });

    it("returns null when pending verification not found", async () => {
      db.pending_verification_user.findFirst.mockResolvedValue(null);

      const result = await emailVerificationService.getPendingVerification(
        "nonexistent@example.com",
      );

      expect(result).toBeNull();
    });
  });

  describe("verifyCode", () => {
    it("resolves for valid non-expired code", async () => {
      const pending = makePendingUser();
      db.pending_verification_user.findFirst.mockResolvedValue(pending);

      jest
        .spyOn(emailVerificationService, "verifyCodeHash")
        .mockResolvedValue(true);

      await expect(
        emailVerificationService.verifyCode("test@example.com", "123456"),
      ).resolves.toBeUndefined();
    });

    it("rejects when pending verification not found", async () => {
      db.pending_verification_user.findFirst.mockResolvedValue(null);

      await expect(
        emailVerificationService.verifyCode(
          "nonexistent@example.com",
          "123456",
        ),
      ).rejects.toThrow("No pending verification found");

      expect(logger.warn).toHaveBeenCalledWith(
        "No pending verification found for nonexistent@example.com",
      );
    });

    it("rejects and deletes expired code", async () => {
      const expiredPending = makePendingUser({
        verificationCodeExpiry: new Date(Date.now() - 1000), // Expired 1 second ago
      });
      db.pending_verification_user.findFirst.mockResolvedValue(expiredPending);

      await expect(
        emailVerificationService.verifyCode("test@example.com", "123456"),
      ).rejects.toThrow("Verification code has expired");

      expect(logger.warn).toHaveBeenCalledWith(
        "Verification code expired for test@example.com",
      );
      expect(db.pending_verification_user.delete).toHaveBeenCalledWith({
        where: { id: expiredPending.id },
      });
    });

    it("rejects and deletes when max attempts exceeded", async () => {
      const maxAttemptsPending = makePendingUser({
        verificationAttempts: CONFIG.MAX_VERIFICATION_ATTEMPTS,
      });
      db.pending_verification_user.findFirst.mockResolvedValue(
        maxAttemptsPending,
      );

      await expect(
        emailVerificationService.verifyCode("test@example.com", "123456"),
      ).rejects.toThrow("Too many verification attempts");

      expect(logger.warn).toHaveBeenCalledWith(
        "Too many verification attempts for test@example.com",
      );
      expect(db.pending_verification_user.delete).toHaveBeenCalledWith({
        where: { id: maxAttemptsPending.id },
      });
    });

    it("rejects and increments attempts when code is invalid", async () => {
      const pending = makePendingUser({ verificationAttempts: 1 });
      db.pending_verification_user.findFirst.mockResolvedValue(pending);

      jest
        .spyOn(emailVerificationService, "verifyCodeHash")
        .mockResolvedValue(false);

      await expect(
        emailVerificationService.verifyCode("test@example.com", "wrong-code"),
      ).rejects.toThrow("Invalid verification code");

      expect(db.pending_verification_user.update).toHaveBeenCalledWith({
        where: { id: pending.id },
        data: { verificationAttempts: 2 },
      });
      expect(logger.warn).toHaveBeenCalledWith(
        "Invalid code attempt for test@example.com",
      );
    });

    it("logs success when code is verified", async () => {
      const pending = makePendingUser();
      db.pending_verification_user.findFirst.mockResolvedValue(pending);

      jest
        .spyOn(emailVerificationService, "verifyCodeHash")
        .mockResolvedValue(true);

      await emailVerificationService.verifyCode("test@example.com", "123456");

      expect(logger.info).toHaveBeenCalledWith(
        "Code verified for test@example.com",
      );
    });

    it("does not increment attempts if code is expired", async () => {
      const expiredPending = makePendingUser({
        verificationCodeExpiry: new Date(Date.now() - 1000),
      });
      db.pending_verification_user.findFirst.mockResolvedValue(expiredPending);

      await expect(
        emailVerificationService.verifyCode("test@example.com", "123456"),
      ).rejects.toThrow("Verification code has expired");

      expect(db.pending_verification_user.update).not.toHaveBeenCalled();
    });
  });

  describe("completePendingVerification", () => {
    it("deletes pending verification and returns the data", async () => {
      const pending = makePendingUser();
      db.pending_verification_user.findFirst.mockResolvedValue(pending);
      db.pending_verification_user.delete.mockResolvedValue(pending);

      const result =
        await emailVerificationService.completePendingVerification(
          "test@example.com",
        );

      expect(result).toEqual(pending);
      expect(db.pending_verification_user.delete).toHaveBeenCalledWith({
        where: { id: pending.id },
      });
    });

    it("returns null when pending verification not found", async () => {
      db.pending_verification_user.findFirst.mockResolvedValue(null);

      const result = await emailVerificationService.completePendingVerification(
        "nonexistent@example.com",
      );

      expect(result).toBeNull();
      expect(db.pending_verification_user.delete).not.toHaveBeenCalled();
    });

    it("finds by email or username", async () => {
      const pending = makePendingUser();
      db.pending_verification_user.findFirst.mockResolvedValue(pending);
      db.pending_verification_user.delete.mockResolvedValue(pending);

      await emailVerificationService.completePendingVerification("testuser");

      expect(db.pending_verification_user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ email: "testuser" }, { username: "testuser" }],
        },
      });
    });
  });

  describe("resendCode", () => {
    it("generates and returns new code for existing pending verification", async () => {
      const pending = makePendingUser({
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      });
      db.pending_verification_user.findFirst.mockResolvedValue(pending);

      const mockCode = "654321";
      const mockCodeHash = "hashed-654321";

      jest
        .spyOn(emailVerificationService, "generateVerificationCode")
        .mockResolvedValue(mockCode);
      jest
        .spyOn(emailVerificationService, "hashCode")
        .mockResolvedValue(mockCodeHash);

      const newPending = makePendingUser({ id: 2 });
      db.pending_verification_user.create.mockResolvedValue(newPending);

      const result =
        await emailVerificationService.resendCode("test@example.com");

      expect(result).not.toBeNull();
      expect(result?.code).toBe(mockCode);
      expect(result?.email).toBe(pending.email);
      expect(result?.firstName).toBe(pending.firstName);
    });

    it("rejects when pending verification not found", async () => {
      db.pending_verification_user.findFirst.mockResolvedValue(null);

      await expect(
        emailVerificationService.resendCode("nonexistent@example.com"),
      ).rejects.toThrow("No pending verification found");

      expect(logger.warn).toHaveBeenCalledWith(
        "No pending verification found for resend: nonexistent@example.com",
      );
    });

    it("deletes old pending before creating new one", async () => {
      const pending = makePendingUser({
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      });
      db.pending_verification_user.findFirst.mockResolvedValue(pending);

      jest
        .spyOn(emailVerificationService, "generateVerificationCode")
        .mockResolvedValue("654321");
      jest
        .spyOn(emailVerificationService, "hashCode")
        .mockResolvedValue("hashed-654321");

      const newPending = makePendingUser({ id: 2 });
      db.pending_verification_user.create.mockResolvedValue(newPending);

      await emailVerificationService.resendCode("test@example.com");

      expect(db.pending_verification_user.deleteMany).toHaveBeenCalledWith({
        where: { email: pending.email },
      });
    });

    it("preserves user data when resending code", async () => {
      const pending = makePendingUser({
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      });
      db.pending_verification_user.findFirst.mockResolvedValue(pending);

      jest
        .spyOn(emailVerificationService, "generateVerificationCode")
        .mockResolvedValue("654321");
      jest
        .spyOn(emailVerificationService, "hashCode")
        .mockResolvedValue("hashed-654321");

      const newPending = makePendingUser({ id: 2 });
      db.pending_verification_user.create.mockResolvedValue(newPending);

      await emailVerificationService.resendCode("test@example.com");

      const createCall = (db.pending_verification_user.create as jest.Mock).mock
        .calls[0];
      expect(createCall[0].data).toMatchObject({
        email: pending.email,
        username: pending.username,
        firstName: pending.firstName,
        lastName: pending.lastName,
        password: pending.password,
      });
    });

    it("rejects when rate limit exceeded (resend within 1 hour)", async () => {
      const recentPending = makePendingUser({
        createdAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
      });
      db.pending_verification_user.findFirst.mockResolvedValue(recentPending);

      await expect(
        emailVerificationService.resendCode("test@example.com"),
      ).rejects.toThrow("Too many verification attempts");

      expect(logger.warn).toHaveBeenCalledWith(
        "Rate limit exceeded for test@example.com",
      );
      expect(db.pending_verification_user.create).not.toHaveBeenCalled();
    });
  });

  describe("integration scenarios", () => {
    it("complete registration flow: create -> verify -> complete", async () => {
      const mockCode = "123456";
      const mockCodeHash = "hashed-123456";

      jest
        .spyOn(emailVerificationService, "generateVerificationCode")
        .mockResolvedValue(mockCode);
      jest
        .spyOn(emailVerificationService, "hashCode")
        .mockResolvedValue(mockCodeHash);

      const createdPending = makePendingUser();
      db.pending_verification_user.create.mockResolvedValue(createdPending);

      const createResult =
        await emailVerificationService.createPendingVerification(
          "newuser@example.com",
          "newuser",
          "New",
          "User",
          "hashed-password",
        );

      expect(createResult.code).toBe(mockCode);

      db.pending_verification_user.findFirst.mockResolvedValue(createdPending);
      jest
        .spyOn(emailVerificationService, "verifyCodeHash")
        .mockResolvedValue(true);

      const verifyResult = await emailVerificationService.verifyCode(
        "newuser@example.com",
        mockCode,
      );

      expect(verifyResult).resolves;

      db.pending_verification_user.delete.mockResolvedValue(createdPending);

      const completeResult =
        await emailVerificationService.completePendingVerification(
          "newuser@example.com",
        );

      expect(completeResult).toEqual(createdPending);
    });

    it("handles failed attempts and blocking", async () => {
      let pending = makePendingUser({ verificationAttempts: 0 });

      db.pending_verification_user.findFirst.mockResolvedValue(pending);
      jest
        .spyOn(emailVerificationService, "verifyCodeHash")
        .mockResolvedValue(false);

      await expect(
        emailVerificationService.verifyCode("test@example.com", "wrong1"),
      ).rejects.toThrow("Invalid verification code");

      pending = { ...pending, verificationAttempts: 1 };
      db.pending_verification_user.findFirst.mockResolvedValue(pending);

      await expect(
        emailVerificationService.verifyCode("test@example.com", "wrong2"),
      ).rejects.toThrow("Invalid verification code");

      pending = {
        ...pending,
        verificationAttempts: CONFIG.MAX_VERIFICATION_ATTEMPTS,
      };
      db.pending_verification_user.findFirst.mockResolvedValue(pending);

      await expect(
        emailVerificationService.verifyCode("test@example.com", "wrong5"),
      ).rejects.toThrow("Too many verification attempts");

      expect(db.pending_verification_user.delete).toHaveBeenCalled();
    });
  });
});
