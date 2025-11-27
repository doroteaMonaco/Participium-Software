jest.mock("@services/userService", () => ({
  userService: {
    createMunicipalityUser: jest.fn(),
    getAllUsers: jest.fn(),
    getUserById: jest.fn(),
    deleteUser: jest.fn(),
    getAllMunicipalityRoles: jest.fn(),
    getMunicipalityUsers: jest.fn(),
  },
}));

import { userController } from "@controllers/userController";
import { userService } from "@services/userService";

type MockRes = {
  status: jest.Mock;
  json: jest.Mock;
  send: jest.Mock;
};

const makeRes = (): MockRes & any => {
  const status = jest.fn().mockReturnThis();
  const json = jest.fn().mockReturnThis();
  const send = jest.fn().mockReturnThis();
  return { status, json, send };
};

const makeUser = (overrides: Partial<any> = {}) => ({
  id: 1,
  email: "mario.rossi@example.com",
  username: "mrossi",
  firstName: "Mario",
  lastName: "Rossi",
  password: "hashed",
  municipality_role_id: 2,
  ...overrides,
});

describe("userController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------- createMunicipalityUser --------
  describe("createMunicipalityUser", () => {
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
      const req: any = { body: { ...payload } };
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
      const req: any = { body: payload };
      const res = makeRes();
      const created = makeUser({ id: 10, role: "MUNICIPALITY" });

      (userService.createMunicipalityUser as jest.Mock).mockResolvedValue(
        created,
      );

      await userController.createMunicipalityUser(req, res);

      expect(userService.createMunicipalityUser).toHaveBeenCalledWith(
        payload.email,
        payload.username,
        payload.firstName,
        payload.lastName,
        payload.password,
        payload.municipality_role_id,
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(created);
    });

    it("returns 500 for other errors from service", async () => {
      const payload = makeUser();
      const req: any = { body: { ...payload } };
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
      const req = { params: { id: "abc" } } as any;
      const res = makeRes();

      await userController.getUserById(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Bad Request" }),
      );
    });

    it("returns 404 when user not found", async () => {
      const req = { params: { id: "5" } } as any;
      const res = makeRes();

      (userService.getUserById as jest.Mock).mockResolvedValue(null);

      await userController.getUserById(req, res);

      expect(userService.getUserById).toHaveBeenCalledWith(5);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "Not Found",
        message: "User not found",
      });
    });

    it("returns 200 with user when found", async () => {
      const req = { params: { id: "7" } } as any;
      const res = makeRes();
      const user = makeUser({ id: 7 });

      (userService.getUserById as jest.Mock).mockResolvedValue(user);

      await userController.getUserById(req, res);

      expect(userService.getUserById).toHaveBeenCalledWith(7);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(user);
    });

    it("returns 500 on service error", async () => {
      const req = { params: { id: "7" } } as any;
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
      const req = { params: { id: "x" } } as any;
      const res = makeRes();

      await userController.deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Bad Request" }),
      );
    });

    it("returns 204 on successful delete", async () => {
      const req = { params: { id: "3" } } as any;
      const res = makeRes();

      (userService.deleteUser as jest.Mock).mockResolvedValue(undefined);

      await userController.deleteUser(req, res);

      expect(userService.deleteUser).toHaveBeenCalledWith(3);
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it('returns 404 when service throws "User not found"', async () => {
      const req = { params: { id: "9" } } as any;
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
      const req = { params: { id: "9" } } as any;
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
});
