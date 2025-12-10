import { Request, Response } from "express";
import {
  isCitizen,
  isAdmin,
  isMunicipality,
  isMunicipalityStrict,
  isExternalMaintainer,
  isMunicipalityOrExternalMaintainer,
  hasRole,
} from "@middlewares/roleMiddleware";

type ResMock = Partial<Response> & {
  status: jest.Mock;
  json: jest.Mock;
};

const makeRes = (): ResMock => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const makeReq = (user?: any, role?: string): Request =>
  ({
    user,
    role,
  }) as Request;

const makeNext = jest.fn();

describe("Role Middlewares", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("isCitizen", () => {
    it("allows citizen user to proceed", () => {
      const req = makeReq({ id: 1 }, "CITIZEN");
      const res = makeRes();

      isCitizen(req, res as Response, makeNext);

      expect(makeNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("allows admin user to proceed", () => {
      const req = makeReq({ id: 1 }, "ADMIN");
      const res = makeRes();

      isCitizen(req, res as Response, makeNext);

      expect(makeNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("denies non-citizen user", () => {
      const req = makeReq({ id: 1 }, "MUNICIPALITY");
      const res = makeRes();

      isCitizen(req, res as Response, makeNext);

      expect(makeNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: "Authorization Error",
        message: "Access denied. Citizen role required.",
      });
    });

    it("denies unauthenticated user", () => {
      const req = makeReq();
      const res = makeRes();

      isCitizen(req, res as Response, makeNext);

      expect(makeNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Authentication Error",
        message: "User not authenticated",
      });
    });
  });

  describe("isAdmin", () => {
    it("allows admin user to proceed", () => {
      const req = makeReq({ id: 1 }, "ADMIN");
      const res = makeRes();

      isAdmin(req, res as Response, makeNext);

      expect(makeNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("denies non-admin user", () => {
      const req = makeReq({ id: 1 }, "CITIZEN");
      const res = makeRes();

      isAdmin(req, res as Response, makeNext);

      expect(makeNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: "Authorization Error",
        message: "Access denied. Admin role required.",
      });
    });

    it("denies when user is not authenticated", () => {
      const req = makeReq(undefined);
      const res = makeRes();

      isAdmin(req, res as Response, makeNext);

      expect(makeNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Authentication Error",
        message: "User not authenticated",
      });
    });
  });

  describe("isMunicipality", () => {
    it("allows municipality user to proceed", () => {
      const req = makeReq({ id: 1 }, "MUNICIPALITY");
      const res = makeRes();

      isMunicipality(req, res as Response, makeNext);

      expect(makeNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("allows admin user to proceed", () => {
      const req = makeReq({ id: 1 }, "ADMIN");
      const res = makeRes();

      isMunicipality(req, res as Response, makeNext);

      expect(makeNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("denies non-municipality user", () => {
      const req = makeReq({ id: 1 }, "CITIZEN");
      const res = makeRes();

      isMunicipality(req, res as Response, makeNext);

      expect(makeNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: "Authorization Error",
        message: "Access denied. Municipality role required.",
      });
    });

    it("denies when user is not authenticated", () => {
      const req = makeReq(undefined);
      const res = makeRes();

      isMunicipality(req, res as Response, makeNext);

      expect(makeNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Authentication Error",
        message: "User not authenticated",
      });
    });
  });

  describe("isMunicipalityStrict", () => {
    it("allows only municipality user to proceed", () => {
      const req = makeReq({ id: 1 }, "MUNICIPALITY");
      const res = makeRes();

      isMunicipalityStrict(req, res as Response, makeNext);

      expect(makeNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("denies admin user", () => {
      const req = makeReq({ id: 1 }, "ADMIN");
      const res = makeRes();

      isMunicipalityStrict(req, res as Response, makeNext);

      expect(makeNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: "Authorization Error",
        message: "Access denied. Municipality role required.",
      });
    });

    it("denies non-municipality user", () => {
      const req = makeReq({ id: 1 }, "CITIZEN");
      const res = makeRes();

      isMunicipalityStrict(req, res as Response, makeNext);

      expect(makeNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: "Authorization Error",
        message: "Access denied. Municipality role required.",
      });
    });

    it("denies when user is not authenticated", () => {
      const req = makeReq(undefined);
      const res = makeRes();

      isMunicipalityStrict(req, res as Response, makeNext);

      expect(makeNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Authentication Error",
        message: "User not authenticated",
      });
    });
  });

  describe("isExternalMaintainer", () => {
    it("allows external maintainer user to proceed", () => {
      const req = makeReq({ id: 1 }, "EXTERNAL_MAINTAINER");
      const res = makeRes();

      isExternalMaintainer(req, res as Response, makeNext);

      expect(makeNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("denies non-external maintainer user", () => {
      const req = makeReq({ id: 1 }, "CITIZEN");
      const res = makeRes();

      isExternalMaintainer(req, res as Response, makeNext);

      expect(makeNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: "Authorization Error",
        message: "Access denied. External Maintainer role required.",
      });
    });

    it("denies when user is not authenticated", () => {
      const req = makeReq(undefined);
      const res = makeRes();

      isExternalMaintainer(req, res as Response, makeNext);

      expect(makeNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Authentication Error",
        message: "User not authenticated",
      });
    });
  });

  describe("isMunicipalityOrExternalMaintainer", () => {
    it("allows municipality user to proceed", () => {
      const req = makeReq({ id: 1 }, "MUNICIPALITY");
      const res = makeRes();

      isMunicipalityOrExternalMaintainer(req, res as Response, makeNext);

      expect(makeNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("allows external maintainer user to proceed", () => {
      const req = makeReq({ id: 1 }, "EXTERNAL_MAINTAINER");
      const res = makeRes();

      isMunicipalityOrExternalMaintainer(req, res as Response, makeNext);

      expect(makeNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("denies citizen user", () => {
      const req = makeReq({ id: 1 }, "CITIZEN");
      const res = makeRes();

      isMunicipalityOrExternalMaintainer(req, res as Response, makeNext);

      expect(makeNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: "Authorization Error",
        message:
          "Access denied. Municipality or External Maintainer role required.",
      });
    });

    it("denies admin user", () => {
      const req = makeReq({ id: 1 }, "ADMIN");
      const res = makeRes();

      isMunicipalityOrExternalMaintainer(req, res as Response, makeNext);

      expect(makeNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: "Authorization Error",
        message:
          "Access denied. Municipality or External Maintainer role required.",
      });
    });

    it("denies when user is not authenticated", () => {
      const req = makeReq(undefined);
      const res = makeRes();

      isMunicipalityOrExternalMaintainer(req, res as Response, makeNext);

      expect(makeNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Authentication Error",
        message: "User not authenticated",
      });
    });
  });

  describe("hasRole", () => {
    it("allows user with required role to proceed", () => {
      const req = makeReq({ id: 1 }, "CITIZEN");
      const res = makeRes();

      hasRole(["CITIZEN"])(req, res as Response, makeNext);

      expect(makeNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("denies user without required role", () => {
      const req = makeReq({ id: 1 }, "CITIZEN");
      const res = makeRes();

      hasRole(["ADMIN"])(req, res as Response, makeNext);

      expect(makeNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: "Authorization Error",
        message: "Access denied. Required roles: ADMIN",
      });
    });

    it("denies when user is not authenticated", () => {
      const req = makeReq(undefined);
      const res = makeRes();

      hasRole(["CITIZEN"])(req, res as Response, makeNext);

      expect(makeNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Authentication Error",
        message: "User not authenticated",
      });
    });

    it("denies when user role is not found", () => {
      const req = makeReq({ id: 1 }, undefined);
      const res = makeRes();

      hasRole(["CITIZEN"])(req, res as Response, makeNext);

      expect(makeNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Authentication Error",
        message: "User role not found",
      });
    });
  });
});
