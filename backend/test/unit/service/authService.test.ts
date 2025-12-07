jest.mock("@repositories/userRepository", () => ({
  userRepository: {
    findUserByEmail: jest.fn(),
    findUserByUsername: jest.fn(),
    findUserById: jest.fn(),
    createUser: jest.fn(),
    createUserWithRole: jest.fn(),
    getAllUsers: jest.fn(),
    deleteUser: jest.fn(),
    getUsersByRole: jest.fn(),
  },
}));

jest.mock("bcrypt", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock("jsonwebtoken", () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}));

import { authService } from "@services/authService";
import { userRepository } from "@repositories/userRepository";
import { roleType } from "@models/enums";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

type RepoMock = {
  findUserByEmail: jest.Mock;
  findUserById: jest.Mock;
};

const repo = userRepository as unknown as RepoMock;

const makeUser = (overrides: Partial<any> = {}) => ({
  id: 1,
  email: "mario.rossi@example.com",
  username: "mrossi",
  firstName: "Mario",
  lastName: "Rossi",
  password: "hashed-pass",
  ...overrides,
});

describe("authService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("login", () => {
    it("throws when user is not found by identifier", async () => {
      repo.findUserByEmail.mockResolvedValue(null);

      await expect(authService.login("unknown", "pwd")).rejects.toThrow(
        "Invalid username or password",
      );

      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    it("throws when user has no id or password", async () => {
      repo.findUserByEmail.mockResolvedValue({ email: "x" } as any);

      await expect(authService.login("x", "pwd")).rejects.toThrow(
        "Invalid username or password",
      );

      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it("throws when the password is invalid", async () => {
      const user = makeUser();
      repo.findUserByEmail.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login(user.email, "wrong")).rejects.toThrow(
        "Invalid username or password",
      );

      expect(bcrypt.compare).toHaveBeenCalledWith("wrong", user.password);
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    it("returns { user, token } when credentials are valid", async () => {
      const user = makeUser();
      repo.findUserByEmail.mockResolvedValue(user);
      repo.findUserById.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue("token-xyz");

      const res = await authService.login(
        user.email,
        "ok",
        roleType.MUNICIPALITY,
      );

      expect(bcrypt.compare).toHaveBeenCalledWith("ok", user.password);
      expect(jwt.sign).toHaveBeenCalledWith(
        { id: user.id, email: user.email, role: roleType.MUNICIPALITY },
        expect.any(String),
        expect.objectContaining({ expiresIn: "1h" }),
      );
      expect(res).toEqual({ user, token: "token-xyz" });
    });
  });

  // ---------------- verifyAuth ----------------
  describe("verifyAuth", () => {
    it("throws if authToken is missing", async () => {
      await expect(authService.verifyAuth(null)).rejects.toThrow(
        "No token provided",
      );
      expect(jwt.verify).not.toHaveBeenCalled();
    });

    it("throws when jwt.verify throws (invalid token)", async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error("bad token");
      });

      await expect(authService.verifyAuth("bad-token")).rejects.toThrow(
        "Invalid or expired token",
      );

      expect(jwt.verify).toHaveBeenCalledWith("bad-token", expect.any(String));
    });

    it("throws when token decodes but user not found", async () => {
      (jwt.verify as jest.Mock).mockReturnValue({
        id: 99,
        role: roleType.MUNICIPALITY,
      });
      repo.findUserById.mockRejectedValue(new Error("User not found"));

      await expect(authService.verifyAuth("ok-token")).rejects.toThrow(
        "Invalid or expired token",
      );

      expect(repo.findUserById).toHaveBeenCalledWith(99, roleType.MUNICIPALITY);
    });

    it("returns user when token valid and user exists", async () => {
      const user = makeUser({ id: 7 });
      (jwt.verify as jest.Mock).mockReturnValue({
        id: 7,
        role: roleType.CITIZEN,
      });
      repo.findUserById.mockResolvedValue(user);

      const res = await authService.verifyAuth("good-token");

      expect(jwt.verify).toHaveBeenCalledWith("good-token", expect.any(String));
      expect(repo.findUserById).toHaveBeenCalledWith(7, roleType.CITIZEN);
      expect(res).toBe(user);
    });
  });
});
