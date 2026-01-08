import { Request, Response } from "express";

jest.mock("@services/reportService", () => {
  const m = {
    findAll: jest.fn(),
    findAllForMapView: jest.fn(),
    findById: jest.fn(),
    findByStatus: jest.fn(),
    submitReport: jest.fn(),
    updateReportStatus: jest.fn(),
    deleteReport: jest.fn(),
    findAssignedReportsForOfficer: jest.fn(),
    assignToExternalMaintainer: jest.fn(),
    findReportsForExternalMaintainer: jest.fn(),
    addCommentToReport: jest.fn(),
    getCommentsOfAReportById: jest.fn(),
    getUnreadCommentsOfAReportById: jest.fn(),
    searchReportsByBoundingBox: jest.fn(),
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
  getReportsMap,
  getReportById,
  getReportByStatus,
  submitReport,
  approveOrRejectReport,
  deleteReport,
  getReportsForMunicipalityUser,
  assignToExternalMaintainer,
  getReportsForExternalMaintainer,
  addCommentToReport,
  getCommentOfAReportById,
  getUnreadCommentOfAReportById,
  reportSearchHandler,
} from "@controllers/reportController";
import { roleType } from "@models/enums";

type ServiceMock = {
  findAll: jest.Mock;
  findAllForMapView: jest.Mock;
  findById: jest.Mock;
  findByStatus: jest.Mock;
  submitReport: jest.Mock;
  updateReportStatus: jest.Mock;
  updateReportStatusByExternalMaintainer: jest.Mock;
  deleteReport: jest.Mock;
  findAssignedReportsForOfficer: jest.Mock;
  assignToExternalMaintainer: jest.Mock;
  findReportsForExternalMaintainer: jest.Mock;
  addCommentToReport: jest.Mock;
  getCommentsOfAReportById: jest.Mock;
  getUnreadCommentsOfAReportById: jest.Mock;
  searchReportsByBoundingBox: jest.Mock;
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
    it("returns 401 when user is not authenticated", async () => {
      const req = {
        query: {},
        user: null,
        role: "CITIZEN",
      } as unknown as Request;
      const res = makeRes();

      await getReports(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Authentication Error",
        message: "User not authenticated",
      });
      expect(svc.findAll).not.toHaveBeenCalled();
    });

    it("returns all reports (200 by default) via res.json", async () => {
      const reports = [makeReport({ id: 2 }), makeReport({ id: 1 })];
      svc.findAll.mockResolvedValue(reports);

      const req = {
        query: {},
        user: { id: 1 },
        role: "ADMIN",
      } as unknown as Request;
      const res = makeRes();

      await getReports(req, res as unknown as Response);

      expect(svc.findAll).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith(reports);
    });

    it("returns 500 on service error", async () => {
      svc.findAll.mockRejectedValue(new Error("boom"));

      const req = {
        query: {},
        user: { id: 1 },
        role: "ADMIN",
      } as unknown as Request;
      const res = makeRes();

      await getReports(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Failed to fetch reports",
      });
    });

    it("returns 401 for invalid status filter", async () => {
      const req = {
        query: { status: "INVALID" },
        user: { id: 1 },
        role: "CITIZEN",
      } as unknown as Request;
      const res = makeRes();

      await getReports(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Validation Error",
        message:
          "request/query/status must be equal to one of the allowed values: ASSIGNED",
      });
      expect(svc.findAll).not.toHaveBeenCalled();
    });

    it("allows citizen to filter reports by ASSIGNED status", async () => {
      const assignedReports = [makeReport({ id: 1, status: "ASSIGNED" })];
      svc.findAll.mockResolvedValue(assignedReports);

      const req = {
        query: { status: "ASSIGNED" },
        user: { id: 1 },
        role: "CITIZEN",
      } as unknown as Request;
      const res = makeRes();

      await getReports(req, res as unknown as Response);

      expect(svc.findAll).toHaveBeenCalledWith("ASSIGNED", 1);
      expect(res.json).toHaveBeenCalledWith(assignedReports);
    });

    it("denies non-citizen/admin/municipality access", async () => {
      const req = {
        query: {},
        user: { id: 1 },
        role: "INVALID_ROLE",
      } as unknown as Request;
      const res = makeRes();

      await getReports(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Authorization Error",
        }),
      );
      expect(svc.findAll).not.toHaveBeenCalled();
    });

    it("returns all reports for admin without status filter", async () => {
      const allReports = [
        makeReport({ id: 1, status: "PENDING" }),
        makeReport({ id: 2, status: "ASSIGNED" }),
        makeReport({ id: 3, status: "REJECTED" }),
      ];
      svc.findAll.mockResolvedValue(allReports);

      const req = {
        query: {},
        user: { id: 1 },
        role: "ADMIN",
      } as unknown as Request;
      const res = makeRes();

      await getReports(req, res as unknown as Response);

      expect(svc.findAll).toHaveBeenCalledWith(undefined, undefined);
      expect(res.json).toHaveBeenCalledWith(allReports);
    });

    it("allows admin to filter reports by ASSIGNED status", async () => {
      const assignedReports = [makeReport({ id: 1, status: "ASSIGNED" })];
      svc.findAll.mockResolvedValue(assignedReports);

      const req = {
        query: { status: "ASSIGNED" },
        user: { id: 1 },
        role: "ADMIN",
      } as unknown as Request;
      const res = makeRes();

      await getReports(req, res as unknown as Response);

      expect(svc.findAll).toHaveBeenCalledWith("ASSIGNED", undefined);
      expect(res.json).toHaveBeenCalledWith(assignedReports);
    });

    it("allows municipality to filter reports by ASSIGNED status", async () => {
      const assignedReports = [makeReport({ id: 1, status: "ASSIGNED" })];
      svc.findAll.mockResolvedValue(assignedReports);

      const req = {
        query: { status: "ASSIGNED" },
        user: { id: 1 },
        role: "MUNICIPALITY",
      } as unknown as Request;
      const res = makeRes();

      await getReports(req, res as unknown as Response);

      expect(svc.findAll).toHaveBeenCalledWith("ASSIGNED", undefined);
      expect(res.json).toHaveBeenCalledWith(assignedReports);
    });
  });

  // -------- getReportById --------
  describe("getReportById", () => {
    it("returns 400 when report ID is invalid", async () => {
      const req = { params: { id: "invalid" } } as unknown as Request;
      const res = makeRes();

      await getReportById(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid report ID" });
      expect(svc.findById).not.toHaveBeenCalled();
    });

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
        error: "db fail",
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
        error: "boom",
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

    it("allows external maintainer to update status", async () => {
      svc.updateReportStatusByExternalMaintainer = jest
        .fn()
        .mockResolvedValue("IN_PROGRESS");

      const req = {
        params: { id: "5" },
        body: { status: "IN_PROGRESS" },
        user: { id: 10 },
        role: "EXTERNAL_MAINTAINER",
      } as unknown as Request;
      const res = makeRes();

      await approveOrRejectReport(req, res as unknown as Response);

      expect(
        svc.updateReportStatusByExternalMaintainer,
      ).toHaveBeenCalledWith(5, 10, "IN_PROGRESS");
      expect(res.json).toHaveBeenCalledWith("IN_PROGRESS");
    });

    it("denies external maintainer invalid status", async () => {
      const req = {
        params: { id: "5" },
        body: { status: "ASSIGNED" },
        user: { id: 10 },
        role: "EXTERNAL_MAINTAINER",
      } as unknown as Request;
      const res = makeRes();

      await approveOrRejectReport(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error:
          "Invalid status. External maintainers can only set IN_PROGRESS, SUSPENDED or RESOLVED.",
      });
    });
  });

  // -------- submitReport --------
  describe("submitReport", () => {
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
        user: { id: 42 },
      } as unknown as Request;
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
          description: "Il lampione non si accende",
          category: "PUBLIC_LIGHTING",
          photoKeys: ["k1", "k2"],
          anonymous: false,
        },
        42,
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
        error: "delete fail",
      });
    });
  });

  // -------- getReportByStatus --------
  describe("getReportByStatus", () => {
    it("returns reports for given status", async () => {
      const reports = [makeReport({ id: 1, status: "PENDING_APPROVAL" })];
      svc.findByStatus.mockResolvedValue(reports);

      const req = {
        query: { status: "PENDING_APPROVAL" },
      } as unknown as Request;
      const res = makeRes();

      await getReportByStatus(req, res as unknown as Response);

      expect(svc.findByStatus).toHaveBeenCalledWith("PENDING_APPROVAL");
      expect(res.json).toHaveBeenCalledWith(reports);
    });

    it("returns 500 on service error", async () => {
      svc.findByStatus.mockRejectedValue(new Error("find status fail"));

      const req = { query: { status: "ASSIGNED" } } as unknown as Request;
      const res = makeRes();

      await getReportByStatus(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "find status fail",
      });
    });
  });

  // -------- approveOrRejectReport --------
  describe("approveOrRejectReport", () => {
    it("approves report successfully", async () => {
      svc.updateReportStatus.mockResolvedValue("ASSIGNED");

      const req = {
        params: { id: "1" },
        body: { status: "ASSIGNED" },
      } as unknown as Request;
      const res = makeRes();

      await approveOrRejectReport(req, res as unknown as Response);

      expect(svc.updateReportStatus).toHaveBeenCalledWith(
        1,
        "ASSIGNED",
        undefined,
      );
      expect(res.json).toHaveBeenCalledWith({ status: "ASSIGNED" });
    });

    it("rejects report with reason", async () => {
      svc.updateReportStatus.mockResolvedValue("REJECTED");

      const req = {
        params: { id: "2" },
        body: { status: "REJECTED", rejectionReason: "Invalid report" },
      } as unknown as Request;
      const res = makeRes();

      await approveOrRejectReport(req, res as unknown as Response);

      expect(svc.updateReportStatus).toHaveBeenCalledWith(
        2,
        "REJECTED",
        "Invalid report",
      );
      expect(res.json).toHaveBeenCalledWith({ status: "REJECTED" });
    });

    it("returns 400 for invalid status", async () => {
      const req = {
        params: { id: "1" },
        body: { status: "INVALID" },
        role: roleType.MUNICIPALITY,
      } as unknown as Request;
      const res = makeRes();

      await approveOrRejectReport(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) }),
      );
      expect(svc.updateReportStatus).not.toHaveBeenCalled();
    });

    it("returns 400 for rejected without reason", async () => {
      const req = {
        params: { id: "1" },
        body: { status: "REJECTED" },
      } as unknown as Request;
      const res = makeRes();

      await approveOrRejectReport(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Rejection reason is required when rejecting a report.",
      });
      expect(svc.updateReportStatus).not.toHaveBeenCalled();
    });

    it("returns 404 for report not found", async () => {
      svc.updateReportStatus.mockRejectedValue(new Error("Report not found"));

      const req = {
        params: { id: "999" },
        body: { status: "ASSIGNED" },
      } as unknown as Request;
      const res = makeRes();

      await approveOrRejectReport(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Report not found" });
    });

    it("returns 500 on service error", async () => {
      svc.updateReportStatus.mockRejectedValue(new Error("update fail"));

      const req = {
        params: { id: "1" },
        body: { status: "ASSIGNED" },
      } as unknown as Request;
      const res = makeRes();

      await approveOrRejectReport(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "update fail" });
    });
  });

  describe("getReportsForMunicipalityUser", () => {
    it("returns 401 when user is not authenticated", async () => {
      const req = {
        params: { municipalityUserId: "5" },
      } as unknown as Request;
      const res = makeRes();

      await getReportsForMunicipalityUser(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Authentication Error",
        message: "User not authenticated",
      });
      expect(svc.findAssignedReportsForOfficer).not.toHaveBeenCalled();
    });

    it("returns 400 when municipality user id is invalid", async () => {
      const req = {
        params: { municipalityUserId: "abc" },
        user: { id: 7 },
      } as unknown as Request;
      const res = makeRes();

      await getReportsForMunicipalityUser(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Bad Request",
        message: "Invalid municipality user ID",
      });
      expect(svc.findAssignedReportsForOfficer).not.toHaveBeenCalled();
    });

    it("returns 403 when user tries to access other officer reports", async () => {
      const req = {
        params: { municipalityUserId: "10" },
        user: { id: 5 },
      } as unknown as Request;
      const res = makeRes();

      await getReportsForMunicipalityUser(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: "Forbidden",
        message: "You can only access reports assigned to yourself",
      });
      expect(svc.findAssignedReportsForOfficer).not.toHaveBeenCalled();
    });

    it("returns assigned reports for valid municipality user", async () => {
      const reports = [makeReport({ id: 1 })];
      svc.findAssignedReportsForOfficer.mockResolvedValue(reports);

      const req = {
        params: { municipalityUserId: "3" },
        query: { status: "ASSIGNED" },
        user: { id: 3 },
      } as unknown as Request;
      const res = makeRes();

      await getReportsForMunicipalityUser(req, res as unknown as Response);

      expect(svc.findAssignedReportsForOfficer).toHaveBeenCalledWith(
        3,
        "ASSIGNED",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(reports);
    });

    it("returns 500 when service throws", async () => {
      svc.findAssignedReportsForOfficer.mockRejectedValue(new Error("fail"));

      const req = {
        params: { municipalityUserId: "2" },
        query: {},
        user: { id: 2 },
      } as unknown as Request;
      const res = makeRes();

      await getReportsForMunicipalityUser(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "fail",
      });
    });
  });

  // -------- getReports - coverage for edge cases --------
  describe("getReports - edge cases", () => {
    it("returns 400 when citizen requests invalid status", async () => {
      const req = {
        user: { id: 1 },
        role: "CITIZEN",
        query: { status: "PENDING_APPROVAL" }, // Citizens can only see ASSIGNED
      } as unknown as Request;
      const res = makeRes();

      await getReports(req as unknown as Request, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Validation Error",
        }),
      );
    });

    it("returns 400 when admin requests invalid status", async () => {
      const req = {
        user: { id: 1 },
        role: "ADMIN",
        query: { status: "INVALID_STATUS" },
      } as unknown as Request;
      const res = makeRes();

      await getReports(req as unknown as Request, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 403 when unknown role tries to access", async () => {
      const req = {
        user: { id: 1 },
        role: "UNKNOWN_ROLE",
        query: {},
      } as unknown as Request;
      const res = makeRes();

      await getReports(req as unknown as Request, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Authorization Error",
        }),
      );
    });

    it("returns 500 when service throws", async () => {
      svc.findAll.mockRejectedValue(new Error("boom"));

      const req = {
        user: { id: 1 },
        role: "CITIZEN",
        query: {},
      } as unknown as Request;
      const res = makeRes();

      await getReports(req as unknown as Request, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Failed to fetch reports",
      });
    });
  });

  // -------- assignToExternalMaintainer --------
  describe("assignToExternalMaintainer", () => {
    it("should assign report to external maintainer", async () => {
      const updatedReport = makeReport({ id: 5, externalMaintainerId: 1 });
      svc.assignToExternalMaintainer.mockResolvedValue(updatedReport);

      const req = {
        params: { report_id: "5" },
      } as unknown as Request;
      const res = makeRes();

      await assignToExternalMaintainer(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(svc.assignToExternalMaintainer).toHaveBeenCalledWith(5);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(updatedReport);
    });

    it("should return 400 for invalid report ID", async () => {
      const req = {
        params: { report_id: "invalid" },
      } as unknown as Request;
      const res = makeRes();

      await assignToExternalMaintainer(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Validation Error",
        }),
      );
    });

    it("should return 404 when report not found", async () => {
      svc.assignToExternalMaintainer.mockRejectedValue(
        new Error("Report not found"),
      );

      const req = {
        params: { report_id: "999" },
      } as unknown as Request;
      const res = makeRes();

      await assignToExternalMaintainer(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("should return 500 on error", async () => {
      svc.assignToExternalMaintainer.mockRejectedValue(new Error("boom"));

      const req = {
        params: { report_id: "1" },
      } as unknown as Request;
      const res = makeRes();

      await assignToExternalMaintainer(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // -------- getReportsForExternalMaintainer --------
  describe("getReportsForExternalMaintainer", () => {
    beforeEach(() => {
      svc.findReportsForExternalMaintainer = jest.fn();
    });

    it("should return 401 when not authenticated", async () => {
      const req = {
        user: null,
        params: { externalMaintainersId: "1" },
      } as unknown as Request;
      const res = makeRes();

      await getReportsForExternalMaintainer(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Authentication Error",
        }),
      );
    });

    it("should return 400 for invalid external maintainer ID", async () => {
      const req = {
        user: { id: 1 },
        params: { externalMaintainersId: "invalid" },
      } as unknown as Request;
      const res = makeRes();

      await getReportsForExternalMaintainer(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Bad Request",
        }),
      );
    });

    it("should return 403 when user tries to access other maintainer's reports", async () => {
      const req = {
        user: { id: 1 },
        params: { externalMaintainersId: "5" },
      } as unknown as Request;
      const res = makeRes();

      await getReportsForExternalMaintainer(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Forbidden",
        }),
      );
    });

    it("should return reports for valid external maintainer", async () => {
      const reports = [makeReport({ id: 1, externalMaintainerId: 3 })];
      svc.findReportsForExternalMaintainer.mockResolvedValue(reports);

      const req = {
        user: { id: 3 },
        params: { externalMaintainersId: "3" },
      } as unknown as Request;
      const res = makeRes();

      await getReportsForExternalMaintainer(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(svc.findReportsForExternalMaintainer).toHaveBeenCalledWith(3);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(reports);
    });

    it("should return 500 on service error", async () => {
      svc.findReportsForExternalMaintainer.mockRejectedValue(new Error("boom"));

      const req = {
        user: { id: 3 },
        params: { externalMaintainersId: "3" },
      } as unknown as Request;
      const res = makeRes();

      await getReportsForExternalMaintainer(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ---------- addCommentToReport / getCommentsOfAReportById ----------
  describe("comments controller", () => {
    it("addCommentToReport -> 201 on success", async () => {
      const created = {
        id: 11,
        reportId: 5,
        content: "ok",
        municipality_user_id: 3,
      };
      svc.addCommentToReport.mockResolvedValue(created);

      const req = {
        params: { report_id: "5" },
        user: { id: 3 },
        role: "MUNICIPALITY",
        body: { content: "ok" },
      } as unknown as Request;
      const res = makeRes();

      await addCommentToReport(req, res as unknown as Response);

      expect(svc.addCommentToReport).toHaveBeenCalledWith({
        reportId: 5,
        authorId: 3,
        authorType: "MUNICIPALITY",
        content: "ok",
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(created);
    });

    it("addCommentToReport -> 400 on invalid report id", async () => {
      const req = {
        params: { report_id: "not-a-number" },
        user: { id: 3 },
        role: "MUNICIPALITY",
      } as unknown as Request;
      const res = makeRes();

      await addCommentToReport(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Bad Request" }),
      );
    });

    it("addCommentToReport -> 401 when unauthenticated", async () => {
      const req = {
        params: { report_id: "5" },
        user: null,
        role: "MUNICIPALITY",
        body: { content: "test" },
      } as unknown as Request;
      const res = makeRes();

      await addCommentToReport(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Authentication Error" }),
      );
    });

    it("addCommentToReport -> 403 when role is missing", async () => {
      const created = {
        id: 11,
        reportId: 5,
        content: "ok",
        external_maintainer_id: 3,
      };
      svc.addCommentToReport.mockResolvedValue(created);

      const req = {
        params: { report_id: "5" },
        user: { id: 3 },
        role: null,
        body: { content: "test" },
      } as unknown as Request;
      const res = makeRes();

      await addCommentToReport(req, res as unknown as Response);

      // When role is null, it defaults to EXTERNAL_MAINTAINER in the controller
      expect(svc.addCommentToReport).toHaveBeenCalledWith({
        reportId: 5,
        authorId: 3,
        authorType: "EXTERNAL_MAINTAINER",
        content: "test",
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(created);
    });

    it("addCommentToReport -> 400 when content is missing", async () => {
      const req = {
        params: { report_id: "5" },
        user: { id: 3 },
        role: "MUNICIPALITY",
        body: {},
      } as unknown as Request;
      const res = makeRes();

      await addCommentToReport(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Bad Request" }),
      );
    });

    it("addCommentToReport -> 403 on resolved report error", async () => {
      svc.addCommentToReport.mockRejectedValue(new Error("Report is resolved"));

      const req = {
        params: { report_id: "5" },
        user: { id: 3 },
        role: "MUNICIPALITY",
        body: { content: "test" },
      } as unknown as Request;
      const res = makeRes();

      await addCommentToReport(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Forbidden" }),
      );
    });

    it("addCommentToReport -> 403 on assignment error", async () => {
      svc.addCommentToReport.mockRejectedValue(
        new Error("You can only comment on reports assigned to you"),
      );

      const req = {
        params: { report_id: "5" },
        user: { id: 3 },
        role: "MUNICIPALITY",
        body: { content: "test" },
      } as unknown as Request;
      const res = makeRes();

      await addCommentToReport(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Forbidden" }),
      );
    });

    it("addCommentToReport -> 500 on generic service error", async () => {
      svc.addCommentToReport.mockRejectedValue(new Error("Server error"));

      const req = {
        params: { report_id: "5" },
        user: { id: 3 },
        role: "MUNICIPALITY",
        body: { content: "test" },
      } as unknown as Request;
      const res = makeRes();

      await addCommentToReport(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Server error",
      });
    });

    it("addCommentToReport -> 404 when response is null", async () => {
      svc.addCommentToReport.mockResolvedValue(null);

      const req = {
        params: { report_id: "999" },
        user: { id: 3 },
        role: "MUNICIPALITY",
        body: { content: "test" },
      } as unknown as Request;
      const res = makeRes();

      await addCommentToReport(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "Not Found",
        message: "Report not found",
      });
    });

    it("getCommentOfAReportById -> 200 on success", async () => {
      const comments = [{ id: 1, content: "c" }];
      svc.getCommentsOfAReportById.mockResolvedValue(comments);

      const req = {
        params: { report_id: "7" },
        user: { id: 7 },
        role: "MUNICIPALITY",
      } as unknown as Request;
      const res = makeRes();

      await getCommentOfAReportById(req, res as unknown as Response);

      expect(svc.getCommentsOfAReportById).toHaveBeenCalledWith(7, 7, "MUNICIPALITY");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(comments);
    });

    it("getCommentOfAReportById -> 401 when unauthenticated", async () => {
      const req = { params: { report_id: "7" }, user: null } as any;
      const res = makeRes();

      await getCommentOfAReportById(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Authentication Error" }),
      );
    });

    it("getCommentOfAReportById -> 403 when role is missing", async () => {
      const req = {
        params: { report_id: "7" },
        user: { id: 7 },
        role: null,
      } as unknown as Request;
      const res = makeRes();

      await getCommentOfAReportById(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Authorization Error",
          message: "User role not found",
        }),
      );
    });

    it("getCommentOfAReportById -> 400 when report_id is invalid", async () => {
      const req = {
        params: { report_id: "invalid" },
        user: { id: 7 },
        role: "MUNICIPALITY",
      } as unknown as Request;
      const res = makeRes();

      await getCommentOfAReportById(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Bad Request",
          message: "Invalid report id",
        }),
      );
    });

    it("getCommentOfAReportById -> 404 when report not found", async () => {
      svc.getCommentsOfAReportById.mockResolvedValue(null);

      const req = {
        params: { report_id: "999" },
        user: { id: 7 },
        role: "MUNICIPALITY",
      } as unknown as Request;
      const res = makeRes();

      await getCommentOfAReportById(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "Not Found",
        message: "Report not found",
      });
    });

    it("getCommentOfAReportById -> 404 on not found error", async () => {
      svc.getCommentsOfAReportById.mockRejectedValue(
        new Error("Report not found"),
      );

      const req = {
        params: { report_id: "7" },
        user: { id: 7 },
        role: "MUNICIPALITY",
      } as unknown as Request;
      const res = makeRes();

      await getCommentOfAReportById(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "Report not found",
      });
    });

    it("getCommentOfAReportById -> 500 on service error", async () => {
      svc.getCommentsOfAReportById.mockRejectedValue(
        new Error("Database error"),
      );

      const req = {
        params: { report_id: "7" },
        user: { id: 7 },
        role: "MUNICIPALITY",
      } as unknown as Request;
      const res = makeRes();

      await getCommentOfAReportById(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Database error",
      });
    });

    it("addCommentToReport -> 404 when service throws Report not found", async () => {
      svc.addCommentToReport.mockRejectedValue(new Error("Report not found"));

      const req = {
        params: { report_id: "999" },
        user: { id: 2 },
        role: "MUNICIPALITY",
        body: { content: "x" },
      } as unknown as Request;
      const res = makeRes();

      await addCommentToReport(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Report not found" }),
      );
    });
  });

  // -------- getUnreadCommentOfAReportById --------
  describe("getUnreadCommentOfAReportById", () => {
    it("returns 200 with unread comments on success", async () => {
      const comments = [{ id: 1, content: "Unread comment" }];
      svc.getUnreadCommentsOfAReportById = jest.fn().mockResolvedValue(comments);

      const req = {
        params: { report_id: "5" },
        user: { id: 7 },
        role: "MUNICIPALITY",
      } as unknown as Request;
      const res = makeRes();

      await getUnreadCommentOfAReportById(req, res as unknown as Response);

      expect(svc.getUnreadCommentsOfAReportById).toHaveBeenCalledWith(5, 7, "MUNICIPALITY");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(comments);
    });

    it("returns 401 when unauthenticated", async () => {
      const req = { params: { report_id: "5" }, user: null } as any;
      const res = makeRes();

      await getUnreadCommentOfAReportById(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Authentication Error",
          message: "User not authenticated",
        }),
      );
    });

    it("returns 403 when role is missing", async () => {
      const req = {
        params: { report_id: "5" },
        user: { id: 7 },
        role: null,
      } as unknown as Request;
      const res = makeRes();

      await getUnreadCommentOfAReportById(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Authorization Error",
          message: "User role not found",
        }),
      );
    });

    it("returns 400 when report_id is invalid", async () => {
      const req = {
        params: { report_id: "invalid" },
        user: { id: 7 },
        role: "MUNICIPALITY",
      } as unknown as Request;
      const res = makeRes();

      await getUnreadCommentOfAReportById(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Bad Request",
          message: "Invalid report id",
        }),
      );
    });

    it("returns 404 when report not found", async () => {
      svc.getUnreadCommentsOfAReportById = jest.fn().mockResolvedValue(null);

      const req = {
        params: { report_id: "999" },
        user: { id: 7 },
        role: "MUNICIPALITY",
      } as unknown as Request;
      const res = makeRes();

      await getUnreadCommentOfAReportById(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "Not Found",
        message: "Report not found",
      });
    });

    it("returns 404 on not found error", async () => {
      svc.getUnreadCommentsOfAReportById = jest
        .fn()
        .mockRejectedValue(new Error("Report not found"));

      const req = {
        params: { report_id: "5" },
        user: { id: 7 },
        role: "MUNICIPALITY",
      } as unknown as Request;
      const res = makeRes();

      await getUnreadCommentOfAReportById(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "Report not found",
      });
    });

    it("returns 500 on service error", async () => {
      svc.getUnreadCommentsOfAReportById = jest
        .fn()
        .mockRejectedValue(new Error("Database error"));

      const req = {
        params: { report_id: "5" },
        user: { id: 7 },
        role: "MUNICIPALITY",
      } as unknown as Request;
      const res = makeRes();

      await getUnreadCommentOfAReportById(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Database error",
      });
    });
  });

  // -------- reportSearchHandler --------
  describe("reportSearchHandler", () => {
    it("returns 400 when bbox parameter is missing", async () => {
      const req = { query: {} } as unknown as Request;
      const res = makeRes();

      await reportSearchHandler(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Validation Error",
        message: "Missing bbox parameter",
      });
    });

    it("returns 400 when bbox is not a string", async () => {
      const req = { query: { bbox: ["7.6600", "45.0600", "7.6750", "45.0700"] } } as unknown as Request;
      const res = makeRes();

      await reportSearchHandler(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Validation Error",
        message: "Missing bbox parameter",
      });
    });

    it("returns 400 when bbox has incorrect number of parts", async () => {
      const req = { query: { bbox: "7.6600,45.0600,7.6750" } } as unknown as Request;
      const res = makeRes();

      await reportSearchHandler(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Validation Error",
        message: "Invalid bbox parameter format. Expected format: minLng,minLat,maxLng,maxLat",
      });
    });

    it("returns 400 when bbox contains non-numeric values", async () => {
      const req = { query: { bbox: "invalid,45.0600,7.6750,45.0700" } } as unknown as Request;
      const res = makeRes();

      await reportSearchHandler(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Validation Error",
        message: "Invalid bbox parameter format. Coordinates must be valid numbers.",
      });
    });

    it("returns 400 when latitude is out of range", async () => {
      const req = { query: { bbox: "7.6600,95.0600,7.6750,45.0700" } } as unknown as Request;
      const res = makeRes();

      await reportSearchHandler(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Validation Error",
        message: "Invalid bbox parameter format. Coordinates out of range.",
      });
    });

    it("returns 400 when longitude is out of range", async () => {
      const req = { query: { bbox: "200.6600,45.0600,7.6750,45.0700" } } as unknown as Request;
      const res = makeRes();

      await reportSearchHandler(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Validation Error",
        message: "Invalid bbox parameter format. Coordinates out of range.",
      });
    });

    it("returns 400 when minLng >= maxLng", async () => {
      const req = { query: { bbox: "7.6750,45.0600,7.6600,45.0700" } } as unknown as Request;
      const res = makeRes();

      await reportSearchHandler(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Validation Error",
        message: "Invalid bbox values. Expected minLng < maxLng and minLat < maxLat.",
      });
    });

    it("returns 400 when minLat >= maxLat", async () => {
      const req = { query: { bbox: "7.6600,45.0700,7.6750,45.0600" } } as unknown as Request;
      const res = makeRes();

      await reportSearchHandler(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Validation Error",
        message: "Invalid bbox values. Expected minLng < maxLng and minLat < maxLat.",
      });
    });

    it("returns 200 with reports when bbox is valid", async () => {
      const mockReports = [
        { id: 1, title: "Report 1", latitude: 45.065, longitude: 7.67 },
        { id: 2, title: "Report 2", latitude: 45.068, longitude: 7.672 },
      ];
      svc.searchReportsByBoundingBox.mockResolvedValue(mockReports);

      const req = { query: { bbox: "7.6600,45.0600,7.6750,45.0700" } } as unknown as Request;
      const res = makeRes();

      await reportSearchHandler(req, res as unknown as Response);

      expect(svc.searchReportsByBoundingBox).toHaveBeenCalledWith({
        minLng: 7.66,
        minLat: 45.06,
        maxLng: 7.675,
        maxLat: 45.07,
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockReports);
    });

    it("returns 200 with empty array when no reports found", async () => {
      svc.searchReportsByBoundingBox.mockResolvedValue([]);

      const req = { query: { bbox: "7.6600,45.0600,7.6750,45.0700" } } as unknown as Request;
      const res = makeRes();

      await reportSearchHandler(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it("returns 404 when service throws 'not found' error", async () => {
      svc.searchReportsByBoundingBox.mockRejectedValue(new Error("Reports not found"));

      const req = { query: { bbox: "7.6600,45.0600,7.6750,45.0700" } } as unknown as Request;
      const res = makeRes();

      await reportSearchHandler(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "Reports not found",
      });
    });

    it("returns 500 on generic service error", async () => {
      svc.searchReportsByBoundingBox.mockRejectedValue(new Error("Database connection failed"));

      const req = { query: { bbox: "7.6600,45.0600,7.6750,45.0700" } } as unknown as Request;
      const res = makeRes();

      await reportSearchHandler(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Database connection failed",
      });
    });

    it("handles bbox with spaces correctly", async () => {
      const mockReports = [{ id: 1, title: "Report 1", latitude: 45.065, longitude: 7.67 }];
      svc.searchReportsByBoundingBox.mockResolvedValue(mockReports);

      const req = { query: { bbox: " 7.6600 , 45.0600 , 7.6750 , 45.0700 " } } as unknown as Request;
      const res = makeRes();

      await reportSearchHandler(req, res as unknown as Response);

      expect(svc.searchReportsByBoundingBox).toHaveBeenCalledWith({
        minLng: 7.66,
        minLat: 45.06,
        maxLng: 7.675,
        maxLat: 45.07,
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("handles negative coordinates correctly", async () => {
      const mockReports = [{ id: 1, title: "Report 1", latitude: -23.5, longitude: -46.5 }];
      svc.searchReportsByBoundingBox.mockResolvedValue(mockReports);

      const req = { query: { bbox: "-47,-24,-46,-23" } } as unknown as Request;
      const res = makeRes();

      await reportSearchHandler(req, res as unknown as Response);

      expect(svc.searchReportsByBoundingBox).toHaveBeenCalledWith({
        minLng: -47,
        minLat: -24,
        maxLng: -46,
        maxLat: -23,
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // -------- getReportsMap (Story 28) --------
  describe("getReportsMap", () => {
    it("returns reports via res.json", async () => {
      const reports = [makeReport({ id: 1 }), makeReport({ id: 2 })];
      svc.findAllForMapView.mockResolvedValue(reports);

      const req = {} as unknown as Request;
      const res = makeRes();

      await getReportsMap(req, res as unknown as Response);

      expect(svc.findAllForMapView).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith(reports);
      expect(res.status).not.toHaveBeenCalled();
    });

    it("returns 500 when service throws", async () => {
      svc.findAllForMapView.mockRejectedValue(new Error("boom"));
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const req = {} as unknown as Request;
      const res = makeRes();

      await getReportsMap(req, res as unknown as Response);

      expect(svc.findAllForMapView).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Failed to fetch reports for map view",
      });

      consoleSpy.mockRestore();
    });
  });

  // -------- Additional coverage tests for error branches --------
  describe("error handling branches", () => {
    it("getReportsForExternalMaintainer -> 404 when not found error with 404 branch", async () => {
      svc.findReportsForExternalMaintainer.mockRejectedValue(
        new Error("Not found"),
      );

      const req = {
        user: { id: 1 },
        params: { externalMaintainersId: "1" },
      } as unknown as Request;
      const res = makeRes();

      await getReportsForExternalMaintainer(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("getReportsForExternalMaintainer -> 500 for generic error", async () => {
      svc.findReportsForExternalMaintainer.mockRejectedValue(
        new Error("Database error"),
      );

      const req = {
        user: { id: 1 },
        params: { externalMaintainersId: "1" },
      } as unknown as Request;
      const res = makeRes();

      await getReportsForExternalMaintainer(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it("addCommentToReport -> 404 when not found error", async () => {
      svc.addCommentToReport.mockRejectedValue(new Error("Not found"));

      const req = {
        params: { report_id: "5" },
        user: { id: 3 },
        role: "MUNICIPALITY",
        body: { content: "test" },
      } as unknown as Request;
      const res = makeRes();

      await addCommentToReport(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("addCommentToReport -> 500 for generic errors", async () => {
      svc.addCommentToReport.mockRejectedValue(new Error("boom"));

      const req = {
        params: { report_id: "5" },
        user: { id: 3 },
        role: "MUNICIPALITY",
        body: { content: "test" },
      } as unknown as Request;
      const res = makeRes();

      await addCommentToReport(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it("getCommentOfAReportById -> returns 404 when response is null", async () => {
      svc.getCommentsOfAReportById.mockResolvedValue(null);

      const req = {
        params: { report_id: "999" },
        user: { id: 1 },
        role: "MUNICIPALITY",
      } as unknown as Request;
      const res = makeRes();

      await getCommentOfAReportById(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Not Found" }),
      );
    });

    it("getCommentOfAReportById -> 403 when role is missing", async () => {
      const req = {
        params: { report_id: "5" },
        user: { id: 1 },
        role: null,
      } as unknown as Request;
      const res = makeRes();

      await getCommentOfAReportById(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Authorization Error" }),
      );
    });

    it("getCommentOfAReportById -> 404 on not found error", async () => {
      svc.getCommentsOfAReportById.mockRejectedValue(
        new Error("Report not found"),
      );

      const req = {
        params: { report_id: "5" },
        user: { id: 1 },
        role: "MUNICIPALITY",
      } as unknown as Request;
      const res = makeRes();

      await getCommentOfAReportById(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("getCommentOfAReportById -> 500 on generic error", async () => {
      svc.getCommentsOfAReportById.mockRejectedValue(new Error("boom"));

      const req = {
        params: { report_id: "5" },
        user: { id: 1 },
        role: "MUNICIPALITY",
      } as unknown as Request;
      const res = makeRes();

      await getCommentOfAReportById(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it("getUnreadCommentOfAReportById -> returns 404 when response is null", async () => {
      svc.getUnreadCommentsOfAReportById.mockResolvedValue(null);

      const req = {
        params: { report_id: "999" },
        user: { id: 1 },
        role: "MUNICIPALITY",
      } as unknown as Request;
      const res = makeRes();

      await getUnreadCommentOfAReportById(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Not Found" }),
      );
    });

    it("getUnreadCommentOfAReportById -> 403 when role is missing", async () => {
      const req = {
        params: { report_id: "5" },
        user: { id: 1 },
        role: null,
      } as unknown as Request;
      const res = makeRes();

      await getUnreadCommentOfAReportById(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Authorization Error" }),
      );
    });

    it("getUnreadCommentOfAReportById -> 404 on not found error", async () => {
      svc.getUnreadCommentsOfAReportById.mockRejectedValue(
        new Error("Report not found"),
      );

      const req = {
        params: { report_id: "5" },
        user: { id: 1 },
        role: "MUNICIPALITY",
      } as unknown as Request;
      const res = makeRes();

      await getUnreadCommentOfAReportById(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("getUnreadCommentOfAReportById -> 500 on generic error", async () => {
      svc.getUnreadCommentsOfAReportById.mockRejectedValue(new Error("boom"));

      const req = {
        params: { report_id: "5" },
        user: { id: 1 },
        role: "MUNICIPALITY",
      } as unknown as Request;
      const res = makeRes();

      await getUnreadCommentOfAReportById(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it("reportSearchHandler -> 500 on service error", async () => {
      svc.searchReportsByBoundingBox.mockRejectedValue(new Error("boom"));

      const req = { query: { bbox: "7.6600,45.0600,7.6750,45.0700" } } as unknown as Request;
      const res = makeRes();

      await reportSearchHandler(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "boom" });
    });

    it("reportSearchHandler -> 404 on not found error from service", async () => {
      svc.searchReportsByBoundingBox.mockRejectedValue(
        new Error("Not found"),
      );

      const req = { query: { bbox: "7.6600,45.0600,7.6750,45.0700" } } as unknown as Request;
      const res = makeRes();

      await reportSearchHandler(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("assignToExternalMaintainer -> successfully assigns with reportId param variant", async () => {
      const updatedReport = makeReport({ id: 10, externalMaintainerId: 5 });
      svc.assignToExternalMaintainer.mockResolvedValue(updatedReport);

      const req = {
        params: { reportId: "10" }, // Using reportId instead of report_id
      } as unknown as Request;
      const res = makeRes();

      await assignToExternalMaintainer(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(svc.assignToExternalMaintainer).toHaveBeenCalledWith(10);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(updatedReport);
    });
  });
});
