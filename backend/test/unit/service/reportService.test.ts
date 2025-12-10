jest.mock("@repositories/reportRepository", () => {
  const mRepo = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findByStatus: jest.fn(),
    findAssignedReportsForOfficer: jest.fn(),
    findByExternalMaintainerId: jest.fn(),
    assignToExternalMaintainer: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deleteById: jest.fn(),
    addCommentToReport: jest.fn(),
    getCommentsByReportId: jest.fn(),
  };
  return { __esModule: true, default: mRepo };
});

jest.mock("@services/imageService", () => {
  const mImage = {
    persistImagesForReport: jest.fn(),
    getMultipleImages: jest.fn(),
    deleteImages: jest.fn(),
    preloadCache: jest.fn(),
  };
  return { __esModule: true, default: mImage };
});

import reportService from "@services/reportService";
import reportRepository from "@repositories/reportRepository";
import imageService from "@services/imageService";
import { userRepository } from "@repositories/userRepository";
import { ReportStatus } from "@models/enums";

type RepoMock = {
  findAll: jest.Mock;
  findById: jest.Mock;
  findByStatus: jest.Mock;
  findAssignedReportsForOfficer: jest.Mock;
  findByExternalMaintainerId: jest.Mock;
  assignToExternalMaintainer: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  deleteById: jest.Mock;
};

type ImageMock = {
  persistImagesForReport: jest.Mock;
  getMultipleImages: jest.Mock;
  deleteImages: jest.Mock;
  preloadCache: jest.Mock;
};

const repo = reportRepository as unknown as RepoMock;
const img = imageService as unknown as ImageMock;
const findLeastLoadedOfficerSpy = jest.spyOn(
  userRepository,
  "findLeastLoadedOfficerByOfficeName",
);

const makeReport = (overrides: Partial<any> = {}) => ({
  id: 1,
  latitude: 45.072,
  longitude: 7.682,
  title: "Titolo",
  description: "Descrizione",
  category: "WASTE",
  photos: ["p1", "p2"],
  status: ReportStatus.PENDING_APPROVAL,
  createdAt: new Date("2025-11-04T14:30:00Z"),
  user_id: 10,
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
    findLeastLoadedOfficerSpy.mockReset();
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

      expect(repo.findAll).toHaveBeenCalledWith(
        ReportStatus.ASSIGNED,
        undefined,
      );
      expect(res[0].photos).toEqual(approvedReports[0].photos);
    });

    it("returns all reports when no statusFilter", async () => {
      const allReports = [
        makeReport({ id: 1, status: "PENDING" }),
        makeReport({ id: 2, status: "ASSIGNED" }),
      ];
      repo.findAll.mockResolvedValue(allReports);
      img.getMultipleImages.mockResolvedValue(["url1"]);

      const res = await reportService.findAll();

      expect(repo.findAll).toHaveBeenCalledWith(undefined, undefined);
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

      expect(repo.findByStatus).toHaveBeenCalledWith(
        ReportStatus.PENDING_APPROVAL,
      );
      expect(res).toEqual([]);
    });
  });

  // -------- updateReportStatus --------
  describe("updateReportStatus", () => {
    it("updates status and returns updated status", async () => {
      const existing = makeReport({ id: 1, status: "PENDING_APPROVAL" });
      repo.findById.mockResolvedValue(existing);
      const updated = makeReport({
        id: 1,
        status: ReportStatus.ASSIGNED,
        assignedOfficerId: 50,
      });
      repo.update.mockResolvedValue(updated);
      findLeastLoadedOfficerSpy.mockResolvedValue({ id: 50 } as any);

      const res = await reportService.updateReportStatus(1, "ASSIGNED");

      expect(repo.update).toHaveBeenCalledWith(1, {
        status: ReportStatus.ASSIGNED,
        rejectionReason: undefined,
        assignedOffice: "sanitation and waste management officer",
        assignedOfficerId: 50,
      });
      expect(res).toBe(ReportStatus.ASSIGNED);
    });

    it("throws for invalid status string", async () => {
      await expect(
        reportService.updateReportStatus(1, "BAD"),
      ).rejects.toThrow();
    });

    it("assigns default office when category not recognized", async () => {
      const existing = makeReport({
        id: 1,
        status: "PENDING_APPROVAL",
        category: "UNKNOWN_CATEGORY",
      });
      repo.findById.mockResolvedValue(existing);
      const updated = makeReport({ id: 1, status: ReportStatus.ASSIGNED });
      repo.update.mockResolvedValue(updated);
      findLeastLoadedOfficerSpy.mockResolvedValue({ id: 77 } as any);

      const res = await reportService.updateReportStatus(1, "ASSIGNED");

      expect(repo.update).toHaveBeenCalledWith(1, {
        status: ReportStatus.ASSIGNED,
        rejectionReason: undefined,
        assignedOffice: "municipal administrator",
        assignedOfficerId: 77,
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
      expect(res).toMatchObject(created);
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
      // img.getMultipleImages.mockResolvedValue(["BINARY1", "BINARY2"]);

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
      // img.getMultipleImages.mockResolvedValue(["url_p1"]);

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
      repo.findById.mockResolvedValue(deleted);
      repo.deleteById.mockResolvedValue(deleted);
      img.deleteImages.mockResolvedValue(undefined);

      const res = await reportService.deleteReport(7);

      expect(repo.deleteById).toHaveBeenCalledWith(7);
      expect(img.deleteImages).toHaveBeenCalledWith(["pA", "pB"]);
      expect(res).toEqual({ ...deleted, photos: [] });
      expect(res).toEqual({ ...deleted, photos: [] });
    });

    it("calls deleteImages with [] when report has no photos", async () => {
      const report = makeReport({ id: 8, photos: undefined });
      repo.findById.mockResolvedValue(report);
      const deleted = makeReport({ id: 8, photos: undefined });
      repo.findById.mockResolvedValue(deleted);
      repo.deleteById.mockResolvedValue(deleted);

      await reportService.deleteReport(8);

      expect(img.deleteImages).toHaveBeenCalledWith([]);
    });

    it("propagates repository errors", async () => {
      const report = makeReport({ id: 3 });
      repo.findById.mockResolvedValue(report);
      const err = new Error("delete fail");
      repo.deleteById.mockRejectedValue(err);

      await expect(reportService.deleteReport(3)).rejects.toThrow(err);
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

  describe("findAssignedReportsForOfficer", () => {
    it("returns reports for officer with photos normalized", async () => {
      const reports = [makeReport({ photos: undefined })];
      repo.findAssignedReportsForOfficer.mockResolvedValue(reports);

      const res = await reportService.findAssignedReportsForOfficer(12);

      expect(repo.findAssignedReportsForOfficer).toHaveBeenCalledWith(
        12,
        undefined,
      );
      expect(res).toEqual([expect.objectContaining({ photos: [] })]);
    });

    it("maps provided status string before querying repository", async () => {
      const reports = [makeReport({ status: ReportStatus.ASSIGNED })];
      repo.findAssignedReportsForOfficer.mockResolvedValue(reports);

      const res = await reportService.findAssignedReportsForOfficer(
        5,
        "ASSIGNED" as unknown as ReportStatus,
      );

      expect(repo.findAssignedReportsForOfficer).toHaveBeenCalledWith(
        5,
        ReportStatus.ASSIGNED,
      );
      expect(res).toHaveLength(1);
    });

    it("throws when status string is invalid", async () => {
      await expect(
        reportService.findAssignedReportsForOfficer(
          1,
          "INVALID" as unknown as ReportStatus,
        ),
      ).rejects.toThrow("Invalid status");
    });
  });

  describe("pickOfficerForService", () => {
    it("returns null when office name is missing", async () => {
      const res = await reportService.pickOfficerForService(undefined);

      expect(findLeastLoadedOfficerSpy).not.toHaveBeenCalled();
      expect(res).toBeNull();
    });

    it("returns null when repository finds no officer", async () => {
      findLeastLoadedOfficerSpy.mockResolvedValue(null);

      const res = await reportService.pickOfficerForService("Ghost Office");

      expect(findLeastLoadedOfficerSpy).toHaveBeenCalledWith("Ghost Office");
      expect(res).toBeNull();
    });

    it("returns officer id when repository resolves an officer", async () => {
      findLeastLoadedOfficerSpy.mockResolvedValue({ id: 77 } as any);

      const res = await reportService.pickOfficerForService(
        "Environmental Services - Waste Management",
      );

      expect(findLeastLoadedOfficerSpy).toHaveBeenCalledWith(
        "Environmental Services - Waste Management",
      );
      expect(res).toBe(77);
    });
  });

  // -------- External Maintainer Assignment --------
  describe("assignToExternalMaintainer", () => {
    it("should assign report to least loaded external maintainer", async () => {
      const reportId = 1;
      const report = {
        id: reportId,
        category: "PUBLIC_LIGHTING",
        status: ReportStatus.PENDING_APPROVAL,
      };
      const maintainers = [
        { id: 1, assignedReports: [1, 2, 3, 4, 5] },
        { id: 2, assignedReports: [1, 2] },
        { id: 3, assignedReports: [1, 2, 3, 4, 5, 6, 7, 8] },
      ];
      const updatedReport = {
        ...report,
        externalMaintainerId: 2,
        status: ReportStatus.ASSIGNED,
        photos: [],
        user_id: undefined,
      };

      repo.findById.mockResolvedValue(report);
      jest
        .spyOn(userRepository, "findExternalMaintainersByCategory")
        .mockResolvedValue(maintainers as any);
      repo.update.mockResolvedValue(updatedReport);

      const res = await reportService.assignToExternalMaintainer(reportId);

      expect(repo.findById).toHaveBeenCalledWith(reportId);
      expect(repo.update).toHaveBeenCalledWith(reportId, {
        externalMaintainerId: 2,
      });
      expect(res).toEqual(updatedReport);
    });

    it("should throw error when report not found", async () => {
      repo.findById.mockResolvedValue(null);

      await expect(
        reportService.assignToExternalMaintainer(999),
      ).rejects.toThrow("Report not found");
    });

    it("should throw error when no external maintainers available", async () => {
      const reportId = 1;
      const report = {
        id: reportId,
        category: "UNKNOWN_CATEGORY",
      };

      repo.findById.mockResolvedValue(report);
      jest
        .spyOn(userRepository, "findExternalMaintainersByCategory")
        .mockResolvedValue([]);

      await expect(
        reportService.assignToExternalMaintainer(reportId),
      ).rejects.toThrow("No external maintainers available");
    });
  });

  // -------- Find Reports for External Maintainer --------
  describe("findReportsForExternalMaintainer", () => {
    it("should return all reports for external maintainer", async () => {
      const maintainerId = 1;
      const reports = [
        {
          id: 1,
          title: "Report 1",
          externalMaintainerId: maintainerId,
          photos: [],
          user_id: undefined,
          status: ReportStatus.PENDING_APPROVAL,
        },
        {
          id: 2,
          title: "Report 2",
          externalMaintainerId: maintainerId,
          photos: [],
          user_id: undefined,
          status: ReportStatus.PENDING_APPROVAL,
        },
      ];

      repo.findByExternalMaintainerId = jest.fn().mockResolvedValue(reports);

      const res =
        await reportService.findReportsForExternalMaintainer(maintainerId);

      expect(repo.findByExternalMaintainerId).toHaveBeenCalledWith(
        maintainerId,
      );
      expect(res.length).toBe(2);
      expect(res[0].title).toBe("Report 1");
      expect(res[1].title).toBe("Report 2");
    });

    it("should return reports with various statuses", async () => {
      const maintainerId = 1;
      const status = ReportStatus.IN_PROGRESS;
      const reports = [
        {
          id: 1,
          title: "Report 1",
          status,
          externalMaintainerId: maintainerId,
          photos: [],
          user_id: undefined,
        },
      ];

      repo.findByExternalMaintainerId = jest.fn().mockResolvedValue(reports);

      const res =
        await reportService.findReportsForExternalMaintainer(maintainerId);

      expect(repo.findByExternalMaintainerId).toHaveBeenCalledWith(
        maintainerId,
      );
      expect(res.length).toBe(1);
      expect(res[0].title).toBe("Report 1");
    });

    it("should return empty array when no reports found", async () => {
      repo.findByExternalMaintainerId = jest.fn().mockResolvedValue([]);

      const res = await reportService.findReportsForExternalMaintainer(999);

      expect(res).toEqual([]);
    });
  });

  // -------- Anonymous Report Sanitization --------
  describe("sanitizeReport - anonymous reports", () => {
    it("should sanitize anonymous report by nullifying user details", async () => {
      const anonymousReport = makeReport({
        id: 1,
        anonymous: true,
        user: { id: 10, username: "user1" },
      });
      repo.findById.mockResolvedValue(anonymousReport);

      const res = await reportService.findById(1);

      expect(res?.user).toBeNull();
      expect(res?.user_id).toBe(10); // Keep user_id for filtering
    });

    it("should keep user details for non-anonymous reports", async () => {
      const report = makeReport({
        id: 1,
        anonymous: false,
        user: { id: 10, username: "user1" },
      });
      repo.findById.mockResolvedValue(report);

      const res = await reportService.findById(1);

      expect(res?.user).toEqual({ id: 10, username: "user1" });
    });
  });

  // -------- updateReportStatus - Officer Not Available --------
  describe("updateReportStatus - officer not available", () => {
    it("should throw error when no officer available", async () => {
      const existing = makeReport({ id: 1, status: "PENDING_APPROVAL" });
      repo.findById.mockResolvedValue(existing);
      findLeastLoadedOfficerSpy.mockResolvedValue(null); // No officer available

      await expect(
        reportService.updateReportStatus(1, "ASSIGNED"),
      ).rejects.toThrow(
        'Cannot approve report: No officer available with role "sanitation and waste management officer"',
      );
    });
  });

  // -------- submitReport - preloadCache error handling --------
  describe("submitReport - preloadCache error", () => {
    it("should catch preloadCache errors gracefully", async () => {
      const dto = makeCreateDto();
      const created = { id: 10, photos: [] };
      const updated = { id: 10, photos: ["p1"] };
      repo.create.mockResolvedValue(created);
      img.persistImagesForReport.mockResolvedValue(["p1"]);
      repo.update.mockResolvedValue(updated);
      img.preloadCache.mockRejectedValue(new Error("Redis connection failed"));
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      const res = await reportService.submitReport(dto as any, 123);

      expect(res.photos).toEqual(["p1"]);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to preload report images",
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });
  });

  // -------- assignToExternalMaintainer - no maintainers available --------
  describe("assignToExternalMaintainer - no maintainers", () => {
    it("should throw error when no external maintainers available for category", async () => {
      const reportId = 1;
      const report = makeReport({
        id: reportId,
        category: "PUBLIC_LIGHTING",
        externalMaintainerId: null,
      });
      repo.findById.mockResolvedValue(report);
      repo.findByExternalMaintainerId = jest.fn().mockResolvedValue([]);

      // Mock userRepository to return empty list for category
      jest.spyOn(userRepository, "getUsersByRole").mockResolvedValue([]);

      await expect(
        reportService.assignToExternalMaintainer(reportId),
      ).rejects.toThrow(
        'No external maintainers available for category "PUBLIC_LIGHTING"',
      );
    });
  });

  // ---------- addCommentToReport / getCommentsOfAReportById ----------
  describe("comments service", () => {
    it("addCommentToReport creates comment and returns dto", async () => {
      const repoCreated = {
        id: 12,
        reportId: 5,
        content: "hello",
        municipality_user_id: 3,
        external_maintainer_id: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      repo.create = repo.create || jest.fn(); // guard when repo shape differs
      repo.create = repo.create; // no-op to silence TS in snippet context

      // mock repository addCommentToReport
      (repo as any).addCommentToReport.mockResolvedValue(repoCreated);
      const dto = {
        reportId: 5,
        authorId: 3,
        authorType: "MUNICIPALITY",
        content: "hello",
      };

      const result =
        await require("@services/reportService").default.addCommentToReport(
          dto,
        );

      expect((repo as any).addCommentToReport).toHaveBeenCalledWith({
        reportId: 5,
        content: "hello",
        municipality_user_id: 3,
        external_maintainer_id: null,
      });
      expect(result).toHaveProperty("id", 12);
      expect(result).toHaveProperty("content", "hello");
    });

    it("addCommentToReport throws when report not found at repo layer", async () => {
      (repo as any).findById.mockResolvedValue(null);
      // reportService first calls reportRepository.findById inside addCommentToReport
      (repo as any).addCommentToReport.mockImplementation(() => {
        throw new Error("Report not found");
      });

      await expect(
        require("@services/reportService").default.addCommentToReport({
          reportId: 999,
          authorId: 1,
          authorType: "MUNICIPALITY",
          content: "x",
        }),
      ).rejects.toThrow();
    });

    it("getCommentsOfAReportById returns mapped comments", async () => {
      const rawComments = [
        {
          id: 1,
          reportId: 5,
          content: "c1",
          municipality_user_id: 2,
          external_maintainer_id: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      (repo as any).findById.mockResolvedValue({ id: 5 });
      (repo as any).getCommentsByReportId.mockResolvedValue(rawComments);

      const res =
        await require("@services/reportService").default.getCommentsOfAReportById(
          5,
        );

      expect((repo as any).getCommentsByReportId).toHaveBeenCalledWith(5);
      expect(Array.isArray(res)).toBe(true);
      expect(res[0]).toHaveProperty("content", "c1");
    });
  });

  // ---------- updateReportStatusByExternalMaintainer ----------
  describe("updateReportStatusByExternalMaintainer", () => {
    it("updates status when report assigned to maintainer and valid transition", async () => {
      const svc = require("@services/reportService").default;
      const existing = { id: 7, externalMaintainerId: 3, status: "ASSIGNED" };
      (repo as any).findById.mockResolvedValue(existing);
      (repo as any).update.mockResolvedValue({
        ...existing,
        status: "IN_PROGRESS",
      });

      const updated = await svc.updateReportStatusByExternalMaintainer(
        7,
        3,
        "IN_PROGRESS",
      );
      expect((repo as any).update).toHaveBeenCalledWith(
        7,
        expect.objectContaining({ status: "IN_PROGRESS" }),
      );
      expect(updated).toHaveProperty("status", "IN_PROGRESS");
    });

    it("throws when maintainer not authorized", async () => {
      const existing = { id: 7, externalMaintainerId: 4, status: "ASSIGNED" };
      (repo as any).findById.mockResolvedValue(existing);

      await expect(
        require("@services/reportService").default.updateReportStatusByExternalMaintainer(
          7,
          3,
          "IN_PROGRESS",
        ),
      ).rejects.toThrow(/not authorized/i);
    });

    it("throws for invalid status change", async () => {
      const existing = { id: 7, externalMaintainerId: 3, status: "ASSIGNED" };
      (repo as any).findById.mockResolvedValue(existing);

      await expect(
        require("@services/reportService").default.updateReportStatusByExternalMaintainer(
          7,
          3,
          "RESOLVED",
        ),
      ).rejects.toThrow(/Invalid state transition/i);
    });

    it("throws when invalid status string passed", async () => {
      const existing = { id: 7, externalMaintainerId: 3, status: "ASSIGNED" };
      (repo as any).findById.mockResolvedValue(existing);

      await expect(
        require("@services/reportService").default.updateReportStatusByExternalMaintainer(
          7,
          3,
          "INVALID_STATUS",
        ),
      ).rejects.toThrow(/Invalid status/i);
    });

    it("throws when report not found", async () => {
      (repo as any).findById.mockResolvedValue(null);

      await expect(
        require("@services/reportService").default.updateReportStatusByExternalMaintainer(
          999,
          3,
          "IN_PROGRESS",
        ),
      ).rejects.toThrow(/not found/i);
    });

    it("allows IN_PROGRESS to SUSPENDED transition", async () => {
      const existing = { id: 7, externalMaintainerId: 3, status: "IN_PROGRESS" };
      (repo as any).findById.mockResolvedValue(existing);
      (repo as any).update.mockResolvedValue({
        ...existing,
        status: "SUSPENDED",
      });

      const updated = await require("@services/reportService").default.updateReportStatusByExternalMaintainer(
        7,
        3,
        "SUSPENDED",
      );
      expect(updated).toHaveProperty("status", "SUSPENDED");
    });

    it("allows SUSPENDED to IN_PROGRESS transition", async () => {
      const existing = { id: 7, externalMaintainerId: 3, status: "SUSPENDED" };
      (repo as any).findById.mockResolvedValue(existing);
      (repo as any).update.mockResolvedValue({
        ...existing,
        status: "IN_PROGRESS",
      });

      const updated = await require("@services/reportService").default.updateReportStatusByExternalMaintainer(
        7,
        3,
        "IN_PROGRESS",
      );
      expect(updated).toHaveProperty("status", "IN_PROGRESS");
    });
  });

  // ---------- assignToExternalMaintainer ----------
  describe("assignToExternalMaintainer", () => {
    it("selects maintainer with least assigned reports", async () => {
      const svc = require("@services/reportService").default;
      const report = { id: 5, category: "WASTE" };
      const maintainers = [
        { id: 1, assignedReports: [{ id: 10 }, { id: 11 }] },
        { id: 2, assignedReports: [{ id: 12 }] },
        { id: 3, assignedReports: [] },
      ];

      (repo as any).findById.mockResolvedValue(report);
      jest
        .spyOn(userRepository, "findExternalMaintainersByCategory")
        .mockResolvedValue(maintainers as any);
      (repo as any).update.mockResolvedValue({
        ...report,
        externalMaintainerId: 3,
      });

      await svc.assignToExternalMaintainer(5);

      expect((repo as any).update).toHaveBeenCalledWith(
        5,
        expect.objectContaining({ externalMaintainerId: 3 }),
      );
    });

    it("uses tie-breaker (lowest ID) when maintainers have same report count", async () => {
      const svc = require("@services/reportService").default;
      const report = { id: 5, category: "WASTE" };
      const maintainers = [
        { id: 5, assignedReports: [{ id: 10 }] },
        { id: 2, assignedReports: [{ id: 11 }] },
        { id: 3, assignedReports: [{ id: 12 }] },
      ];

      (repo as any).findById.mockResolvedValue(report);
      jest
        .spyOn(userRepository, "findExternalMaintainersByCategory")
        .mockResolvedValue(maintainers as any);
      (repo as any).update.mockResolvedValue({
        ...report,
        externalMaintainerId: 2,
      });

      await svc.assignToExternalMaintainer(5);

      // Should select ID 2 (lowest among those with 1 report each)
      expect((repo as any).update).toHaveBeenCalledWith(
        5,
        expect.objectContaining({ externalMaintainerId: 2 }),
      );
    });

    it("throws when report not found", async () => {
      const svc = require("@services/reportService").default;
      (repo as any).findById.mockResolvedValue(null);

      await expect(svc.assignToExternalMaintainer(999)).rejects.toThrow(
        /not found/i,
      );
    });

    it("throws when no maintainers available for category", async () => {
      const svc = require("@services/reportService").default;
      const report = { id: 5, category: "WASTE" };

      (repo as any).findById.mockResolvedValue(report);
      jest
        .spyOn(userRepository, "findExternalMaintainersByCategory")
        .mockResolvedValue([]);

      await expect(svc.assignToExternalMaintainer(5)).rejects.toThrow(
        /No external maintainers available/i,
      );
    });
  });

  // ---------- addCommentToReport - additional coverage ----------
  describe("addCommentToReport - extended coverage", () => {
    it("throws on invalid author type", async () => {
      const svc = require("@services/reportService").default;
      const report = { id: 5, status: ReportStatus.PENDING_APPROVAL };
      (repo as any).findById.mockResolvedValue(report);

      await expect(
        svc.addCommentToReport({
          reportId: 5,
          authorId: 1,
          authorType: "INVALID_TYPE",
          content: "test",
        }),
      ).rejects.toThrow(/Invalid author type/i);
    });

    it("throws when external maintainer tries to comment on unassigned report", async () => {
      const svc = require("@services/reportService").default;
      const report = { 
        id: 5, 
        status: ReportStatus.PENDING_APPROVAL,
        externalMaintainerId: null 
      };
      (repo as any).findById.mockResolvedValue(report);

      await expect(
        svc.addCommentToReport({
          reportId: 5,
          authorId: 1,
          authorType: "EXTERNAL_MAINTAINER",
          content: "test",
        }),
      ).rejects.toThrow(/only comment on reports assigned/i);
    });

    it("throws when external maintainer tries to comment on report assigned to different maintainer", async () => {
      const svc = require("@services/reportService").default;
      const report = { 
        id: 5, 
        status: ReportStatus.PENDING_APPROVAL,
        externalMaintainerId: 5 
      };
      (repo as any).findById.mockResolvedValue(report);

      await expect(
        svc.addCommentToReport({
          reportId: 5,
          authorId: 3, // Different ID from externalMaintainerId
          authorType: "EXTERNAL_MAINTAINER",
          content: "test",
        }),
      ).rejects.toThrow(/only comment on reports assigned/i);
    });

    it("allows external maintainer to comment on assigned report", async () => {
      const svc = require("@services/reportService").default;
      const report = { 
        id: 5, 
        status: ReportStatus.PENDING_APPROVAL,
        externalMaintainerId: 3 
      };
      const comment = {
        id: 99,
        reportId: 5,
        content: "comment",
        municipality_user_id: null,
        external_maintainer_id: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (repo as any).findById.mockResolvedValue(report);
      (repo as any).addCommentToReport.mockResolvedValue(comment);

      const result = await svc.addCommentToReport({
        reportId: 5,
        authorId: 3,
        authorType: "EXTERNAL_MAINTAINER",
        content: "comment",
      });

      expect(result).toHaveProperty("id", 99);
      expect(result).toHaveProperty("external_maintainer_id", 3);
    });

    it("throws when trying to comment on RESOLVED report", async () => {
      const svc = require("@services/reportService").default;
      const report = { 
        id: 5, 
        status: ReportStatus.RESOLVED,
        externalMaintainerId: 3 
      };
      (repo as any).findById.mockResolvedValue(report);

      await expect(
        svc.addCommentToReport({
          reportId: 5,
          authorId: 3,
          authorType: "EXTERNAL_MAINTAINER",
          content: "test",
        }),
      ).rejects.toThrow(/Cannot add comments to resolved reports/i);
    });

    it("allows municipality user to comment without assignment check", async () => {
      const svc = require("@services/reportService").default;
      const report = { 
        id: 5, 
        status: ReportStatus.PENDING_APPROVAL,
        externalMaintainerId: null 
      };
      const comment = {
        id: 100,
        reportId: 5,
        content: "muni comment",
        municipality_user_id: 7,
        external_maintainer_id: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (repo as any).findById.mockResolvedValue(report);
      (repo as any).addCommentToReport.mockResolvedValue(comment);

      const result = await svc.addCommentToReport({
        reportId: 5,
        authorId: 7,
        authorType: "MUNICIPALITY",
        content: "muni comment",
      });

      expect(result).toHaveProperty("municipality_user_id", 7);
    });
  });
});
