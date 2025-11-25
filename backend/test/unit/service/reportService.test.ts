jest.mock("@repositories/reportRepository", () => {
  const mRepo = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByStatus: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deleteById: jest.fn(),
  };
  return { __esModule: true, default: mRepo };
});

jest.mock("@services/imageService", () => {
  const mImage = {
    persistImagesForReport: jest.fn(),
    getMultipleImages: jest.fn(),
    deleteImages: jest.fn(),
  };
  return { __esModule: true, default: mImage };
});

import reportService from "@services/reportService";
import reportRepository from "@repositories/reportRepository";
import imageService from "@services/imageService";
import { ReportStatus } from "@models/enums";

type RepoMock = {
  findAll: jest.Mock;
  findById: jest.Mock;
  findByStatus: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  deleteById: jest.Mock;
};

type ImageMock = {
  persistImagesForReport: jest.Mock;
  getMultipleImages: jest.Mock;
  deleteImages: jest.Mock;
};

const repo = reportRepository as unknown as RepoMock;
const img = imageService as unknown as ImageMock;

const makeReport = (overrides: Partial<any> = {}) => ({
  id: 1,
  latitude: 45.072,
  longitude: 7.682,
  title: "Titolo",
  description: "Descrizione",
  category: "WASTE",
  photos: ["p1", "p2"],
  createdAt: new Date("2025-11-04T14:30:00Z"),
  ...overrides,
});

const makeCreateDto = (overrides: Partial<any> = {}) => ({
  latitude: 45.1,
  longitude: 7.65,
  title: "Lampione rotto",
  description: "Il lampione non si accende",
  category: "PUBLIC_LIGHTING",
  photoKeys: ["k1", "k2"],
  ...overrides,
});

describe("reportService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------- findAll --------
  describe("findAll", () => {
    it("returns reports with images resolved", async () => {
      const rows = [makeReport({ id: 2 })];
      repo.findAll.mockResolvedValue(rows);

      const res = await reportService.findAll();

      expect(repo.findAll).toHaveBeenCalledTimes(1);
      expect(res[0].photos).toEqual(rows[0].photos);
    });

    it("filters reports by status when statusFilter is provided", async () => {
      const approvedReports = [makeReport({ id: 1, status: "ASSIGNED" })];
      repo.findAll.mockResolvedValue(approvedReports);

      const res = await reportService.findAll(ReportStatus.ASSIGNED);

      expect(repo.findAll).toHaveBeenCalledWith(ReportStatus.ASSIGNED);
      expect(res[0].photos).toEqual(approvedReports[0].photos);
    });

    it("returns all reports when no statusFilter", async () => {
      const allReports = [
        makeReport({ id: 1, status: "PENDING" }),
        makeReport({ id: 2, status: "ASSIGNED" })
      ];
      repo.findAll.mockResolvedValue(allReports);
      img.getMultipleImages.mockResolvedValue(["url1"]);

      const res = await reportService.findAll();

      expect(repo.findAll).toHaveBeenCalledWith(undefined);
      expect(res).toHaveLength(2);
    });
  });

  // -------- findById --------
  describe("findById", () => {
    it("returns report with images when found", async () => {
      const row = makeReport({ id: 42 });
      repo.findById.mockResolvedValue(row);

      const res = await reportService.findById(42);

      expect(repo.findById).toHaveBeenCalledWith(42);
      expect(res).toEqual({ ...row, photos: row.photos || [] });
    });

    it("returns null when not found", async () => {
      repo.findById.mockResolvedValue(null);

      const res = await reportService.findById(999);

      expect(repo.findById).toHaveBeenCalledWith(999);
      expect(res).toBeNull();
    });
  });

  // -------- findByStatus --------
  describe("findByStatus", () => {
    it("maps string status to enum and returns reports with images", async () => {
      const reports = [makeReport({ id: 1, status: "ASSIGNED" })];
      repo.findByStatus.mockResolvedValue(reports);

      const res = await reportService.findByStatus("ASSIGNED");

      expect(repo.findByStatus).toHaveBeenCalledWith(ReportStatus.ASSIGNED);
      expect(res[0].photos).toEqual(reports[0].photos);
    });

    it("throws for invalid status string", async () => {
      await expect(reportService.findByStatus("BADSTATUS")).rejects.toThrow();
    });

    it("returns empty array when no reports found", async () => {
      repo.findByStatus.mockResolvedValue(null);

      const res = await reportService.findByStatus("PENDING_APPROVAL");

      expect(repo.findByStatus).toHaveBeenCalledWith(ReportStatus.PENDING_APPROVAL);
      expect(res).toEqual([]);
    });
  });

  // -------- updateReportStatus --------
  describe("updateReportStatus", () => {
    it("updates status and returns updated status", async () => {
      const existing = makeReport({ id: 1, status: "PENDING_APPROVAL" });
      repo.findById.mockResolvedValue(existing);
      const updated = makeReport({ id: 1, status: ReportStatus.ASSIGNED });
      repo.update.mockResolvedValue(updated);

      const res = await reportService.updateReportStatus(1, "ASSIGNED");

      expect(repo.update).toHaveBeenCalledWith(1, {
        status: ReportStatus.ASSIGNED,
        rejectionReason: undefined,
        assignedOffice: "Environmental Services - Waste Management",
      });
      expect(res).toBe(ReportStatus.ASSIGNED);
    });

    it("throws for invalid status", async () => {
      await expect(
        reportService.updateReportStatus(1, "BAD"),
      ).rejects.toThrow();
    });

    it("assigns default office when category not recognized", async () => {
      const existing = makeReport({ id: 1, status: "PENDING_APPROVAL", category: "UNKNOWN_CATEGORY" });
      repo.findById.mockResolvedValue(existing);
      const updated = makeReport({ id: 1, status: ReportStatus.ASSIGNED });
      repo.update.mockResolvedValue(updated);

      const res = await reportService.updateReportStatus(1, "ASSIGNED");

      expect(repo.update).toHaveBeenCalledWith(1, {
        status: ReportStatus.ASSIGNED,
        rejectionReason: undefined,
        assignedOffice: "General Services Office",
      });
      expect(res).toBe(ReportStatus.ASSIGNED);
    });

    it("throws error when report status is not PENDING_APPROVAL", async () => {
      const existing = makeReport({ id: 1, status: ReportStatus.ASSIGNED });
      repo.findById.mockResolvedValue(existing);

      await expect(
        reportService.updateReportStatus(1, "ASSIGNED"),
      ).rejects.toThrow(
        "Invalid state transition: only reports in PENDING_APPROVAL can be updated. Current status: ASSIGNED",
      );
    });
  });

  // -------- submitReport (short-circuit path) --------
  describe("submitReport", () => {
    it("when dto is empty, delegates to repo.create and returns created", async () => {
      const dto = {} as any; // percorso 'short-circuit' nel service
      const created = makeReport({ id: 10 });
      repo.create.mockResolvedValue(created);

      const res = await reportService.submitReport(dto, 1);

      expect(repo.create).toHaveBeenCalledWith(dto);
      expect(res).toBe(created);
      expect(img.persistImagesForReport).not.toHaveBeenCalled();
      expect(repo.update).not.toHaveBeenCalled();
      expect(img.getMultipleImages).not.toHaveBeenCalled();
    });

    it("full flow: validates, creates, persists images, updates, returns hydrated photos", async () => {
      const dto = makeCreateDto();
      const created = makeReport({ id: 123, photos: [] });

      repo.create.mockResolvedValue(created);
      img.persistImagesForReport.mockResolvedValue([
        "/img/r/1.jpg",
        "/img/r/2.jpg",
      ]);
      repo.update.mockResolvedValue({
        ...created,
        photos: ["/img/r/1.jpg", "/img/r/2.jpg"],
      });
      img.getMultipleImages.mockResolvedValue(["BINARY1", "BINARY2"]);

      const res = await reportService.submitReport(dto as any, 1);

      expect(repo.create).toHaveBeenCalledWith({
        ...dto,
        photoKeys: [],
        status: "PENDING_APPROVAL",
        user_id: 1,
      });

      expect(img.persistImagesForReport).toHaveBeenCalledWith(
        dto.photoKeys,
        123,
      );
      expect(repo.update).toHaveBeenCalledWith(123, {
        photos: ["/img/r/1.jpg", "/img/r/2.jpg"],
      });
      expect(res).toEqual(
        expect.objectContaining({
          id: 123,
          photos: ["/img/r/1.jpg", "/img/r/2.jpg"],
        }),
      );
    });

    it("creates report, persists images and returns report with resolved images", async () => {
      const dto = makeCreateDto();
      const created = { id: 10, photos: [] };
      const updated = { id: 10, photos: ["p1"] };
      repo.create.mockResolvedValue(created);
      img.persistImagesForReport.mockResolvedValue(["p1"]);
      repo.update.mockResolvedValue(updated);
      img.getMultipleImages.mockResolvedValue(["url_p1"]);

      const res = await reportService.submitReport(dto as any, 123);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          photoKeys: [],
          user_id: 123,
          status: ReportStatus.PENDING_APPROVAL,
        }),
      );
      expect(img.persistImagesForReport).toHaveBeenCalledWith(
        dto.photoKeys,
        created.id,
      );
      expect(repo.update).toHaveBeenCalledWith(created.id, {
        photos: ["p1"],
      });
      expect(res.photos).toEqual(["p1"]);
    });

    it("throws if missing required fields", async () => {
      await expect(
        reportService.submitReport(makeCreateDto({ title: "   " }) as any, 1),
      ).rejects.toThrow("Title is required");

      await expect(
        reportService.submitReport(
          makeCreateDto({ description: "" }) as any,
          1,
        ),
      ).rejects.toThrow("Description is required");

      await expect(
        reportService.submitReport(
          makeCreateDto({ category: undefined }) as any,
          1,
        ),
      ).rejects.toThrow("Category is required");

      await expect(
        reportService.submitReport(makeCreateDto({ photoKeys: [] }) as any, 1),
      ).rejects.toThrow("At least 1 photo is required");

      await expect(
        reportService.submitReport(
          makeCreateDto({ photoKeys: ["a", "b", "c", "d"] }) as any,
          1,
        ),
      ).rejects.toThrow("Maximum 3 photos are allowed");
    });
  });

  // -------- deleteReport --------
  describe("deleteReport", () => {
    it("calls repo.deleteById and imageService.deleteImages (with photos) and returns the deleted report", async () => {
      const report = makeReport({ id: 7, photos: ["pA", "pB"] });
      repo.findById.mockResolvedValue(report);
      const deleted = makeReport({ id: 7, photos: ["pA", "pB"] });
      repo.deleteById.mockResolvedValue(deleted);
      img.deleteImages.mockResolvedValue(undefined);

      const res = await reportService.deleteReport(7);

      expect(repo.deleteById).toHaveBeenCalledWith(7);
      expect(img.deleteImages).toHaveBeenCalledWith(["pA", "pB"]);
      expect(res).toEqual({ ...deleted, photos: [] });
    });

    it("calls deleteImages with [] when report has no photos", async () => {
      const report = makeReport({ id: 8, photos: undefined });
      repo.findById.mockResolvedValue(report);
      const deleted = makeReport({ id: 8, photos: undefined });
      repo.deleteById.mockResolvedValue(deleted);

      await reportService.deleteReport(8);

      expect(img.deleteImages).toHaveBeenCalledWith([]);
    });

    it("propagates repository errors", async () => {
      const report = makeReport({ id: 3 });
      repo.findById.mockResolvedValue(report);
      const err = new Error("delete fail");
      repo.deleteById.mockRejectedValue(err);

      await expect(reportService.deleteReport(3)).rejects.toBe(err);
      expect(img.deleteImages).not.toHaveBeenCalled();
    });

    it("deletes existing report and removes images", async () => {
      const report = makeReport({ id: 7, photos: ["p1"] });
      const deleted = { ...report };
      repo.findById.mockResolvedValue(report);
      repo.deleteById.mockResolvedValue(deleted);
      img.deleteImages.mockResolvedValue(undefined);

      const res = await reportService.deleteReport(7);

      expect(repo.findById).toHaveBeenCalledWith(7);
      expect(repo.deleteById).toHaveBeenCalledWith(7);
      expect(img.deleteImages).toHaveBeenCalledWith(report.photos);
      expect(res.photos).toEqual([]);
      expect(res.id).toBe(7);
    });

    it("throws when report not found", async () => {
      repo.findById.mockResolvedValue(null);
      await expect(reportService.deleteReport(999)).rejects.toThrow(
        "Report not found",
      );
    });
  });
});
