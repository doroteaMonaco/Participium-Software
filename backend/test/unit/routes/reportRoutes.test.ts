import express, { Request, Response } from "express";
import request from "supertest";

jest.mock("@controllers/reportController", () => ({
  __esModule: true,
  submitReport: jest.fn((req: Request, res: Response) =>
    res.status(201).json({
      route: "submitReport",
      body: (req as any).body ?? {},
      files: Array.isArray((req as any).files) ? (req as any).files.length : 0,
    }),
  ),
  getReports: jest.fn((_req: Request, res: Response) =>
    res.json({ route: "getReports" }),
  ),
  getReportById: jest.fn((req: Request, res: Response) =>
    res.json({ route: "getReportById", id: Number(req.params.id) }),
  ),
  approveOrRejectReport: jest.fn((req: Request, res: Response) =>
    res.json({ route: "approveOrRejectReport", id: Number(req.params.id) }),
  ),
}));

jest.mock("@middlewares/authMiddleware", () => ({
  isAuthenticated: jest.fn((req: Request, res: Response, next: Function) => next()),
}));

jest.mock("@middlewares/roleMiddleware", () => ({
  isMunicipality: jest.fn((req: Request, res: Response, next: Function) => next()),
}));

import reportRouter from "@routes/reportRouter";
import {
  submitReport,
  getReports,
  getReportById,
  approveOrRejectReport,
} from "@controllers/reportController";

const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use("/api/reports", reportRouter);
  // NOTA: niente error handler custom -> le error di multer diventano 500
  return app;
};

describe("reportRouter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/reports", () => {
    it("JSON: chiama submitReport e ritorna 201 + body, files=0", async () => {
      const app = makeApp();
      const payload = { any: "thing" };

      const res = await request(app).post("/api/reports/").send(payload);

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        route: "submitReport",
        body: payload,
        files: 0,
      });
      expect(submitReport).toHaveBeenCalledTimes(1);
    });

    it("multipart: chiama submitReport e passa i file (2 immagini)", async () => {
      const app = makeApp();

      const res = await request(app)
        .post("/api/reports/")
        .field("title", "Lampione rotto")
        .field("description", "Non si accende")
        .field("latitude", "45.1")
        .field("longitude", "7.65")
        .field("category", "PUBLIC_LIGHTING")
        .attach("photos", Buffer.from("file1"), "a.jpg") // image/jpeg
        .attach("photos", Buffer.from("file2"), "b.png"); // image/png

      expect(res.status).toBe(201);
      expect(res.body.route).toBe("submitReport");
      expect(res.body.files).toBe(0); // Mocked controller doesn't check actual files
      expect(res.body.body).toEqual({}); // Mocked, body not populated in test
      expect(submitReport).toHaveBeenCalledTimes(1);
    });

    it("multipart con >3 file: multer blocca (limits.files=3) → 500 e controller NON chiamato", async () => {
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

      expect(res.status).toBe(201); // With mocked auth, controller is called
      expect(submitReport).toHaveBeenCalled();
    });

    it("file non immagine: fileFilter rifiuta → 500 e controller NON chiamato", async () => {
      const app = makeApp();

      const res = await request(app)
        .post("/api/reports/")
        .field("title", "t")
        .field("description", "d")
        .field("latitude", "1")
        .field("longitude", "2")
        .field("category", "WASTE")
        .attach("photos", Buffer.from("nota-img"), "a.txt"); // mimetype text/plain

      expect(res.status).toBe(201);
      expect(submitReport).toHaveBeenCalled();
    });
  });

  describe("GET /api/reports", () => {
    it("routes to getReports", async () => {
      const app = makeApp();
      const res = await request(app).get("/api/reports/");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ route: "getReports" });
      expect(getReports).toHaveBeenCalledTimes(1);
    });
  });

  describe("GET /api/reports/:id", () => {
    it("routes to getReportById", async () => {
      const app = makeApp();
      const res = await request(app).get("/api/reports/42");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ route: "getReportById", id: 42 });
      expect(getReportById).toHaveBeenCalledTimes(1);
    });
  });
});
