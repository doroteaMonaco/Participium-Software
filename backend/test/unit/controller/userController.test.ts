jest.mock("@services/userService", () => ({
  userService: {
    registerUser: jest.fn(),
    createMunicipalityUser: jest.fn(),
    getAllUsers: jest.fn(),
    getUserById: jest.fn(),
    deleteUser: jest.fn(),
    getAllMunicipalityRoles: jest.fn(),
    getMunicipalityUsers: jest.fn(),
    updateCitizenProfile: jest.fn(),
    createExternalMaintainerUser: jest.fn(),
    getExternalMaintainerUsers: jest.fn(),
  },
}));

jest.mock("@services/authService", () => ({
  authService: {
    login: jest.fn(),
  },
}));

jest.mock("@services/imageService", () => ({
  __esModule: true,
  // default export
  default: {
    storeTemporaryImages: jest.fn(),
  },
}));

import { Request } from "express";
import { userController } from "@controllers/userController";
import { roleType } from "@models/enums";
import { NotFoundError } from "@errors/NotFoundError";
import { userService } from "@services/userService";
import { authService } from "@services/authService";
import imageService from "@services/imageService";

type MockRes = {
  status: jest.Mock;
  json: jest.Mock;
  send: jest.Mock;
};

const makeRes = (): MockRes & any => {
  const status = jest.fn().mockReturnThis();
  const json = jest.fn().mockReturnThis();
  const send = jest.fn().mockReturnThis();
  const setHeader = jest.fn().mockReturnThis();
  const cookie = jest.fn().mockReturnThis();
  const clearCookie = jest.fn().mockReturnThis();
  return { status, json, send, setHeader, cookie, clearCookie };
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

describe("userController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------- register ----------
  describe("register", () => {
    it("returns 201, sets Location and cookie, and returns sanitized user + token", async () => {
      const req = {
        body: {
          email: "mario.rossi@example.com",
          username: "mrossi",
          firstName: "Mario",
          lastName: "Rossi",
          password: "plain",
        },
      } as unknown as Request;
      const res = makeRes();

      const sanitized = {
        firstName: "Mario",
        lastName: "Rossi",
        username: "mrossi",
      };

      (userService.registerUser as jest.Mock).mockResolvedValue(sanitized);
      (authService.login as jest.Mock).mockResolvedValue({ token: "jwt-123" });

      await userController.register(req as any, res as any);

      expect(userService.registerUser).toHaveBeenCalledWith(
        req.body,
        roleType.CITIZEN,
        { firstName: "Mario", lastName: "Rossi" },
      );

      // cookie + Location + 201
      expect(res.cookie).toHaveBeenCalledWith(
        "authToken",
        "jwt-123",
        expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/" }),
      );
      expect(res.setHeader).toHaveBeenCalledWith("Location", "/reports");
      expect(res.status).toHaveBeenCalledWith(201);

      expect(res.json).toHaveBeenCalledWith(sanitized);
    });

    it("returns 400 when required fields are missing", async () => {
      const req = {
        body: { email: "e@e.com", username: "u" }, // missing firstName, lastName, password
      } as unknown as Request;
      const res = makeRes();

      await userController.register(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      // controller may return a detailed message, assert only the error kind
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Bad Request" }),
      );
    });

    it("returns 409 when email is already in use", async () => {
      const req = {
        body: {
          email: "e@e.com",
          username: "u",
          firstName: "F",
          lastName: "L",
          password: "p",
        },
      } as unknown as Request;
      const res = makeRes();

      (userService.registerUser as jest.Mock).mockRejectedValue(
        new Error("Email is already in use"),
      );

      await userController.register(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: "Conflict Error",
        message: "Email is already in use",
      });
    });

    it("returns 409 when username is already in use", async () => {
      const req = {
        body: {
          email: "e@e.com",
          username: "u",
          firstName: "F",
          lastName: "L",
          password: "p",
        },
      } as unknown as Request;
      const res = makeRes();

      (userService.registerUser as jest.Mock).mockRejectedValue(
        new Error("Username is already in use"),
      );

      await userController.register(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: "Conflict Error",
        message: "Username is already in use",
      });
    });

    it("returns 400 for other errors", async () => {
      const req = {
        body: {
          email: "e@e.com",
          username: "u",
          firstName: "F",
          lastName: "L",
          password: "p",
        },
      } as unknown as Request;
      const res = makeRes();

      (userService.registerUser as jest.Mock).mockRejectedValue(
        new Error("boom"),
      );

      await userController.register(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Bad Request",
        message: "boom",
      });
    });
  });

  // -------- createMunicipalityUser --------
  describe("createMunicipalityUser", () => {
    const municipality_role_id = 2;

    it("returns 400 when required fields are missing", async () => {
      const req: any = { body: { email: "a@b.c" } }; // incomplete
      const res = makeRes();

      await userController.createMunicipalityUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Bad Request",
        }),
      );
      expect(userService.createMunicipalityUser).not.toHaveBeenCalled();
    });

    it("returns 409 when email or username is already in use", async () => {
      const payload = makeUser();
      const req: any = { body: { ...payload, municipality_role_id } };
      const res = makeRes();

      (userService.createMunicipalityUser as jest.Mock).mockRejectedValue(
        new Error("Email is already in use"),
      );

      await userController.createMunicipalityUser(req, res);

      expect(userService.createMunicipalityUser).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: "Conflict Error",
        message: "Email is already in use",
      });
    });

    it("returns 201 and the created user on success", async () => {
      const payload = makeUser();
      const req: any = { body: { ...payload, municipality_role_id } };
      const res = makeRes();
      const created = makeUser({ id: 10 });

      (userService.createMunicipalityUser as jest.Mock).mockResolvedValue(
        created,
      );

      await userController.createMunicipalityUser(req, res);

      expect(userService.createMunicipalityUser).toHaveBeenCalledWith(
        expect.objectContaining(payload),
        "Mario",
        "Rossi",
        municipality_role_id,
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(created);
    });

    it("returns 500 for other errors from service", async () => {
      const payload = makeUser();
      const req: any = { body: { ...payload, municipality_role_id } };
      const res = makeRes();

      (userService.createMunicipalityUser as jest.Mock).mockRejectedValue(
        new Error("some failure"),
      );

      await userController.createMunicipalityUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Internal Server Error" }),
      );
    });
  });

  // -------- getAllUsers --------
  describe("getAllUsers", () => {
    it("returns 200 with users on success", async () => {
      const req = {} as any;
      const res = makeRes();
      const users = [makeUser(), makeUser({ id: 2 })];

      (userService.getAllUsers as jest.Mock).mockResolvedValue(users);

      await userController.getAllUsers(req, res);

      expect(userService.getAllUsers).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(users);
    });

    it("returns 500 on service error", async () => {
      const req = {} as any;
      const res = makeRes();

      (userService.getAllUsers as jest.Mock).mockRejectedValue(
        new Error("db fail"),
      );

      await userController.getAllUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Internal Server Error" }),
      );
    });
  });

  // -------- getUserById --------
  describe("getUserById", () => {
    it("returns 400 for invalid id", async () => {
      const req = {
        params: { id: "abc" },
        body: { role: roleType.CITIZEN },
      } as any;
      const res = makeRes();

      await userController.getUserById(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Bad Request" }),
      );
    });

    it("returns 404 when user not found", async () => {
      const req = {
        params: { id: "5" },
        body: { role: roleType.CITIZEN },
      } as any;
      const res = makeRes();

      (userService.getUserById as jest.Mock).mockRejectedValue(
        new NotFoundError("User not found"),
      );

      await userController.getUserById(req, res);

      expect(userService.getUserById).toHaveBeenCalledWith(5, roleType.CITIZEN);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Not Found" }),
      );
    });

    it("returns 200 with user when found", async () => {
      const req = {
        params: { id: "7" },
        body: { role: roleType.CITIZEN },
      } as any;
      const res = makeRes();
      const user = makeUser({ id: 7 });

      (userService.getUserById as jest.Mock).mockResolvedValue(user);

      await userController.getUserById(req, res);

      expect(userService.getUserById).toHaveBeenCalledWith(7, roleType.CITIZEN);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(user);
    });

    it("returns 500 on service error", async () => {
      const req = {
        params: { id: "7" },
        body: { role: roleType.CITIZEN },
      } as any;
      const res = makeRes();

      (userService.getUserById as jest.Mock).mockRejectedValue(
        new Error("boom"),
      );

      await userController.getUserById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Internal Server Error" }),
      );
    });
  });

  // -------- deleteUser --------
  describe("deleteUser", () => {
    it("returns 400 for invalid id", async () => {
      const req = {
        params: { id: "x" },
        body: { role: roleType.CITIZEN },
      } as any;
      const res = makeRes();

      await userController.deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Bad Request" }),
      );
    });

    it("returns 204 on successful delete", async () => {
      const req = {
        params: { id: "3" },
        body: { role: roleType.CITIZEN },
      } as any;
      const res = makeRes();

      (userService.deleteUser as jest.Mock).mockResolvedValue(undefined);

      await userController.deleteUser(req, res);

      expect(userService.deleteUser).toHaveBeenCalledWith(3, roleType.CITIZEN);
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it('returns 404 when service throws "User not found"', async () => {
      const req = {
        params: { id: "9" },
        body: { role: roleType.CITIZEN },
      } as any;
      const res = makeRes();

      (userService.deleteUser as jest.Mock).mockRejectedValue(
        new Error("User not found"),
      );

      await userController.deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "Not Found",
        message: "User not found",
      });
    });

    it("returns 500 for other errors", async () => {
      const req = {
        params: { id: "9" },
        body: { role: roleType.CITIZEN },
      } as any;
      const res = makeRes();

      (userService.deleteUser as jest.Mock).mockRejectedValue(
        new Error("boom"),
      );

      await userController.deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Internal Server Error" }),
      );
    });
  });

  // -------- getAllMunicipalityRoles --------
  describe("getAllMunicipalityRoles", () => {
    it("returns 200 with roles on success", async () => {
      const req = {} as any;
      const res = makeRes();
      const roles = [
        { id: 1, name: "OPERATOR" },
        { id: 2, name: "VALIDATOR" },
      ];

      (userService.getAllMunicipalityRoles as jest.Mock).mockResolvedValue(
        roles,
      );

      await userController.getAllMunicipalityRoles(req, res);

      expect(userService.getAllMunicipalityRoles).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(roles);
    });

    it("returns 500 on service error", async () => {
      const req = {} as any;
      const res = makeRes();

      (userService.getAllMunicipalityRoles as jest.Mock).mockRejectedValue(
        new Error("db fail"),
      );

      await userController.getAllMunicipalityRoles(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Internal Server Error" }),
      );
    });
  });

  // -------- getMunicipalityUsers --------
  describe("getMunicipalityUsers", () => {
    it("returns 200 with municipality users on success", async () => {
      const req = {} as any;
      const res = makeRes();
      const users = [makeUser(), makeUser({ id: 2, username: "muni2" })];

      (userService.getMunicipalityUsers as jest.Mock).mockResolvedValue(users);

      await userController.getMunicipalityUsers(req, res);

      expect(userService.getMunicipalityUsers).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(users);
    });

    it("returns 500 on service error", async () => {
      const req = {} as any;
      const res = makeRes();

      (userService.getMunicipalityUsers as jest.Mock).mockRejectedValue(
        new Error("boom"),
      );

      await userController.getMunicipalityUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Internal Server Error" }),
      );
    });
  });

  // -------- updateCitizenProfile --------
  describe("updateCitizenProfile", () => {
    it("returns 400 when no fields provided", async () => {
      const req: any = { user: { id: 1 }, body: {}, file: undefined };
      const res = makeRes();

      await userController.updateCitizenProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Bad Request",
        }),
      );
      expect(
        userService.updateCitizenProfile as jest.Mock,
      ).not.toHaveBeenCalled();
    });

    it("stores image when file provided and calls service with tempKey", async () => {
      const req: any = {
        user: { id: 11 },
        body: { telegramUsername: undefined, notificationsEnabled: undefined },
        file: {
          buffer: Buffer.from("img"),
          mimetype: "image/png",
          originalname: "a.png",
        },
      };
      const res = makeRes();

      (imageService.storeTemporaryImages as jest.Mock).mockResolvedValue([
        "tmp-1",
      ]);
      (userService.updateCitizenProfile as jest.Mock).mockResolvedValue(
        undefined,
      );

      await userController.updateCitizenProfile(req, res);

      expect(imageService.storeTemporaryImages).toHaveBeenCalledWith([
        {
          buffer: req.file.buffer,
          mimetype: req.file.mimetype,
          originalname: req.file.originalname,
        },
      ]);
      expect(userService.updateCitizenProfile).toHaveBeenCalledWith(
        11,
        "tmp-1",
        undefined,
        undefined,
      );
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it("passes telegramUsername and tempKey when both file and telegram provided", async () => {
      const req: any = {
        user: { id: 99 },
        body: { telegramUsername: "tg99", notificationsEnabled: undefined },
        file: {
          buffer: Buffer.from("img2"),
          mimetype: "image/jpeg",
          originalname: "b.jpg",
        },
      };
      const res = makeRes();

      (imageService.storeTemporaryImages as jest.Mock).mockResolvedValue([
        "tmp-99",
      ]);
      (userService.updateCitizenProfile as jest.Mock).mockResolvedValue(
        undefined,
      );

      await userController.updateCitizenProfile(req, res);

      expect(imageService.storeTemporaryImages).toHaveBeenCalledWith([
        {
          buffer: req.file.buffer,
          mimetype: req.file.mimetype,
          originalname: req.file.originalname,
        },
      ]);
      expect(userService.updateCitizenProfile).toHaveBeenCalledWith(
        99,
        "tmp-99",
        "tg99",
        undefined,
      );
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it("converts notificationsEnabled string to boolean and passes to service", async () => {
      const req: any = {
        user: { id: 22 },
        body: { telegramUsername: "tguser", notificationsEnabled: "true" },
        file: undefined,
      };
      const res = makeRes();

      (userService.updateCitizenProfile as jest.Mock).mockResolvedValue(
        undefined,
      );

      await userController.updateCitizenProfile(req, res);

      expect(userService.updateCitizenProfile).toHaveBeenCalledWith(
        22,
        undefined,
        "tguser",
        true,
      );
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it("converts notificationsEnabled string 'false' to boolean false", async () => {
      const req: any = {
        user: { id: 23 },
        body: { telegramUsername: undefined, notificationsEnabled: "false" },
        file: undefined,
      };
      const res = makeRes();

      (userService.updateCitizenProfile as jest.Mock).mockResolvedValue(
        undefined,
      );

      await userController.updateCitizenProfile(req, res);

      expect(userService.updateCitizenProfile).toHaveBeenCalledWith(
        23,
        undefined,
        undefined,
        false,
      );
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it("accepts boolean notificationsEnabled true", async () => {
      const req: any = {
        user: { id: 33 },
        body: { notificationsEnabled: true },
        file: undefined,
      };
      const res = makeRes();

      (userService.updateCitizenProfile as jest.Mock).mockResolvedValue(
        undefined,
      );

      await userController.updateCitizenProfile(req, res);

      expect(userService.updateCitizenProfile).toHaveBeenCalledWith(
        33,
        undefined,
        undefined,
        true,
      );
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it("returns 500 on service error", async () => {
      const req: any = {
        user: { id: 44 },
        body: { telegramUsername: "x" },
        file: undefined,
      };
      const res = makeRes();

      (userService.updateCitizenProfile as jest.Mock).mockRejectedValue(
        new Error("boom"),
      );

      await userController.updateCitizenProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Internal Server Error" }),
      );
    });
  });

  // -------- normalizeCategoryInput and createExternalMaintainerUser --------
  describe("createExternalMaintainerUser", () => {
    it("returns 201 when external maintainer user created successfully", async () => {
      const req = {
        body: {
          email: "em@example.com",
          username: "em1",
          firstName: "External",
          lastName: "Maintainer",
          password: "pass",
          companyName: "CompanyA",
          category: "PUBLIC_LIGHTING",
        },
      } as unknown as Request;
      const res = makeRes();

      const user = makeUser({ id: 5, email: "em@example.com" });
      (userService.createExternalMaintainerUser as jest.Mock).mockResolvedValue(user);

      await userController.createExternalMaintainerUser(req as any, res as any);

      expect(userService.createExternalMaintainerUser).toHaveBeenCalledWith(
        expect.any(Object),
        "CompanyA",
        "PUBLIC_LIGHTING",
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(user);
    });

    it("returns 400 for invalid category", async () => {
      const req = {
        body: {
          email: "em@example.com",
          username: "em1",
          firstName: "External",
          lastName: "Maintainer",
          password: "pass",
          companyName: "CompanyA",
          category: "INVALID_CATEGORY",
        },
      } as unknown as Request;
      const res = makeRes();

      await userController.createExternalMaintainerUser(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Bad Request",
          message: "Invalid category provided",
        }),
      );
    });

    it("returns 400 when category is null/whitespace", async () => {
      const req = {
        body: {
          email: "em@example.com",
          username: "em1",
          firstName: "External",
          lastName: "Maintainer",
          password: "pass",
          companyName: "CompanyA",
          category: "   ",
        },
      } as unknown as Request;
      const res = makeRes();

      await userController.createExternalMaintainerUser(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 409 when email already in use", async () => {
      const req = {
        body: {
          email: "em@example.com",
          username: "em1",
          firstName: "External",
          lastName: "Maintainer",
          password: "pass",
          companyName: "CompanyA",
          category: "PUBLIC_LIGHTING",
        },
      } as unknown as Request;
      const res = makeRes();

      (userService.createExternalMaintainerUser as jest.Mock).mockRejectedValue(
        new Error("Email is already in use"),
      );

      await userController.createExternalMaintainerUser(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("returns 409 when username already in use", async () => {
      const req = {
        body: {
          email: "em@example.com",
          username: "em1",
          firstName: "External",
          lastName: "Maintainer",
          password: "pass",
          companyName: "CompanyA",
          category: "PUBLIC_LIGHTING",
        },
      } as unknown as Request;
      const res = makeRes();

      (userService.createExternalMaintainerUser as jest.Mock).mockRejectedValue(
        new Error("Username is already in use"),
      );

      await userController.createExternalMaintainerUser(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("returns 500 on service error", async () => {
      const req = {
        body: {
          email: "em@example.com",
          username: "em1",
          firstName: "External",
          lastName: "Maintainer",
          password: "pass",
          companyName: "CompanyA",
          category: "PUBLIC_LIGHTING",
        },
      } as unknown as Request;
      const res = makeRes();

      (userService.createExternalMaintainerUser as jest.Mock).mockRejectedValue(
        new Error("boom"),
      );

      await userController.createExternalMaintainerUser(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // -------- deleteUser --------
  describe("deleteUser", () => {
    it("returns 204 when user deleted successfully", async () => {
      const req = {
        params: { id: "5" },
        body: { role: roleType.CITIZEN },
      } as unknown as Request;
      const res = makeRes();

      (userService.deleteUser as jest.Mock).mockResolvedValue(undefined);

      await userController.deleteUser(req as any, res as any);

      expect(userService.deleteUser).toHaveBeenCalledWith(5, roleType.CITIZEN);
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it("returns 400 for invalid user ID", async () => {
      const req = {
        params: { id: "invalid" },
        body: { role: roleType.CITIZEN },
      } as unknown as Request;
      const res = makeRes();

      await userController.deleteUser(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when user not found", async () => {
      const req = {
        params: { id: "999" },
        body: { role: roleType.CITIZEN },
      } as unknown as Request;
      const res = makeRes();

      (userService.deleteUser as jest.Mock).mockRejectedValue(
        new NotFoundError("User not found"),
      );

      await userController.deleteUser(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 500 on service error", async () => {
      const req = {
        params: { id: "5" },
        body: { role: roleType.CITIZEN },
      } as unknown as Request;
      const res = makeRes();

      (userService.deleteUser as jest.Mock).mockRejectedValue(new Error("boom"));

      await userController.deleteUser(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // -------- getExternalMaintainerUsers --------
  describe("getExternalMaintainerUsers", () => {
    it("returns 200 with list of external maintainers", async () => {
      const req = {} as unknown as Request;
      const res = makeRes();

      const maintainers = [
        makeUser({ id: 1, email: "m1@example.com" }),
        makeUser({ id: 2, email: "m2@example.com" }),
      ];

      (userService.getExternalMaintainerUsers as jest.Mock).mockResolvedValue(
        maintainers,
      );

      await userController.getExternalMaintainerUsers(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(maintainers);
    });

    it("returns 500 on service error", async () => {
      const req = {} as unknown as Request;
      const res = makeRes();

      (userService.getExternalMaintainerUsers as jest.Mock).mockRejectedValue(
        new Error("boom"),
      );

      await userController.getExternalMaintainerUsers(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Internal Server Error" }),
      );
    });
  });
});
