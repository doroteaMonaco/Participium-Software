import { Request, Response } from "express";

jest.mock("../../../services/reportService", () => {
  const m = {
    findAll: jest.fn(),
    findById: jest.fn(),
    submitReport: jest.fn(),
    deleteReport: jest.fn(),
  };
  return { __esModule: true, default: m };
});

import reportService from "../../../services/reportService";
import {
  getReports,
  getReportById,
  submitReport,
  deleteReport,
} from "../../../controllers/reportController";

type ServiceMock = {
  findAll: jest.Mock;
  findById: jest.Mock;
  submitReport: jest.Mock;
  deleteReport: jest.Mock;
};
const svc = reportService as unknown as ServiceMock;

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

  // -------- submitReport --------
  describe("submitReport", () => {
    it("creates a report (draft) and returns 201 + json", async () => {
      const created = makeReport({ id: 10 });
      svc.submitReport.mockResolvedValue(created);

      const req = { body: {} } as unknown as Request; // controller ignores body and sends {}
      const res = makeRes();

      await submitReport(req, res as unknown as Response);

      expect(svc.submitReport).toHaveBeenCalledWith({});
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(created);
    });

    it("returns 500 on service error", async () => {
      svc.submitReport.mockRejectedValue(new Error("write fail"));

      const req = { body: {} } as unknown as Request;
      const res = makeRes();

      await submitReport(req, res as unknown as Response);

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
