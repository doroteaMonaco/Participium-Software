jest.mock("@services/userService", () => ({
  userService: {
    createMunicipalityUser: jest.fn(),
    getAllMunicipalityRoles: jest.fn(),
    getMunicipalityUsers: jest.fn(),
  },
}));

import { Request, Response } from "express";
import { userController } from "@controllers/userController";
import { userService } from "@services/userService";
import { roleType } from "@models/enums";

type UserServiceMock = {
  createMunicipalityUser: jest.Mock;
  getAllMunicipalityRoles: jest.Mock;
  getMunicipalityUsers: jest.Mock;
};

const userServiceMock = userService as unknown as UserServiceMock;

const makeRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  send: jest.fn().mockReturnThis(),
});

const makeUser = (overrides: Partial<any> = {}) => ({
  id: 1,
  email: "test@example.com",
  username: "testuser",
  firstName: "Test",
  lastName: "User",
  role: roleType.MUNICIPALITY,
  municipality_role_id: 1,
  municipality_role: { id: 1, name: "Test Role" },
  createdAt: new Date(),
  ...overrides,
});

describe("userController - Municipality Functions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createMunicipalityUser", () => {
    const municipality_role_id = 2;

    const mockRequest = {
      body: {
        email: "municipality@test.com",
        username: "municipality_user",
        firstName: "Municipality",
        lastName: "User",
        password: "password123",
        municipality_role_id: municipality_role_id,
      },
    } as Request;

    it("creates municipality user successfully", async () => {
      const mockUser = makeUser({
        email: mockRequest.body.email,
        username: mockRequest.body.username,
        firstName: mockRequest.body.firstName,
        lastName: mockRequest.body.lastName,
        municipality_role_id: municipality_role_id,
      });

      userServiceMock.createMunicipalityUser.mockResolvedValue(mockUser);
      const res = makeRes();

      await userController.createMunicipalityUser(
        mockRequest,
        res as unknown as Response,
      );

      expect(userServiceMock.createMunicipalityUser).toHaveBeenCalledWith(
        expect.objectContaining(mockRequest.body),
        municipality_role_id,
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        ...mockUser,
        municipality_role_id,
      });
    });

    it("returns 400 when required fields are missing", async () => {
      const incompleteRequest = {
        body: {
          email: "test@example.com",
          username: "testuser",
          // missing firstName, lastName, password, municipality_role_id
        },
      } as Request;

      const res = makeRes();

      await userController.createMunicipalityUser(
        incompleteRequest,
        res as unknown as Response,
      );

      expect(userServiceMock.createMunicipalityUser).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Bad Request" }),
      );
    });

    it("returns 409 when email is already in use", async () => {
      userServiceMock.createMunicipalityUser.mockRejectedValue(
        new Error("Email is already in use"),
      );
      const res = makeRes();

      await userController.createMunicipalityUser(
        mockRequest,
        res as unknown as Response,
      );

      expect(userServiceMock.createMunicipalityUser).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: "Conflict Error",
        message: "Email is already in use",
      });
    });

    it("returns 409 when username is already in use", async () => {
      userServiceMock.createMunicipalityUser.mockRejectedValue(
        new Error("Username is already in use"),
      );
      const res = makeRes();

      await userController.createMunicipalityUser(
        mockRequest,
        res as unknown as Response,
      );

      expect(userServiceMock.createMunicipalityUser).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: "Conflict Error",
        message: "Username is already in use",
      });
    });

    it("returns 500 for other service errors", async () => {
      userServiceMock.createMunicipalityUser.mockRejectedValue(
        new Error("Database error"),
      );
      const res = makeRes();

      await userController.createMunicipalityUser(
        mockRequest,
        res as unknown as Response,
      );

      expect(userServiceMock.createMunicipalityUser).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Internal Server Error",
        message: "Database error",
      });
    });
  });

  describe("getAllMunicipalityRoles", () => {
    const mockRequest = {} as Request;

    const mockRoles = [
      { id: 1, name: "Mayor", description: "Municipality mayor" },
      { id: 2, name: "Councilor", description: "City councilor" },
    ];

    it("returns all municipality roles successfully", async () => {
      userServiceMock.getAllMunicipalityRoles.mockResolvedValue(mockRoles);
      const res = makeRes();

      await userController.getAllMunicipalityRoles(
        mockRequest,
        res as unknown as Response,
      );

      expect(userServiceMock.getAllMunicipalityRoles).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockRoles);
    });

    it("returns empty array when no roles exist", async () => {
      userServiceMock.getAllMunicipalityRoles.mockResolvedValue([]);
      const res = makeRes();

      await userController.getAllMunicipalityRoles(
        mockRequest,
        res as unknown as Response,
      );

      expect(userServiceMock.getAllMunicipalityRoles).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it("returns 500 when service throws error", async () => {
      userServiceMock.getAllMunicipalityRoles.mockRejectedValue(
        new Error("Database error"),
      );
      const res = makeRes();

      await userController.getAllMunicipalityRoles(
        mockRequest,
        res as unknown as Response,
      );

      expect(userServiceMock.getAllMunicipalityRoles).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Internal Server Error",
        message: "Database error",
      });
    });
  });

  describe("getMunicipalityUsers", () => {
    const mockRequest = {} as Request;

    const mockMunicipalityUsers = [
      makeUser({
        id: 1,
        email: "mayor@city.com",
        username: "mayor",
        firstName: "John",
        lastName: "Mayor",
        municipality_role_id: 1,
      }),
      makeUser({
        id: 2,
        email: "councilor@city.com",
        username: "councilor",
        firstName: "Jane",
        lastName: "Councilor",
        municipality_role_id: 2,
      }),
    ];

    it("returns all municipality users successfully", async () => {
      userServiceMock.getMunicipalityUsers.mockResolvedValue(
        mockMunicipalityUsers,
      );
      const res = makeRes();

      await userController.getMunicipalityUsers(
        mockRequest,
        res as unknown as Response,
      );

      expect(userServiceMock.getMunicipalityUsers).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockMunicipalityUsers);
    });

    it("returns empty array when no municipality users exist", async () => {
      userServiceMock.getMunicipalityUsers.mockResolvedValue([]);
      const res = makeRes();

      await userController.getMunicipalityUsers(
        mockRequest,
        res as unknown as Response,
      );

      expect(userServiceMock.getMunicipalityUsers).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it("returns 500 when service throws error", async () => {
      userServiceMock.getMunicipalityUsers.mockRejectedValue(
        new Error("Database error"),
      );
      const res = makeRes();

      await userController.getMunicipalityUsers(
        mockRequest,
        res as unknown as Response,
      );

      expect(userServiceMock.getMunicipalityUsers).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Internal Server Error",
        message: "Database error",
      });
    });
  });
});
