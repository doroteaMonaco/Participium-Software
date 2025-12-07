jest.mock("@controllers/userController", () => ({
  userController: {
    createMunicipalityUser: jest.fn(),
    createExternalMaintainerUser: jest.fn(),
    getExternalMaintainerUsers: jest.fn(),
    getAllMunicipalityRoles: jest.fn(),
    getMunicipalityUsers: jest.fn(),
    register: jest.fn(),
    getAllUsers: jest.fn(),
    getUserById: jest.fn(),
    deleteUser: jest.fn(),
    updateCitizenProfile: jest.fn(),
  },
}));

jest.mock("@middlewares/authMiddleware", () => ({
  isAuthenticated: jest.fn((req: any, res: any, next: any) => next()),
}));

jest.mock("@middlewares/roleMiddleware", () => ({
  isAdmin: jest.fn((req: any, res: any, next: any) => next()),
  isCitizen: jest.fn((req: any, res: any, next: any) => next()),
}));

import request from "supertest";
import express from "express";
import { userController } from "@controllers/userController";
import { isAuthenticated } from "@middlewares/authMiddleware";
import { isAdmin, isCitizen } from "@middlewares/roleMiddleware";
import userRouter from "@routes/userRouter";

type UserControllerMock = {
  createMunicipalityUser: jest.Mock;
  getAllMunicipalityRoles: jest.Mock;
  getMunicipalityUsers: jest.Mock;
};

const userControllerMock = userController as unknown as UserControllerMock;
const isAuthenticatedMock = isAuthenticated as jest.Mock;
const isAdminMock = isAdmin as jest.Mock;
const isCitizenMock = isCitizen as jest.Mock;

// Setup Express app for testing
const app = express();
app.use(express.json());
app.use("/api/users", userRouter);

describe("Municipality Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup middleware mocks to pass by default
    isAuthenticatedMock.mockImplementation((req: any, res: any, next: any) =>
      next(),
    );
    isAdminMock.mockImplementation((req: any, res: any, next: any) => next());
    isCitizenMock.mockImplementation((req: any, res: any, next: any) => next());
  });

  describe("POST /api/users/municipality-users", () => {
    const mockRequestBody = {
      email: "municipality@test.com",
      username: "municipality_user",
      firstName: "Municipality",
      lastName: "User",
      password: "password123",
      municipality_role_id: 1,
    };

    const mockUser = {
      id: 1,
      email: mockRequestBody.email,
      username: mockRequestBody.username,
      firstName: mockRequestBody.firstName,
      lastName: mockRequestBody.lastName,
      role: "MUNICIPALITY",
      municipality_role_id: mockRequestBody.municipality_role_id,
      municipality_role: { id: 1, name: "Test Role" },
      createdAt: new Date(),
    };

    it("should call createMunicipalityUser controller with authentication and admin middleware", async () => {
      userControllerMock.createMunicipalityUser.mockImplementation(
        (req, res) => {
          res.status(201).json(mockUser);
        },
      );

      const response = await request(app)
        .post("/api/users/municipality-users")
        .send(mockRequestBody);

      expect(isAuthenticatedMock).toHaveBeenCalled();
      expect(isAdminMock).toHaveBeenCalled();
      expect(userControllerMock.createMunicipalityUser).toHaveBeenCalled();
      expect(response.status).toBe(201);
      expect(response.body.email).toBe(mockUser.email);
      expect(response.body.username).toBe(mockUser.username);
      expect(response.body.firstName).toBe(mockUser.firstName);
      expect(response.body.lastName).toBe(mockUser.lastName);
    });

    it("should call middleware in correct order", async () => {
      let callOrder: string[] = [];

      isAuthenticatedMock.mockImplementation(
        (req: any, res: any, next: any) => {
          callOrder.push("isAuthenticated");
          next();
        },
      );

      isAdminMock.mockImplementation((req: any, res: any, next: any) => {
        callOrder.push("isAdmin");
        next();
      });

      userControllerMock.createMunicipalityUser.mockImplementation(
        (req, res) => {
          callOrder.push("createMunicipalityUser");
          res.status(201).json(mockUser);
        },
      );

      await request(app)
        .post("/api/users/municipality-users")
        .send(mockRequestBody);

      expect(callOrder).toEqual([
        "isAuthenticated",
        "isAdmin",
        "createMunicipalityUser",
      ]);
    });

    it("should be blocked if authentication fails", async () => {
      isAuthenticatedMock.mockImplementation(
        (req: any, res: any, next: any) => {
          res.status(401).json({ error: "Unauthorized" });
        },
      );

      const response = await request(app)
        .post("/api/users/municipality-users")
        .send(mockRequestBody);

      expect(isAuthenticatedMock).toHaveBeenCalled();
      expect(isAdminMock).not.toHaveBeenCalled();
      expect(userControllerMock.createMunicipalityUser).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
    });

    it("should be blocked if admin check fails", async () => {
      isAdminMock.mockImplementation((req: any, res: any, next: any) => {
        res.status(403).json({ error: "Forbidden" });
      });

      const response = await request(app)
        .post("/api/users/municipality-users")
        .send(mockRequestBody);

      expect(isAuthenticatedMock).toHaveBeenCalled();
      expect(isAdminMock).toHaveBeenCalled();
      expect(userControllerMock.createMunicipalityUser).not.toHaveBeenCalled();
      expect(response.status).toBe(403);
    });
  });

  describe("GET /api/users/municipality-users", () => {
    const mockMunicipalityUsers = [
      {
        id: 1,
        email: "mayor@city.com",
        username: "mayor",
        firstName: "John",
        lastName: "Mayor",
        role: "MUNICIPALITY",
        municipality_role_id: 1,
      },
      {
        id: 2,
        email: "councilor@city.com",
        username: "councilor",
        firstName: "Jane",
        lastName: "Councilor",
        role: "MUNICIPALITY",
        municipality_role_id: 2,
      },
    ];

    it("should call getMunicipalityUsers controller with authentication and admin middleware", async () => {
      userControllerMock.getMunicipalityUsers.mockImplementation((req, res) => {
        res.status(200).json(mockMunicipalityUsers);
      });

      const response = await request(app).get("/api/users/municipality-users");

      expect(isAuthenticatedMock).toHaveBeenCalled();
      expect(isAdminMock).toHaveBeenCalled();
      expect(userControllerMock.getMunicipalityUsers).toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockMunicipalityUsers);
    });

    it("should be blocked if authentication fails", async () => {
      isAuthenticatedMock.mockImplementation(
        (req: any, res: any, next: any) => {
          res.status(401).json({ error: "Unauthorized" });
        },
      );

      const response = await request(app).get("/api/users/municipality-users");

      expect(isAuthenticatedMock).toHaveBeenCalled();
      expect(isAdminMock).not.toHaveBeenCalled();
      expect(userControllerMock.getMunicipalityUsers).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
    });

    it("should be blocked if admin check fails", async () => {
      isAdminMock.mockImplementation((req: any, res: any, next: any) => {
        res.status(403).json({ error: "Forbidden" });
      });

      const response = await request(app).get("/api/users/municipality-users");

      expect(isAuthenticatedMock).toHaveBeenCalled();
      expect(isAdminMock).toHaveBeenCalled();
      expect(userControllerMock.getMunicipalityUsers).not.toHaveBeenCalled();
      expect(response.status).toBe(403);
    });
  });

  describe("GET /api/users/municipality-users/roles", () => {
    const mockRoles = [
      { id: 1, name: "Mayor", description: "Municipality mayor" },
      { id: 2, name: "Councilor", description: "City councilor" },
    ];

    it("should call getAllMunicipalityRoles controller with authentication and admin middleware", async () => {
      userControllerMock.getAllMunicipalityRoles.mockImplementation(
        (req, res) => {
          res.status(200).json(mockRoles);
        },
      );

      const response = await request(app).get(
        "/api/users/municipality-users/roles",
      );

      expect(isAuthenticatedMock).toHaveBeenCalled();
      expect(isAdminMock).toHaveBeenCalled();
      expect(userControllerMock.getAllMunicipalityRoles).toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockRoles);
    });

    it("should be blocked if authentication fails", async () => {
      isAuthenticatedMock.mockImplementation(
        (req: any, res: any, next: any) => {
          res.status(401).json({ error: "Unauthorized" });
        },
      );

      const response = await request(app).get(
        "/api/users/municipality-users/roles",
      );

      expect(isAuthenticatedMock).toHaveBeenCalled();
      expect(isAdminMock).not.toHaveBeenCalled();
      expect(userControllerMock.getAllMunicipalityRoles).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
    });

    it("should be blocked if admin check fails", async () => {
      isAdminMock.mockImplementation((req: any, res: any, next: any) => {
        res.status(403).json({ error: "Forbidden" });
      });

      const response = await request(app).get(
        "/api/users/municipality-users/roles",
      );

      expect(isAuthenticatedMock).toHaveBeenCalled();
      expect(isAdminMock).toHaveBeenCalled();
      expect(userControllerMock.getAllMunicipalityRoles).not.toHaveBeenCalled();
      expect(response.status).toBe(403);
    });
  });
});
