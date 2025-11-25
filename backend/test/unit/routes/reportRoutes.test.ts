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
}));

jest.mock("@middlewares/authMiddleware", () => ({
  isAuthenticated: jest.fn((req: any, res: any, next: any) => next()),
}));
jest.mock("@middlewares/roleMiddleware", () => ({
  isMunicipality: jest.fn((req: any, res: any, next: any) => next()),
  hasRole: jest.fn(() => (req: any, res: any, next: any) => next()),
}));

import reportRouter from "@routes/reportRouter";
import {
  submitReport,
  getReports,
  getReportById,
  approveOrRejectReport,
} from "@controllers/reportController";

import { isAuthenticated } from "@middlewares/authMiddleware";
import { hasRole, isMunicipality } from "@middlewares/roleMiddleware";

const isAuthenticatedMock = isAuthenticated as jest.Mock;
const isMunicipalityMock = isMunicipality as jest.Mock;
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
  // mount multer.array('photos', 3) on the route, same as app.ts
  app.use("/api/reports", upload.array("photos", 3), reportRouter);

  // error handler: map multer LIMIT_* -> 400, fileFilter/other -> 500
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (!err) return;
    if (
      err.code &&
      typeof err.code === "string" &&
      err.code.startsWith("LIMIT_")
    ) {
      return res
        .status(400)
        .json({ error: "Bad Request", message: err.message });
    }
    return res
      .status(500)
      .json({ error: "Server Error", message: err.message || "Upload error" });
  });

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
    (isMunicipality as jest.Mock).mockImplementation(
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
      expect(res.body.files).toBe(2);
      expect(submitReport).toHaveBeenCalledTimes(1);
    });

    it("multipart with >3 files: multer blocks (limits.files=3) and controller not called", async () => {
      const app = makeApp();
      const data = makeReport({
        photos: [
          { buf: Buffer.from("f1"), filename: "1.jpg" },
          { buf: Buffer.from("f2"), filename: "2.jpg" },
          { buf: Buffer.from("f3"), filename: "3.jpg" },
          { buf: Buffer.from("f4"), filename: "4.jpg" },
        ],
      });

      const res = await applyMultipart(request(app).post("/api/reports"), data);
      expect(res.status).toBe(400);
      expect(submitReport).not.toHaveBeenCalled();
    });

    it("multipart with non-image file: fileFilter rejects and controller not called", async () => {
      const app = makeApp();
      const data = makeReport({
        photos: [{ buf: Buffer.from("nota-img"), filename: "a.txt" }],
      });

      const res = await applyMultipart(request(app).post("/api/reports"), data);
      expect(res.status).toBe(500);
      expect(submitReport).not.toHaveBeenCalled();
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
});
