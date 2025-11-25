import { Request, Response } from "express";

jest.mock("@services/reportService", () => {
  const m = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByStatus: jest.fn(),
    submitReport: jest.fn(),
    deleteReport: jest.fn(),
    updateReportStatus: jest.fn(),
  };
  return { __esModule: true, default: m };
});

jest.mock("@services/imageService", () => {
  const m = {
    storeTemporaryImages: jest.fn(),
  };
  return { __esModule: true, default: m };
});

import reportService from "@services/reportService";
import imageService from "@services/imageService";
import {
  getReports,
  getReportById,
  getReportByStatus,
  approveOrRejectReport,
  submitReport,
  deleteReport,
} from "@controllers/reportController";

type ServiceMock = {
  findAll: jest.Mock;
  findById: jest.Mock;
  findByStatus: jest.Mock;
  submitReport: jest.Mock;
  deleteReport: jest.Mock;
  updateReportStatus: jest.Mock;
};
type ImageMock = {
  storeTemporaryImages: jest.Mock;
};

const svc = reportService as unknown as ServiceMock;
const img = imageService as unknown as ImageMock;

type ResMock = Partial<Response> & {
  status: jest.Mock;
  json: jest.Mock;
  setHeader: jest.Mock;
  send: jest.Mock;
};

const makeRes = (): ResMock => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

const makeReport = (overrides: Partial<any> = {}) => ({
  id: 1,
  createdAt: new Date("2025-11-04T14:30:00Z"),
  latitude: "45.0",
  longitude: "7.0",
  title: "Valid title",
  description: "Valid description",
  category: "WASTE",
  ...overrides,
});

describe("reportController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------- getReports --------
  describe("getReports", () => {
    it("returns all reports (200 by default) via res.json", async () => {
      const reports = [makeReport({ id: 2 }), makeReport({ id: 1 })];
      svc.findAll.mockResolvedValue(reports);

      const req = {} as Request;
      const res = makeRes();

      await getReports(req, res as unknown as Response);

      expect(svc.findAll).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith(reports);
    });

    it("returns 500 on service error", async () => {
      svc.findAll.mockRejectedValue(new Error("boom"));

      const req = {} as Request;
      const res = makeRes();

      await getReports(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Failed to fetch reports",
      });
    });
  });

  // -------- getReportById --------
  describe("getReportById", () => {
    it("returns the report when found", async () => {
      const report = makeReport({ id: 42 });
      svc.findById.mockResolvedValue(report);

      const req = { params: { id: "42" } } as unknown as Request;
      const res = makeRes();

      await getReportById(req, res as unknown as Response);

      expect(svc.findById).toHaveBeenCalledWith(42);
      expect(res.json).toHaveBeenCalledWith(report);
    });

    it("returns 404 when report is not found", async () => {
      svc.findById.mockResolvedValue(null);

      const req = { params: { id: "999" } } as unknown as Request;
      const res = makeRes();

      await getReportById(req, res as unknown as Response);

      expect(svc.findById).toHaveBeenCalledWith(999);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Report not found" });
    });

    it("returns 500 on service error", async () => {
      svc.findById.mockRejectedValue(new Error("db fail"));

      const req = { params: { id: "1" } } as unknown as Request;
      const res = makeRes();

      await getReportById(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Failed to fetch report",
      });
    });
  });

  // -------- getReportByStatus --------
  describe("getReportByStatus", () => {
    it("returns reports filtered by status", async () => {
      const reports = [makeReport({ id: 11 })];
      svc.findByStatus.mockResolvedValue(reports);

      const req = { query: { status: "PENDING" } } as unknown as Request;
      const res = makeRes();

      await getReportByStatus(req, res as unknown as Response);

      expect(svc.findByStatus).toHaveBeenCalledWith("PENDING");
      expect(res.json).toHaveBeenCalledWith(reports);
    });

    it("returns 500 on service error", async () => {
      svc.findByStatus.mockRejectedValue(new Error("boom"));

      const req = { query: { status: "ANY" } } as unknown as Request;
      const res = makeRes();

      await getReportByStatus(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Failed to fetch report",
      });
    });
  });

  // -------- approveOrRejectReport --------
  describe("approveOrRejectReport", () => {
    it("accepts ASSIGNED and calls service", async () => {
      svc.updateReportStatus.mockResolvedValue("ASSIGNED");

      const req = {
        params: { id: "5" },
        body: { status: "ASSIGNED" },
      } as unknown as Request;
      const res = makeRes();

      await approveOrRejectReport(req, res as unknown as Response);

      expect(svc.updateReportStatus).toHaveBeenCalledWith(
        5,
        "ASSIGNED",
        undefined,
      );
      expect(res.json).toHaveBeenCalledWith({ status: "ASSIGNED" });
    });

    it("rejects with missing reason -> 400", async () => {
      const req = {
        params: { id: "6" },
        body: { status: "REJECTED" },
      } as unknown as Request;
      const res = makeRes();

      await approveOrRejectReport(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Rejection reason is required when rejecting a report.",
      });
    });

    it("returns 500 on service error", async () => {
      svc.updateReportStatus.mockRejectedValue(new Error("fail"));

      const req = {
        params: { id: "8" },
        body: { status: "ASSIGNED" },
      } as unknown as Request;
      const res = makeRes();

      await approveOrRejectReport(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "fail" });
    });
  });

  // -------- submitReport --------
  describe("submitReport", () => {
    it("draft path: body vuoto -> delega al service con {} e torna 201", async () => {
      const created = makeReport({ id: 10 });
      svc.submitReport.mockResolvedValue(created);

      const req = { body: {} } as unknown as Request;
      const res = makeRes();

      await submitReport(req, res as unknown as Response);

      expect(svc.submitReport).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("happy path completo: valida, salva temp images, chiama service con photoKeys e 201", async () => {
      const created = makeReport({ id: 123, photos: ["img1", "img2"] });
      img.storeTemporaryImages.mockResolvedValue(["k1", "k2"]);
      svc.submitReport.mockResolvedValue(created);

      const req = {
        body: {
          latitude: "45.1",
          longitude: "7.65",
          title: "Lampione rotto",
          description: "Il lampione non si accende",
          category: "PUBLIC_LIGHTING",
        },
        files: [
          {
            buffer: Buffer.from("file1"),
            mimetype: "image/jpeg",
            originalname: "a.jpg",
          },
          {
            buffer: Buffer.from("file2"),
            mimetype: "image/png",
            originalname: "b.png",
          },
        ],
        // controller reads req.user!.id — tests must provide user
        user: { id: 1 },
      } as any as Request;
      const res = makeRes();

      await submitReport(req, res as unknown as Response);

      expect(img.storeTemporaryImages).toHaveBeenCalledWith([
        {
          buffer: expect.any(Buffer),
          mimetype: "image/jpeg",
          originalname: "a.jpg",
        },
        {
          buffer: expect.any(Buffer),
          mimetype: "image/png",
          originalname: "b.png",
        },
      ]);

      expect(svc.submitReport).toHaveBeenCalledWith(
        {
          latitude: 45.1,
          longitude: 7.65,
          title: "Lampione rotto",
          anonymous: false,
          description: "Il lampione non si accende",
          category: "PUBLIC_LIGHTING",
          photoKeys: ["k1", "k2"],
        },
        1,
      );

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(created);
    });

    it("validation: mancano lat/long -> 400", async () => {
      const req = {
        body: { title: "t", description: "d", category: "WASTE" },
        files: [],
      } as any;
      const res = makeRes();

      await submitReport(req as Request, res as unknown as Response);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Latitude and longitude are required",
      });
    });

    it("validation: title vuoto -> 400", async () => {
      const req = {
        body: {
          latitude: 1,
          longitude: 2,
          title: "   ",
          description: "d",
          category: "WASTE",
        },
        files: [{}],
      } as any;
      const res = makeRes();

      await submitReport(req as Request, res as unknown as Response);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Title is required" });
    });

    it("validation: description vuota -> 400", async () => {
      const req = {
        body: {
          latitude: 1,
          longitude: 2,
          title: "t",
          description: "",
          category: "WASTE",
        },
        files: [{}],
      } as any;
      const res = makeRes();

      await submitReport(req as Request, res as unknown as Response);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Description is required",
      });
    });

    it("validation: category mancante -> 400", async () => {
      const req = {
        body: { latitude: 1, longitude: 2, title: "t", description: "d" },
        files: [{}],
      } as any;
      const res = makeRes();

      await submitReport(req as Request, res as unknown as Response);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Category is required" });
    });

    it("validation: category invalida -> 400", async () => {
      const req = {
        body: {
          latitude: 1,
          longitude: 2,
          title: "t",
          description: "d",
          category: "NOT_A_CAT",
        },
        files: [{}],
      } as any;
      const res = makeRes();

      await submitReport(req as Request, res as unknown as Response);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Invalid category" }),
      );
    });

    it("validation: nessuna foto -> 400", async () => {
      const req = {
        body: {
          latitude: 1,
          longitude: 2,
          title: "t",
          description: "d",
          category: "WASTE",
        },
        files: [],
      } as any;
      const res = makeRes();

      await submitReport(req as Request, res as unknown as Response);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "At least 1 photo is required",
      });
    });

    it("validation: più di 3 foto -> 400", async () => {
      const req = {
        body: {
          latitude: 1,
          longitude: 2,
          title: "t",
          description: "d",
          category: "WASTE",
        },
        files: [{}, {}, {}, {}],
      } as any;
      const res = makeRes();

      await submitReport(req as Request, res as unknown as Response);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Maximum 3 photos are allowed",
      });
    });

    it("returns 500 on service error", async () => {
      img.storeTemporaryImages.mockResolvedValue(["k1"]);
      svc.submitReport.mockRejectedValue(new Error("write fail"));

      const req = {
        body: {
          latitude: 1,
          longitude: 2,
          title: "t",
          description: "d",
          category: "WASTE",
        },
        files: [
          {
            buffer: Buffer.from("x"),
            mimetype: "image/jpeg",
            originalname: "a.jpg",
          },
        ],
        user: { id: 2 },
      } as any;
      const res = makeRes();

      await submitReport(req as Request, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Failed to submit report",
      });
    });
  });

  // -------- deleteReport --------
  describe("deleteReport", () => {
    it("deletes by id and returns the deleted report", async () => {
      const deleted = makeReport({ id: 7 });
      svc.deleteReport.mockResolvedValue(deleted);

      const req = { params: { id: "7" } } as unknown as Request;
      const res = makeRes();

      await deleteReport(req, res as unknown as Response);

      expect(svc.deleteReport).toHaveBeenCalledWith(7);
      expect(res.json).toHaveBeenCalledWith(deleted);
    });

    it("returns 500 on service error", async () => {
      svc.deleteReport.mockRejectedValue(new Error("delete fail"));

      const req = { params: { id: "3" } } as unknown as Request;
      const res = makeRes();

      await deleteReport(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Failed to delete report",
      });
    });
  });
});
