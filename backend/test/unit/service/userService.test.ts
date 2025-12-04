jest.mock("@repositories/userRepository", () => ({
  userRepository: {
    findUserByEmail: jest.fn(),
    findUserByUsername: jest.fn(),
    findUserById: jest.fn(),
    createUser: jest.fn(),
    getAllUsers: jest.fn(),
    deleteUser: jest.fn(),
    getUsersByRole: jest.fn(),
    updateUserProfile: jest.fn(),
  },
}));

jest.mock("@repositories/roleRepository", () => ({
  roleRepository: {
    getAllMunicipalityRoles: jest.fn(),
  },
}));

jest.mock("bcrypt", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock("@dto/userDto", () => ({
  buildUserDto: jest.fn((u: any) => u),
}));

jest.mock("@services/imageService", () => ({
  __esModule: true,
  default: {
    persistUserImage: jest.fn(),
  },
}));

import { userService } from "@services/userService";
import { userRepository } from "@repositories/userRepository";
import { roleRepository } from "@repositories/roleRepository";
import { roleType } from "@models/enums";
import bcrypt from "bcrypt";
import imageService from "@services/imageService";
import { CreateBaseUserDto } from "@dto/userDto";

type RepoMock = {
  findUserByEmail: jest.Mock;
  findUserByUsername: jest.Mock;
  findUserById: jest.Mock;
  createUser: jest.Mock;
  getAllUsers: jest.Mock;
  deleteUser: jest.Mock;
  getUsersByRole: jest.Mock;
  updateUserProfile: jest.Mock;
};

const repo = userRepository as unknown as RepoMock;
const roleRepo = roleRepository as any;

const makeUser = (overrides: Partial<any> = {}) => ({
  id: 1,
  email: "u@example.com",
  username: "u1",
  firstName: "U",
  lastName: "User",
  password: "hashed",
  ...overrides,
});

describe("userService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("registerUser", () => {
    const mockUserData: CreateBaseUserDto = {
      email: "u@example.com",
      username: "u1",
      firstName: "U",
      lastName: "User",
      password: "p",
    };

    it("throws if email is already in use", async () => {
      repo.findUserByEmail.mockRejectedValue(
        new Error("Email is already in use"),
      );

      await expect(userService.registerUser(mockUserData)).rejects.toThrow(
        "Email is already in use",
      );

      expect(repo.findUserByEmail).toHaveBeenCalledWith(
        mockUserData.email,
        roleType.CITIZEN,
      );
      expect(repo.findUserByUsername).not.toHaveBeenCalled();
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(repo.createUser).not.toHaveBeenCalled();
    });

    it("throws if username is already in use", async () => {
      repo.findUserByEmail.mockResolvedValue(null);
      repo.findUserByUsername.mockRejectedValue(
        new Error("Username is already in use"),
      );

      await expect(userService.registerUser(mockUserData)).rejects.toThrow(
        "Username is already in use",
      );

      expect(repo.findUserByEmail).toHaveBeenCalledWith(
        mockUserData.email,
        roleType.CITIZEN,
      );
      expect(repo.findUserByUsername).toHaveBeenCalledWith(
        mockUserData.username,
        roleType.CITIZEN,
      );
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(repo.createUser).not.toHaveBeenCalled();
    });

    it("hashes password, creates user and returns built dto", async () => {
      repo.findUserByEmail.mockResolvedValue(null);
      repo.findUserByUsername.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue("h-pass");

      const created = makeUser({ password: "h-pass", id: 5 });
      repo.createUser.mockResolvedValue(created);

      const res = await userService.registerUser(mockUserData);

      expect(repo.findUserByEmail).toHaveBeenCalledWith(
        mockUserData.email,
        roleType.CITIZEN,
      );
      expect(repo.findUserByUsername).toHaveBeenCalledWith(
        mockUserData.username,
        roleType.CITIZEN,
      );

      expect(bcrypt.hash).toHaveBeenCalledWith(mockUserData.password, 10);
      expect(repo.createUser).toHaveBeenCalledWith(
        mockUserData.email,
        mockUserData.username,
        mockUserData.firstName,
        mockUserData.lastName,
        "h-pass",
        roleType.CITIZEN,
        {},
      );
      expect(res).toBe(created);
    });
  });

  describe("createMunicipalityUser", () => {
    const mockUserData: CreateBaseUserDto = {
      email: "m@e.com",
      username: "muni",
      firstName: "M",
      lastName: "M",
      password: "p",
    };

    it("forwards municipality role to repo lookups and creation", async () => {
      repo.findUserByEmail.mockResolvedValue(null);
      repo.findUserByUsername.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue("h");

      const created = makeUser({ password: "h", municipality_role_id: 3 });
      repo.createUser.mockResolvedValue(created);

      const res = await userService.createMunicipalityUser(mockUserData, 3);

      expect(repo.findUserByEmail).toHaveBeenCalledWith(
        mockUserData.email,
        roleType.MUNICIPALITY,
      );
      expect(repo.findUserByUsername).toHaveBeenCalledWith(
        mockUserData.username,
        roleType.MUNICIPALITY,
      );
      expect(repo.createUser).toHaveBeenCalledWith(
        mockUserData.email,
        mockUserData.username,
        mockUserData.firstName,
        mockUserData.lastName,
        "h",
        roleType.MUNICIPALITY,
        { municipality_role_id: 3 },
      );
      expect(res).toBe(created);
    });

    it("throws if email already in use (municipality)", async () => {
      repo.findUserByEmail.mockRejectedValue(
        new Error("Email is already in use"),
      );

      await expect(
        userService.createMunicipalityUser(mockUserData, 3),
      ).rejects.toThrow("Email is already in use");

      expect(repo.findUserByEmail).toHaveBeenCalledWith(
        mockUserData.email,
        roleType.MUNICIPALITY,
      );
      expect(repo.findUserByUsername).not.toHaveBeenCalled();
      expect(repo.createUser).not.toHaveBeenCalled();
    });

    it("throws if username is already in use", async () => {
      repo.findUserByEmail.mockResolvedValue(null);
      repo.findUserByUsername.mockRejectedValue(
        new Error("Username is already in use"),
      );

      await expect(
        userService.createMunicipalityUser(mockUserData, 2),
      ).rejects.toThrow("Username is already in use");

      expect(repo.findUserByEmail).toHaveBeenCalledWith(
        mockUserData.email,
        roleType.MUNICIPALITY,
      );
      expect(repo.findUserByUsername).toHaveBeenCalledWith(
        mockUserData.username,
        roleType.MUNICIPALITY,
      );
      expect(repo.createUser).not.toHaveBeenCalled();
      expect(bcrypt.hash).not.toHaveBeenCalled();
    });

    it("hashes password and creates municipality user", async () => {
      repo.findUserByEmail.mockResolvedValue(null);
      repo.findUserByUsername.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-muni");

      const created = makeUser({
        password: "hashed-muni",
        municipality_role_id: 5,
      });
      repo.createUser.mockResolvedValue(created);

      const res = await userService.createMunicipalityUser(mockUserData, 5);

      expect(bcrypt.hash).toHaveBeenCalledWith(mockUserData.password, 10);
      expect(repo.createUser).toHaveBeenCalledWith(
        mockUserData.email,
        mockUserData.username,
        mockUserData.firstName,
        mockUserData.lastName,
        "hashed-muni",
        roleType.MUNICIPALITY,
        { municipality_role_id: 5 },
      );
      expect(res).toBe(created);
    });
  });

  describe("getAllUsers / getUserById / deleteUser", () => {
    it("returns all users", async () => {
      const list = [makeUser(), makeUser({ id: 2 })];
      repo.getAllUsers.mockResolvedValue(list);

      const res = await userService.getAllUsers();
      expect(repo.getAllUsers).toHaveBeenCalled();
      expect(res).toBe(list);
    });

    it("returns user by id", async () => {
      const u = makeUser({ id: 7 });
      repo.findUserById.mockResolvedValue(u);

      const res = await userService.getUserById(7);
      expect(repo.findUserById).toHaveBeenCalledWith(7, roleType.CITIZEN);
      expect(res).toBe(u);
    });

    it("deleteUser throws when not found", async () => {
      repo.findUserById.mockResolvedValue(null);

      await expect(userService.deleteUser(9)).rejects.toThrow("User not found");
      expect(repo.findUserById).toHaveBeenCalledWith(9, roleType.CITIZEN);
      expect(repo.deleteUser).not.toHaveBeenCalled();
    });

    it("deleteUser calls repo.deleteUser when found", async () => {
      repo.findUserById.mockResolvedValue(makeUser({ id: 3 }));
      repo.deleteUser.mockResolvedValue(undefined);

      await userService.deleteUser(3);
      expect(repo.findUserById).toHaveBeenCalledWith(3, roleType.CITIZEN);
      expect(repo.deleteUser).toHaveBeenCalledWith(3, roleType.CITIZEN);
    });
  });

  describe("getAllMunicipalityRoles / getMunicipalityUsers", () => {
    it("returns municipality roles", async () => {
      const roles = [{ id: 1, name: "R" }];
      roleRepo.getAllMunicipalityRoles.mockResolvedValue(roles);

      const res = await userService.getAllMunicipalityRoles();
      expect(roleRepo.getAllMunicipalityRoles).toHaveBeenCalled();
      expect(res).toBe(roles);
    });

    it("returns municipality users", async () => {
      const users = [makeUser({ id: 5 }), makeUser({ id: 6 })];
      repo.getUsersByRole.mockResolvedValue(users);

      const res = await userService.getMunicipalityUsers();
      expect(repo.getUsersByRole).toHaveBeenCalledWith(roleType.MUNICIPALITY);
      expect(res).toBe(users);
    });
  });

  describe("updateCitizenProfile", () => {
    it("persists photo when photoKey provided and updates profile", async () => {
      const u = makeUser({ id: 11 });
      repo.findUserById.mockResolvedValue(u);
      (imageService.persistUserImage as jest.Mock).mockResolvedValue(
        "/path/p.jpg",
      );
      const updated = { ...u, profilePhoto: "/path/p.jpg" };
      repo.updateUserProfile.mockResolvedValue(updated);

      const res = await userService.updateCitizenProfile(
        11,
        "key123",
        "tg",
        true,
      );
      expect(repo.findUserById).toHaveBeenCalledWith(11);
      expect(imageService.persistUserImage).toHaveBeenCalledWith("key123", 11);
      expect(repo.updateUserProfile).toHaveBeenCalledWith(
        11,
        "tg",
        true,
        "/path/p.jpg",
      );
      expect(res).toBe(updated);
    });

    it("does not call imageService when photoKey omitted", async () => {
      const u = makeUser({ id: 12 });
      repo.findUserById.mockResolvedValue(u);
      const updated = { ...u, telegramUsername: "tg2" };
      repo.updateUserProfile.mockResolvedValue(updated);

      const res = await userService.updateCitizenProfile(
        12,
        undefined,
        "tg2",
        false,
      );
      expect(repo.findUserById).toHaveBeenCalledWith(12);
      expect(imageService.persistUserImage).not.toHaveBeenCalled();
      expect(repo.updateUserProfile).toHaveBeenCalledWith(
        12,
        "tg2",
        false,
        undefined,
      );
      expect(res).toBe(updated);
    });
  });
});
