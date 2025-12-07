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
        "h-pass",
        roleType.CITIZEN,
        {
          firstName: mockUserData.firstName,
          lastName: mockUserData.lastName,
        },
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

      const res = await userService.createMunicipalityUser(mockUserData, "M", "M", 3);

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
        "h",
        roleType.MUNICIPALITY,
        { firstName: "M", lastName: "M", municipality_role_id: 3 },
      );
      expect(res).toBe(created);
    });

    it("throws if email already in use (municipality)", async () => {
      repo.findUserByEmail.mockRejectedValue(
        new Error("Email is already in use"),
      );

      await expect(
        userService.createMunicipalityUser(mockUserData, "M", "M", 3),
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
        userService.createMunicipalityUser(mockUserData, "M", "M", 2),
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

      const res = await userService.createMunicipalityUser(mockUserData, "M", "M", 5);

      expect(bcrypt.hash).toHaveBeenCalledWith(mockUserData.password, 10);
      expect(repo.createUser).toHaveBeenCalledWith(
        mockUserData.email,
        mockUserData.username,
        "hashed-muni",
        roleType.MUNICIPALITY,
        { firstName: "M", lastName: "M", municipality_role_id: 5 },
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

  // -------- External Maintainer Functions --------
  describe("createExternalMaintainerUser", () => {
    it("should create external maintainer user successfully", async () => {
      const userData: CreateBaseUserDto = {
        username: "maintainer1",
        email: "maintainer@example.com",
        password: "plain",
      };
      const created = makeUser({
        username: userData.username,
        email: userData.email,
        password: "hashed",
      });

      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed");
      repo.createUser.mockResolvedValue(created);

      const res = await userService.createExternalMaintainerUser(
        userData,
        "CompanyX",
        "PUBLIC_LIGHTING" as any,
      );

      expect(bcrypt.hash).toHaveBeenCalledWith("plain", 10);
      expect(repo.createUser).toHaveBeenCalledWith(
        userData.email,
        userData.username,
        "hashed",
        roleType.EXTERNAL_MAINTAINER,
        {
          category: "PUBLIC_LIGHTING",
          companyName: "CompanyX",
        },
      );
      expect(res).toBe(created);
    });

    it("should throw error when email already exists", async () => {
      const userData: CreateBaseUserDto = {
        username: "maintainer1",
        email: "existing@example.com",
        password: "plain",
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed");
      repo.createUser.mockRejectedValue(
        new Error("Email is already in use"),
      );

      await expect(
        userService.createExternalMaintainerUser(
          userData,
          "CompanyX",
          "PUBLIC_LIGHTING" as any,
        ),
      ).rejects.toThrow("Email is already in use");
    });
  });

  describe("getExternalMaintainerUsers", () => {
    it("should return all external maintainer users", async () => {
      const maintainers = [
        makeUser({ id: 1, username: "maintainer1" }),
        makeUser({ id: 2, username: "maintainer2" }),
      ];

      repo.getUsersByRole.mockResolvedValue(maintainers);

      const res = await userService.getExternalMaintainerUsers();

      expect(repo.getUsersByRole).toHaveBeenCalledWith(
        roleType.EXTERNAL_MAINTAINER,
      );
      expect(res).toEqual(maintainers);
    });

    it("should return empty array when no external maintainers", async () => {
      repo.getUsersByRole.mockResolvedValue([]);

      const res = await userService.getExternalMaintainerUsers();

      expect(res).toEqual([]);
    });

    it("should throw error on database failure", async () => {
      repo.getUsersByRole.mockRejectedValue(
        new Error("Database error"),
      );

      await expect(
        userService.getExternalMaintainerUsers(),
      ).rejects.toThrow("Database error");
    });
  });

  // -------- registerUser - username already in use --------
  describe("registerUser - username already in use", () => {
    const mockUserData: CreateBaseUserDto = {
      email: "new@example.com",
      username: "existing_username",
      password: "password123",
    };

    it("should throw error when username is already in use", async () => {
      repo.findUserByEmail.mockResolvedValue(null);
      repo.findUserByUsername.mockResolvedValue(makeUser({ username: "existing_username" }));

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
  });

  // -------- updateCitizenProfile - user not found --------
  describe("updateCitizenProfile - user not found", () => {
    it("should throw error when user not found", async () => {
      repo.findUserById.mockResolvedValue(null);

      await expect(
        userService.updateCitizenProfile(999, undefined, "telegram_user", true),
      ).rejects.toThrow("User not found");

      expect(repo.findUserById).toHaveBeenCalledWith(999);
      expect(repo.updateUserProfile).not.toHaveBeenCalled();
    });

    it("should update citizen profile with photo", async () => {
      const user = makeUser({ id: 5 });
      repo.findUserById.mockResolvedValue(user);
      (imageService.persistUserImage as jest.Mock).mockResolvedValue(
        "user_5.jpg",
      );
      repo.updateUserProfile.mockResolvedValue({ ...user, profilePhoto: "user_5.jpg" });

      const res = await userService.updateCitizenProfile(5, "photo_key", "telegram_user", true);

      expect(imageService.persistUserImage).toHaveBeenCalledWith("photo_key", 5);
      expect(repo.updateUserProfile).toHaveBeenCalledWith(5, "telegram_user", true, "user_5.jpg");
    });

    it("should update citizen profile without photo", async () => {
      const user = makeUser({ id: 5 });
      repo.findUserById.mockResolvedValue(user);
      repo.updateUserProfile.mockResolvedValue({ ...user });

      await userService.updateCitizenProfile(5, undefined, "telegram_user", false);

      expect(imageService.persistUserImage).not.toHaveBeenCalled();
      expect(repo.updateUserProfile).toHaveBeenCalledWith(5, "telegram_user", false, undefined);
    });
  });
});
