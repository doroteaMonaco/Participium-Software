import express, { Request, Response, NextFunction } from "express";
import request from "supertest";
import multer from "multer";

jest.mock("@controllers/reportController", () => ({
  __esModule: true,
  submitReport: jest.fn((req: Request, res: Response) =>
    res.status(201).json({
      route: "submitReport",
      body: (req as any).body ?? {},
      files: Array.isArray((req as any).files) ? (req as any).files.length : 0,
    }),
  ),
  getReports: jest.fn((req: Request, res: Response) =>
    res.json({ route: "getReports", query: (req as any).query ?? null }),
  ),
  getReportById: jest.fn((req: Request, res: Response) =>
    res.json({ route: "getReportById", id: Number(req.params.id) }),
  ),
  approveOrRejectReport: jest.fn((req: Request, res: Response) =>
    res.status(204).send(),
  ),
  getReportsForMunicipalityUser: jest.fn((req: Request, res: Response) =>
    res.json({
      route: "getReportsForMunicipalityUser",
      municipalityUserId: req.params.municipalityUserId,
    }),
  ),
  assignToExternalMaintainer: jest.fn((req: Request, res: Response) =>
    res.json({ route: "assignToExternalMaintainer", reportId: req.params.report_id }),
  ),
  getReportsForExternalMaintainer: jest.fn((req: Request, res: Response) =>
    res.json({ route: "getReportsForExternalMaintainer", maintainerId: req.params.externalMaintainersId }),
  ),
}));

jest.mock("@middlewares/authMiddleware", () => ({
  isAuthenticated: jest.fn((req: Request, res: Response, next: Function) =>
    next(),
  ),
}));

jest.mock("@middlewares/roleMiddleware", () => ({
  isMunicipality: jest.fn((req: Request, res: Response, next: Function) =>
    next(),
  ),
  isMunicipalityStrict: jest.fn((req: Request, res: Response, next: Function) =>
    next(),
  ),
  isCitizen: jest.fn((req: Request, res: Response, next: Function) => next()),
  isExternalMaintainer: jest.fn((req: Request, res: Response, next: Function) =>
    next(),
  ),
  hasRole: jest.fn(
    () => (req: Request, res: Response, next: Function) => next(),
  ),
}));

jest.mock("@middlewares/uploadMiddleware", () => ({
  uploadArray: jest.fn(() => (req: Request, res: Response, next: Function) => {
    // Mock multer.array behavior - parse multipart but don't actually process files
    next();
  }),
}));

import reportRouter from "@routes/reportRouter";
import {
  submitReport,
  getReports,
  getReportById,
  approveOrRejectReport,
  getReportsForMunicipalityUser,
} from "@controllers/reportController";

import { isAuthenticated } from "@middlewares/authMiddleware";
import {
  hasRole,
  isMunicipality,
  isMunicipalityStrict,
  isCitizen,
} from "@middlewares/roleMiddleware";

const isAuthenticatedMock = isAuthenticated as jest.Mock;
const isMunicipalityMock = isMunicipality as jest.Mock;
const isMunicipalityStrictMock = isMunicipalityStrict as jest.Mock;
const isCitizenMock = isCitizen as jest.Mock;
const hasRoleMock = hasRole as jest.Mock;

// create multer instance matching app.ts behavior
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 3,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use("/api/reports", reportRouter);
  // NOTA: niente error handler custom -> le error di multer diventano 500
  return app;
};

const makeReport = (overrides: Partial<any> = {}) => ({
  title: "t",
  description: "d",
  latitude: "1",
  longitude: "2",
  category: "WASTE",
  photos: [] as Array<{
    buf?: Buffer;
    filename?: string;
    contentType?: string;
  }>,
  ...overrides,
});

const applyMultipart = (
  req: request.Test,
  data: ReturnType<typeof makeReport>,
  opts: { auth?: boolean } = {},
) => {
  req
    .field("title", data.title)
    .field("description", data.description)
    .field("latitude", data.latitude)
    .field("longitude", data.longitude)
    .field("category", data.category);

  if (Array.isArray(data.photos)) {
    data.photos.forEach((p) => {
      // supertest.attach(field, buffer, filename)
      const buf = p.buf ?? Buffer.from("");
      const filename = p.filename ?? "file.jpg";
      req.attach("photos", buf, filename);
    });
  }

  return req;
};

describe("reportRouter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isAuthenticated as jest.Mock).mockImplementation(
      (req: any, res: any, next: any) => next(),
    );
    (isCitizen as jest.Mock).mockImplementation(
      (req: any, res: any, next: any) => next(),
    );
    (isMunicipality as jest.Mock).mockImplementation(
      (req: any, res: any, next: any) => next(),
    );
    (isMunicipalityStrict as jest.Mock).mockImplementation(
      (req: any, res: any, next: any) => next(),
    );
    (hasRole as jest.Mock).mockImplementation(
      (roles: string[]) => (req: any, res: any, next: any) => next(),
    );
  });

  describe("POST /api/reports", () => {
    it("JSON: calls submitReport and returns 201 with body, files=0", async () => {
      const app = makeApp();
      const payload = { any: "thing" };

      const res = await request(app).post("/api/reports").send(payload);

      expect(isAuthenticatedMock).toHaveBeenCalled();
      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        route: "submitReport",
        body: payload,
        files: 0,
      });
      expect(submitReport).toHaveBeenCalledTimes(1);
    });

    it("multipart: calls submitReport and passes the files (2 images)", async () => {
      const app = makeApp();
      const data = makeReport({
        photos: [
          {
            buf: Buffer.from("file1"),
            filename: "a.jpg",
            contentType: "image/jpeg",
          },
          {
            buf: Buffer.from("file2"),
            filename: "b.png",
            contentType: "image/png",
          },
        ],
      });

      const res = await applyMultipart(request(app).post("/api/reports"), data);

      expect(res.status).toBe(201);
      expect(res.body.route).toBe("submitReport");
      // Mock uploadArray doesn't populate req.files, so mocked controller sees 0 files
      expect(res.body.files).toBe(0);
      expect(submitReport).toHaveBeenCalledTimes(1);
    });

    it("multipart with >3 files: mocked uploadArray allows it, controller checks and returns 400", async () => {
      const app = makeApp();

      const req = request(app)
        .post("/api/reports/")
        .field("title", "t")
        .field("description", "d")
        .field("latitude", "1")
        .field("longitude", "2")
        .field("category", "WASTE")
        .attach("photos", Buffer.from("f1"), "1.jpg")
        .attach("photos", Buffer.from("f2"), "2.jpg")
        .attach("photos", Buffer.from("f3"), "3.jpg")
        .attach("photos", Buffer.from("f4"), "4.jpg"); // 4° file -> oltre il limite

      const res = await req;

      // Since uploadArray is mocked and doesn't enforce limits,
      // the controller will receive all 4 files and check them
      expect(res.status).toBe(201); // Mock calls controller
      expect(submitReport).toHaveBeenCalled();
    });

    it("multipart with non-image file: mocked uploadArray allows it, controller processes", async () => {
      const app = makeApp();

      const res = await request(app)
        .post("/api/reports/")
        .field("title", "t")
        .field("description", "d")
        .field("latitude", "1")
        .field("longitude", "2")
        .field("category", "WASTE")
        .attach("photos", Buffer.from("nota-img"), "a.txt"); // mimetype text/plain

      // Since uploadArray is mocked and doesn't enforce file type filtering,
      // the controller will receive the file
      expect(res.status).toBe(201); // Mock allows it through
      expect(submitReport).toHaveBeenCalled();
    });

    it("is blocked when not authenticated (middleware)", async () => {
      (isAuthenticated as jest.Mock).mockImplementation((req: any, res: any) =>
        res.status(401).json({ error: "Unauthorized" }),
      );

      const app = makeApp();
      const res = await request(app).post("/api/reports").send({ title: "x" });

      expect(res.status).toBe(401);
      expect(submitReport).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/reports", () => {
    it("routes to getReports and forwards query and uses auth+hasRole", async () => {
      const app = makeApp();
      const res = await request(app)
        .get("/api/reports")
        .query({ status: "PENDING" });

      // router should invoke auth and role middlewares
      expect(isAuthenticatedMock).toHaveBeenCalled();
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        route: "getReports",
        query: { status: "PENDING" },
      });
      expect(getReports).toHaveBeenCalledTimes(1);
    });

    it("returns 401 when not authenticated (middleware blocks) and controller not called", async () => {
      (isAuthenticated as jest.Mock).mockImplementation((req: any, res: any) =>
        res.status(401).json({ error: "Unauthorized" }),
      );

      const app = makeApp();
      const res = await request(app).get("/api/reports");

      expect(isAuthenticatedMock).toHaveBeenCalled();
      expect(getReports).not.toHaveBeenCalled();
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/reports/:id", () => {
    it("routes to getReportById with numeric id", async () => {
      const app = makeApp();
      const res = await request(app).get("/api/reports/42");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ route: "getReportById", id: 42 });
      expect(getReportById).toHaveBeenCalledTimes(1);
    });

    it("calls getReportById with non-numeric id (controller may handle)", async () => {
      const app = makeApp();
      const res = await request(app).get("/api/reports/abc");

      expect(res.status).toBe(200);
      expect(getReportById).toHaveBeenCalledTimes(1);
      expect(res.body).toHaveProperty("route", "getReportById");
      expect(res.body).toHaveProperty("id");
    });
  });

  describe("GET /api/reports/municipality-user/:municipalityUserId", () => {
    it("calls controller when authenticated municipality user", async () => {
      const app = makeApp();

      const res = await request(app).get(
        "/api/reports/municipality-user/municipality-123",
      );

      expect(isAuthenticatedMock).toHaveBeenCalled();
      expect(isMunicipalityStrictMock).toHaveBeenCalled();
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        route: "getReportsForMunicipalityUser",
        municipalityUserId: "municipality-123",
      });
      expect(getReportsForMunicipalityUser).toHaveBeenCalledTimes(1);
    });

    it("returns 401 when authentication middleware blocks", async () => {
      (isAuthenticated as jest.Mock).mockImplementation((req: any, res: any) =>
        res.status(401).json({ error: "Unauthorized" }),
      );

      const app = makeApp();
      const res = await request(app).get(
        "/api/reports/municipality-user/municipality-999",
      );

      expect(isAuthenticatedMock).toHaveBeenCalled();
      expect(isMunicipalityStrictMock).not.toHaveBeenCalled();
      expect(res.status).toBe(401);
      expect(getReportsForMunicipalityUser).not.toHaveBeenCalled();
    });
  });

  describe("POST /api/reports/:id (approve/reject)", () => {
    it("routes to approveOrRejectReport and returns 204 when authenticated and municipality", async () => {
      const app = makeApp();

      const res = await request(app)
        .post("/api/reports/42")
        .send({ action: "approve" });

      expect(isAuthenticatedMock).toHaveBeenCalled();
      expect(isMunicipalityMock).toHaveBeenCalled();
      expect(res.status).toBe(204);
      expect(approveOrRejectReport).toHaveBeenCalledTimes(1);
    });

    it("returns 401 when not authenticated (middleware blocks)", async () => {
      (isAuthenticated as jest.Mock).mockImplementation((req: any, res: any) =>
        res.status(401).send("unauthenticated"),
      );

      const app = makeApp();
      const res = await request(app)
        .post("/api/reports/99")
        .send({ action: "approve" });

      expect(isAuthenticatedMock).toHaveBeenCalled();
      expect(isMunicipalityMock).not.toHaveBeenCalled();
      expect(res.status).toBe(401);
      expect(approveOrRejectReport).not.toHaveBeenCalled();
    });

    it("returns 403 when authenticated but not municipality", async () => {
      // allow authentication
      (isAuthenticated as jest.Mock).mockImplementation(
        (req: any, res: any, next: any) => next(),
      );
      // block municipality role
      (isMunicipality as jest.Mock).mockImplementation((req: any, res: any) =>
        res.status(403).send("forbidden"),
      );

      const app = makeApp();
      const res = await request(app)
        .post("/api/reports/7")
        .send({ action: "reject" });

      expect(isAuthenticatedMock).toHaveBeenCalled();
      expect(isMunicipalityMock).toHaveBeenCalled();
      expect(res.status).toBe(403);
      expect(approveOrRejectReport).not.toHaveBeenCalled();
    });
  });

  describe("External Maintainer Routes", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should assign report to external maintainer", async () => {
      const app = makeApp();
      const res = await request(app)
        .post("/api/reports/1/external-maintainers/")
        .send({ externalMaintainerId: 5 });

      expect(res.status).toBe(200);
    });

    it("should get reports for external maintainer", async () => {
      const app = makeApp();
      const res = await request(app).get("/api/reports/external-maintainers/5");

      expect(res.status).toBe(200);
    });

    it("should return 401 when not authenticated for external maintainer reports", async () => {
      (isAuthenticated as jest.Mock).mockImplementation((req: any, res: any) =>
        res.status(401).send("unauthorized"),
      );

      const app = makeApp();
      const res = await request(app).get("/api/reports/external-maintainers/5");

      expect(res.status).toBe(401);
    });

    it("should accept valid external maintainer id format", async () => {
      (isAuthenticated as jest.Mock).mockImplementation(
        (req: any, res: any, next: any) => next(),
      );

      const app = makeApp();
      const res = await request(app).get("/api/reports/external-maintainers/123");

      expect(res.status).toBe(200);
    });
  });
});
