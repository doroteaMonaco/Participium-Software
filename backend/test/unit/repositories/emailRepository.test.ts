import { prisma } from "@database";
import { emailRepository } from "@repositories/emailRepository";

type PrismaMock = {
  pending_verification_user: {
    create: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
    deleteMany: jest.Mock;
    delete: jest.Mock;
  };
};

const prismaMock = prisma as unknown as PrismaMock;

const makeVerification = (overrides: Partial<any> = {}) => ({
  id: 1,
  email: "user@example.com",
  username: "user1",
  firstName: "Mario",
  lastName: "Rossi",
  password: "hashed",
  verificationCodeHash: "hash",
  verificationCodeExpiry: new Date(Date.now() + 1000 * 60 * 60),
  verificationAttempts: 0,
  ...overrides,
});

describe("emailRepository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createVerification", () => {
    it("calls prisma.create with correct data", async () => {
      const created = makeVerification({ id: 5 });
      prismaMock.pending_verification_user.create.mockResolvedValue(created);

      const expiry = new Date(Date.now() + 1000 * 60 * 60);

      await expect(
        emailRepository.createVerification(
          created.email,
          created.username,
          created.firstName,
          created.lastName,
          created.password,
          created.verificationCodeHash,
          expiry,
        ),
      ).resolves.toBeUndefined();

      expect(prismaMock.pending_verification_user.create).toHaveBeenCalledWith({
        data: {
          email: created.email,
          username: created.username,
          firstName: created.firstName,
          lastName: created.lastName,
          password: created.password,
          verificationCodeHash: created.verificationCodeHash,
          verificationCodeExpiry: expiry,
        },
      });
    });

    it("propagates errors from prisma.create", async () => {
      const err = new Error("DB create failed");
      prismaMock.pending_verification_user.create.mockRejectedValue(err);

      await expect(
        emailRepository.createVerification(
          "a@b.com",
          "u",
          "f",
          "l",
          "p",
          "h",
          new Date(),
        ),
      ).rejects.toThrow("Failed to create verification");
    });
  });

  describe("getVerification", () => {
    it("returns a pending verification when found", async () => {
      const verification = makeVerification({ id: 10 });
      prismaMock.pending_verification_user.findFirst.mockResolvedValue(
        verification,
      );

      const res = await emailRepository.getVerification("user@example.com");

      expect(
        prismaMock.pending_verification_user.findFirst,
      ).toHaveBeenCalledWith({
        where: {
          OR: [{ email: "user@example.com" }, { username: "user@example.com" }],
        },
      });
      expect(res).toBe(verification);
    });

    it("returns null when not found", async () => {
      prismaMock.pending_verification_user.findFirst.mockResolvedValue(null);

      const res = await emailRepository.getVerification("nope");

      expect(res).toBeNull();
    });
  });

  describe("updateVerificationAttempts", () => {
    it("updates attempts for the given id", async () => {
      prismaMock.pending_verification_user.update.mockResolvedValue({});

      await expect(
        emailRepository.updateVerificationAttempts(3, 2),
      ).resolves.toBeUndefined();

      expect(prismaMock.pending_verification_user.update).toHaveBeenCalledWith({
        where: { id: 3 },
        data: { verificationAttempts: 2 },
      });
    });

    it("propagates update errors", async () => {
      const err = new Error("update failed");
      prismaMock.pending_verification_user.update.mockRejectedValue(err);

      await expect(
        emailRepository.updateVerificationAttempts(1, 1),
      ).rejects.toThrow("Failed to update pending verification attempts");
    });
  });

  describe("deleteByEmail", () => {
    it("calls deleteMany with the email", async () => {
      prismaMock.pending_verification_user.deleteMany.mockResolvedValue({});

      await expect(
        emailRepository.deleteByEmail("a@b.com"),
      ).resolves.toBeUndefined();

      expect(
        prismaMock.pending_verification_user.deleteMany,
      ).toHaveBeenCalledWith({ where: { email: "a@b.com" } });
    });

    it("propagates deleteMany errors", async () => {
      const err = new Error("delete failed");
      prismaMock.pending_verification_user.deleteMany.mockRejectedValue(err);

      await expect(emailRepository.deleteByEmail("x@x.com")).rejects.toThrow(
        "Failed to delete pending verification by email",
      );
    });
  });

  describe("deleteById", () => {
    it("deletes the pending verification by id", async () => {
      const deleted = makeVerification({ id: 7 });
      prismaMock.pending_verification_user.delete.mockResolvedValue(deleted);

      await expect(emailRepository.deleteById(7)).resolves.toBeUndefined();

      expect(prismaMock.pending_verification_user.delete).toHaveBeenCalledWith({
        where: { id: 7 },
      });
    });

    it("propagates delete errors", async () => {
      const err = new Error("Role is referenced by users");
      prismaMock.pending_verification_user.delete.mockRejectedValue(err);

      await expect(emailRepository.deleteById(1)).rejects.toThrow(
        "Failed to delete pending verification by id",
      );
    });
  });
});
