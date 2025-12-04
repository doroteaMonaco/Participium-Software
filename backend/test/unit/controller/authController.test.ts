import { Request, Response } from "express";

jest.mock("@services/authService", () => ({
  authService: {
    registerUser: jest.fn(),
    login: jest.fn(),
    verifyAuth: jest.fn(),
  },
}));

import { authController } from "@controllers/authController";
import { authService } from "@services/authService";
import { roleType } from "@models/enums";

type ResMock = Partial<Response> & {
  status: jest.Mock;
  json: jest.Mock;
  setHeader: jest.Mock;
  send: jest.Mock;
  cookie: jest.Mock;
  clearCookie: jest.Mock;
};

const makeRes = (): ResMock => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res); // <-- usa cookie(), non setHeader('Set-Cookie', ...)
  res.clearCookie = jest.fn().mockReturnValue(res); // <-- per logout
  return res;
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

describe("authController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------- login ----------
  describe("login", () => {
    it("returns 200, sets cookie and Location, and returns sanitized user", async () => {
      const req = {
        body: {
          identifier: "mrossi",
          password: "plain",
          role: roleType.CITIZEN,
        },
      } as unknown as Request;
      const res = makeRes();

      const user = makeUser();
      (authService.login as jest.Mock).mockResolvedValue({
        user,
        token: "jwt-abc",
      });

      await authController.login(req, res as unknown as Response, jest.fn());

      expect(authService.login).toHaveBeenCalledWith(
        "mrossi",
        "plain",
        roleType.CITIZEN,
      );
      expect(res.cookie).toHaveBeenCalledWith(
        "authToken",
        "jwt-abc",
        expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/" }),
      );
      expect(res.setHeader).toHaveBeenCalledWith("Location", "/reports");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(user);
    });

    it("returns 401 on authentication errors", async () => {
      const req = {
        body: {
          identifier: "mrossi",
          password: "wrong",
          role: roleType.CITIZEN,
        },
      } as unknown as Request;
      const res = makeRes();

      (authService.login as jest.Mock).mockRejectedValue(
        new Error("Invalid password"),
      );

      await authController.login(req, res as unknown as Response, jest.fn());

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Authentication Error",
        message: "Invalid password",
      });
    });

    it("returns 400 when identifier or password are missing", async () => {
      const req = {
        body: { identifier: "mrossi" }, // missing password
      } as unknown as Request;
      const res = makeRes();

      await authController.login(req, res as unknown as Response, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Bad Request" }),
      );
    });
  });

  // ---------- verifyAuth ----------
  describe("verifyAuth", () => {
    it("returns 200 and sanitized user on success", async () => {
      const fullUser = makeUser({ id: 7 });
      const req = { cookies: { authToken: "ok" } } as unknown as Request;
      const res = makeRes();

      (authService.verifyAuth as jest.Mock).mockResolvedValue(fullUser);

      await authController.verifyAuth(req, res as unknown as Response);

      expect(authService.verifyAuth).toHaveBeenCalledWith("ok");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(fullUser);
    });

    it("returns 401 on verification error", async () => {
      const req = { cookies: { authToken: "bad" } } as unknown as Request;
      const res = makeRes();

      (authService.verifyAuth as jest.Mock).mockRejectedValue(
        new Error("Invalid or expired token"),
      );

      await authController.verifyAuth(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Authentication Error",
        message: "Session is invalid or has expired", // <-- messaggio del tuo controller
      });
    });
  });

  // ---------- logout ----------
  describe("logout", () => {
    it("returns 204 and clears cookie when authenticated", async () => {
      const req = { cookies: { authToken: "jwt" } } as unknown as Request; // <-- simula cookie presente
      const res = makeRes();

      await authController.logout(req, res as unknown as Response);

      expect(res.clearCookie).toHaveBeenCalledWith(
        "authToken",
        expect.any(Object),
      );
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it("returns 401 when not authenticated (no cookie)", async () => {
      const req = {} as unknown as Request; // <-- nessun cookie
      const res = makeRes();

      await authController.logout(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Authentication Error",
        message: "You must be logged in to logout",
      });
    });
  });
});
