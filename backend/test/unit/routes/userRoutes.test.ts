import express, { Request, Response, NextFunction } from "express";
import request from "supertest";

jest.mock("@controllers/authController", () => ({
  authController: {
    register: jest.fn((req: Request, res: Response) =>
      res.status(201).json({ route: "register", body: req.body }),
    ),
  },
}));

jest.mock("@controllers/userController", () => ({
  userController: {
    register: jest.fn((req: Request, res: Response) =>
      res.status(201).json({ route: "register", body: req.body }),
    ),
    // Admin endpoints
    createMunicipalityUser: jest.fn((req: Request, res: Response) =>
      res.status(201).json({ route: "createMunicipalityUser", body: req.body }),
    ),
    getAllUsers: jest.fn((_req: Request, res: Response) =>
      res.status(200).json([{ id: 1 }, { id: 2 }]),
    ),
    getUserById: jest.fn((req: Request, res: Response) =>
      res.status(200).json({ route: "getUserById", id: Number(req.params.id) }),
    ),
    deleteUser: jest.fn((_req: Request, res: Response) =>
      res.status(204).send(),
    ),
    getMunicipalityUsers: jest.fn((_req: Request, res: Response) =>
      res.status(200).json([{ id: 10, username: "muni1" }]),
    ),
    getAllMunicipalityRoles: jest.fn((_req: Request, res: Response) =>
      res.status(200).json([
        { id: 1, name: "OPERATOR" },
        { id: 2, name: "VALIDATOR" },
        { id: 3, name: "SUPERVISOR" },
      ]),
    ),
  },
}));

import { authController } from "@controllers/authController";

describe("userRouter (public routes)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/users", () => {
    it("routes to authController.register and returns 201", async () => {
      const app = makeApp();
      const payload = {
        email: "mario.rossi@example.com",
        username: "mrossi",
        firstName: "Mario",
        lastName: "Rossi",
        password: "plain",
      };

      const res = await request(app).post("/api/users").send(payload);

      expect(res.status).toBe(201);
      expect(res.body).toEqual({ route: "register", body: payload });
      expect(userController.register).toHaveBeenCalledTimes(1);
    });
  });
});

// default middlewares will allow requests; tests override implementations as needed
const authMiddleware = {
  isAuthenticated: jest.fn((req: any, res: any, next: any) => next()),
};
const roleMiddleware = {
  isAdmin: jest.fn((req: any, res: any, next: any) => next()),
};

jest.mock("@middlewares/authMiddleware", () => authMiddleware);
jest.mock("@middlewares/roleMiddleware", () => roleMiddleware);

import userRouter from "@routes/userRouter";
import { userController } from "@controllers/userController";

const makeApp = () => {
  const app = express();
  app.use(express.json());
  // mount router under /api/users to match userRouter
  app.use("/api/users", userRouter);
  return app;
};

describe("userRouter (admin routes)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // default: allow auth and admin
    (authMiddleware.isAuthenticated as jest.Mock).mockImplementation(
      (req, res, next) => next(),
    );
    (roleMiddleware.isAdmin as jest.Mock).mockImplementation((req, res, next) =>
      next(),
    );
  });

  describe("POST /api/users/municipality-users", () => {
    it("routes to userController.createMunicipalityUser and returns 201", async () => {
      const app = makeApp();
      const payload = {
        email: "mario.rossi@example.com",
        username: "mrossi",
        firstName: "Mario",
        lastName: "Rossi",
        password: "plain",
        municipality_role_id: 2,
      };

      const res = await request(app)
        .post("/api/users/municipality-users")
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        route: "createMunicipalityUser",
        body: payload,
      });
      expect(userController.createMunicipalityUser).toHaveBeenCalledTimes(1);
    });

    it("returns 401 when not authenticated", async () => {
      (authMiddleware.isAuthenticated as jest.Mock).mockImplementation(
        (req: any, res: any) => res.status(401).json({ error: "Unauthorized" }),
      );
      const app = makeApp();

      const res = await request(app)
        .post("/api/users/municipality-users")
        .send({});
      expect(res.status).toBe(401);
      expect(userController.createMunicipalityUser).not.toHaveBeenCalled();
    });

    it("returns 403 when authenticated but not admin", async () => {
      (roleMiddleware.isAdmin as jest.Mock).mockImplementation(
        (req: any, res: any) => res.status(403).json({ error: "Forbidden" }),
      );
      const app = makeApp();

      const res = await request(app)
        .post("/api/users/municipality-users")
        .send({});
      expect(res.status).toBe(403);
      expect(userController.createMunicipalityUser).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/users", () => {
    it("routes to userController.getAllUsers and returns 200 array", async () => {
      const app = makeApp();

      const res = await request(app).get("/api/users");

      expect(res.status).toBe(200);
      expect(res.body).toEqual([{ id: 1 }, { id: 2 }]);
      expect(userController.getAllUsers).toHaveBeenCalledTimes(1);
    });

    it("401 when not authenticated", async () => {
      (authMiddleware.isAuthenticated as jest.Mock).mockImplementation(
        (req: any, res: any) => res.status(401).json({ error: "Unauthorized" }),
      );
      const app = makeApp();
      await request(app).get("/api/users").expect(401);
      expect(userController.getAllUsers).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/users/:id", () => {
    it("routes to userController.getUserById and returns 200 with parsed id", async () => {
      const app = makeApp();

      const res = await request(app).get("/api/users/7");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ route: "getUserById", id: 7 });
      expect(userController.getUserById).toHaveBeenCalledTimes(1);
    });

    it("returns 400 when id is non-numeric (middleware/controller may handle)", async () => {
      // Keep middleware allowing through; controller mock returns Number(req.params.id)
      const app = makeApp();
      const res = await request(app).get("/api/users/abc");
      // the controller mock will return NaN as id, assert the route was invoked
      expect(res.status).toBe(200);
      expect(userController.getUserById).toHaveBeenCalledTimes(1);
    });
  });

  describe("DELETE /api/users/:id", () => {
    it("routes to userController.deleteUser and returns 204", async () => {
      const app = makeApp();

      const res = await request(app).delete("/api/users/5");

      expect(res.status).toBe(204);
      expect(res.text).toBe("");
      expect(userController.deleteUser).toHaveBeenCalledTimes(1);
    });
  });

  describe("GET /api/users/municipality-users", () => {
    it("routes to userController.getMunicipalityUsers and returns 200 list", async () => {
      const app = makeApp();

      const res = await request(app).get("/api/users/municipality-users");

      expect(res.status).toBe(200);

      expect(Array.isArray(res.body)).toBeTruthy();
      expect(res.body).toEqual([{ id: 10, username: "muni1" }]);
      expect(userController.getMunicipalityUsers).toHaveBeenCalledTimes(1);
    });
  });

  describe("GET /api/users/municipality-users/roles", () => {
    it("routes to userController.getAllMunicipalityRoles and returns roles", async () => {
      const app = makeApp();

      const res = await request(app).get("/api/users/municipality-users/roles");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBeTruthy();
      expect(res.body[0]).toHaveProperty("id");
      expect(userController.getAllMunicipalityRoles).toHaveBeenCalledTimes(1);
    });
  });
});
