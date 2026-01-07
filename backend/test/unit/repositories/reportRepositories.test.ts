jest.mock("@database", () => {
  const mPrisma = {
    report: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    },
  };
  return { prisma: mPrisma };
});

import { prisma } from "@database";
import reportRepository from "@repositories/reportRepository";
import { ReportStatus } from "@models/enums";

type PrismaMock = {
  report: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    delete: jest.Mock;
    update: jest.Mock;
  };
};

const prismaMock = prisma as unknown as PrismaMock;

// Helper
const makeReport = (overrides: Partial<any> = {}) => ({
  id: 1,
  latitude: 45.072,
  longitude: 7.682,
  title: "Buche in via Roma",
  description: "Buca profonda vicino al numero 12",
  category: "ROAD_DAMAGE",
  photos: ["p1", "p2"],
  createdAt: new Date("2025-11-04T14:30:00Z"),
  ...overrides,
});

describe("reportRepository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------- findAll --------
  describe("findAll", () => {
    it("call findAll and returns all reports", async () => {
      const rows = [makeReport({ id: 2 }), makeReport({ id: 1 })];
      prismaMock.report.findMany.mockResolvedValue(rows);

      const res = await reportRepository.findAll();

      expect(prismaMock.report.findMany).toHaveBeenCalledWith({
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          externalMaintainer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      expect(res).toBe(rows);
    });

    it("filters reports by status when statusFilter is provided", async () => {
      const approvedReports = [makeReport({ id: 1, status: "ASSIGNED" })];
      prismaMock.report.findMany.mockResolvedValue(approvedReports);

      const res = await reportRepository.findAll("ASSIGNED");

      expect(prismaMock.report.findMany).toHaveBeenCalledWith({
        where: { status: "ASSIGNED" },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          externalMaintainer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      expect(res).toBe(approvedReports);
    });

    it("returns all reports when no statusFilter", async () => {
      const allReports = [
        makeReport({ id: 1, status: "PENDING" }),
        makeReport({ id: 2, status: "ASSIGNED" }),
      ];
      prismaMock.report.findMany.mockResolvedValue(allReports);

      const res = await reportRepository.findAll();

      expect(prismaMock.report.findMany).toHaveBeenCalledWith({
        where: undefined,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          externalMaintainer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      expect(res).toBe(allReports);
    });

    it("returns citizen own reports and ASSIGNED reports when userId is provided", async () => {
      const userReports = [
        makeReport({ id: 1, status: "PENDING_APPROVAL", user_id: 5 }),
        makeReport({ id: 2, status: "ASSIGNED", user_id: 3 }),
      ];
      prismaMock.report.findMany.mockResolvedValue(userReports);

      const res = await reportRepository.findAll(undefined, 5);

      expect(prismaMock.report.findMany).toHaveBeenCalledWith({
        where: {
          OR: [{ user_id: 5 }, { status: "ASSIGNED" }],
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          externalMaintainer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      expect(res).toBe(userReports);
    });
  });

  // -------- findByStatus --------
  describe("findByStatus", () => {
    it("finds reports by status", async () => {
      const reports = [makeReport({ id: 1, status: "PENDING_APPROVAL" })];
      prismaMock.report.findMany.mockResolvedValue(reports);

      const res = await reportRepository.findByStatus(
        ReportStatus.PENDING_APPROVAL,
      );

      expect(prismaMock.report.findMany).toHaveBeenCalledWith({
        where: { status: ReportStatus.PENDING_APPROVAL },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          externalMaintainer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      expect(res).toBe(reports);
    });
  });

  // -------- findById --------
  describe("findById", () => {
    it("return report if it exists", async () => {
      const row = makeReport({ id: 42 });
      prismaMock.report.findUnique.mockResolvedValue(row);

      const res = await reportRepository.findById(42);

      expect(prismaMock.report.findUnique).toHaveBeenCalledWith({
        where: { id: 42 },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          externalMaintainer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
            },
          },
        },
      });
      expect(res).toBe(row);
    });

    it("return null if the report does not exists", async () => {
      prismaMock.report.findUnique.mockResolvedValue(null);

      const res = await reportRepository.findById(999);
      expect(res).toBeNull();
    });
  });

  // -------- findByStatus --------
  describe("findByStatus", () => {
    it("returns reports filtered by status", async () => {
      const rows = [makeReport({ id: 5, status: ReportStatus.ASSIGNED })];
      prismaMock.report.findMany.mockResolvedValue(rows);

      const res = await reportRepository.findByStatus(
        ReportStatus.ASSIGNED as any,
      );

      expect(prismaMock.report.findMany).toHaveBeenCalledWith({
        where: { status: ReportStatus.ASSIGNED } as any,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          externalMaintainer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      expect(res).toBe(rows);
    });
  });

  // -------- findByStatusesAndCategories --------
  describe("findByStatusesAndCategories", () => {
    it("returns reports filtered by multiple statuses and categories", async () => {
      const rows = [
        makeReport({ id: 9, status: ReportStatus.ASSIGNED, category: "WASTE" }),
      ];
      prismaMock.report.findMany.mockResolvedValue(rows);

      const statuses = [
        ReportStatus.PENDING_APPROVAL as any,
        ReportStatus.ASSIGNED as any,
      ];
      const categories = ["WASTE", "PUBLIC_LIGHTING"];

      const res = await reportRepository.findByStatusesAndCategories(
        statuses,
        categories,
      );

      expect(prismaMock.report.findMany).toHaveBeenCalledWith({
        where: {
          status: { in: statuses as any },
          category: { in: categories as any },
        } as any,
        orderBy: { createdAt: "desc" },
      });
      expect(res).toBe(rows);
    });
  });

  // -------- create --------
  describe("create", () => {
    it("maps DTO fields and creates report", async () => {
      const dto = {
        latitude: 45.1001,
        longitude: 7.6502,
        title: "Lampione rotto",
        description: "Il lampione non si accende",
        category: "LIGHTING", // enum lato dominio; in repo viene castato ad any
        photoKeys: ["k1", "k2"],
      };

      const created = makeReport({
        id: 10,
        latitude: dto.latitude,
        longitude: dto.longitude,
        title: dto.title,
        description: dto.description,
        category: dto.category,
        photos: dto.photoKeys,
      });

      prismaMock.report.create.mockResolvedValue(created);

      const res = await reportRepository.create(dto as any);

      expect(prismaMock.report.create).toHaveBeenCalledWith({
        data: {
          latitude: dto.latitude,
          longitude: dto.longitude,
          title: dto.title,
          description: dto.description,
          category: dto.category,
          photos: dto.photoKeys,
          anonymous: false,
          assignedOffice: undefined,
          user: undefined,
        },
      });
      expect(res).toBe(created);

      // opzionale: controlli di shape
      expect(res).toEqual(
        expect.objectContaining({
          id: expect.any(Number),
          createdAt: expect.any(Date),
          photos: expect.any(Array),
        }),
      );
    });

    it("connects user relation when user_id is provided", async () => {
      const dtoWithUser = {
        latitude: 45.12,
        longitude: 7.66,
        title: "Titolo con utente",
        description: "Desc",
        category: "WASTE",
        photoKeys: ["a"],
        status: ReportStatus.PENDING_APPROVAL,
        assignedOffice: "Office A",
        user_id: 77,
      };

      const created = makeReport({
        id: 11,
        latitude: dtoWithUser.latitude,
        longitude: dtoWithUser.longitude,
        title: dtoWithUser.title,
        description: dtoWithUser.description,
        category: dtoWithUser.category,
        photos: dtoWithUser.photoKeys,
      });

      prismaMock.report.create.mockResolvedValue(created);

      const res = await reportRepository.create(dtoWithUser as any);

      expect(prismaMock.report.create).toHaveBeenCalledWith({
        data: {
          latitude: dtoWithUser.latitude,
          longitude: dtoWithUser.longitude,
          title: dtoWithUser.title,
          description: dtoWithUser.description,
          category: dtoWithUser.category,
          photos: dtoWithUser.photoKeys,
          status: dtoWithUser.status,
          assignedOffice: dtoWithUser.assignedOffice,
          anonymous: false,
          user: {
            connect: { id: dtoWithUser.user_id },
          },
        },
      });
      expect(res).toBe(created);
    });
  });

  // -------- update --------
  describe("update", () => {
    it("updates photos by id", async () => {
      const id = 7;
      const patch = { photos: ["new1", "new2"] };
      const updated = makeReport({ id, photos: patch.photos });

      prismaMock.report.update.mockResolvedValue(updated);

      const res = await reportRepository.update(id, patch);

      expect(prismaMock.report.update).toHaveBeenCalledWith({
        where: { id },
        data: patch,
      });
      expect(res).toBe(updated);
    });

    it("updates status, rejectionReason and assignedOffice by id", async () => {
      const id = 15;
      const patch = {
        status: ReportStatus.ASSIGNED,
        rejectionReason: "not needed",
        assignedOffice: "Assigned Office",
      };
      const updated = makeReport({
        id,
        status: patch.status,
        assignedOffice: patch.assignedOffice,
      });

      prismaMock.report.update.mockResolvedValue(updated);

      const res = await reportRepository.update(id, patch as any);

      expect(prismaMock.report.update).toHaveBeenCalledWith({
        where: { id },
        data: patch,
      });
      expect(res).toBe(updated);
    });
  });

  // -------- findByStatusesAndCategories --------
  describe("findByStatusesAndCategories", () => {
    it("finds reports by statuses and categories", async () => {
      const reports = [
        makeReport({
          id: 1,
          status: "PENDING_APPROVAL",
          category: "ROAD_DAMAGE",
        }),
      ];
      prismaMock.report.findMany.mockResolvedValue(reports);

      const res = await reportRepository.findByStatusesAndCategories(
        [ReportStatus.PENDING_APPROVAL],
        ["ROAD_DAMAGE"],
      );

      expect(prismaMock.report.findMany).toHaveBeenCalledWith({
        where: {
          status: { in: [ReportStatus.PENDING_APPROVAL] as any },
          category: { in: ["ROAD_DAMAGE"] as any },
        } as any,
        orderBy: { createdAt: "desc" },
      });
      expect(res).toBe(reports);
    });
  });

  // -------- create --------
  describe("create", () => {
    it("creates a report without user_id", async () => {
      const reportData = {
        latitude: 45.072,
        longitude: 7.682,
        title: "Buche in via Roma",
        description: "Buca profonda vicino al numero 12",
        category: "ROAD_DAMAGE",
        photoKeys: ["p1", "p2"],
        status: ReportStatus.PENDING_APPROVAL,
      };
      const createdReport = makeReport({ ...reportData, id: 1 });
      prismaMock.report.create.mockResolvedValue(createdReport);

      const res = await reportRepository.create(reportData);

      expect(prismaMock.report.create).toHaveBeenCalledWith({
        data: {
          latitude: 45.072,
          longitude: 7.682,
          title: "Buche in via Roma",
          description: "Buca profonda vicino al numero 12",
          category: "ROAD_DAMAGE" as any,
          photos: ["p1", "p2"],
          status: ReportStatus.PENDING_APPROVAL,
          assignedOffice: undefined,
          anonymous: false,
        },
      });
      expect(res).toBe(createdReport);
    });

    it("creates a report with user_id", async () => {
      const reportData = {
        latitude: 45.072,
        longitude: 7.682,
        title: "Buche in via Roma",
        description: "Buca profonda vicino al numero 12",
        category: "ROAD_DAMAGE",
        photoKeys: ["p1", "p2"],
        status: ReportStatus.PENDING_APPROVAL,
        user_id: 5,
      };
      const createdReport = makeReport({ ...reportData, id: 1 });
      prismaMock.report.create.mockResolvedValue(createdReport);

      const res = await reportRepository.create(reportData);

      expect(prismaMock.report.create).toHaveBeenCalledWith({
        data: {
          latitude: 45.072,
          longitude: 7.682,
          title: "Buche in via Roma",
          description: "Buca profonda vicino al numero 12",
          category: "ROAD_DAMAGE" as any,
          photos: ["p1", "p2"],
          status: ReportStatus.PENDING_APPROVAL,
          assignedOffice: undefined,
          anonymous: false,
          user: {
            connect: { id: 5 },
          },
        },
      });
      expect(res).toBe(createdReport);
    });
  });

  // -------- deleteById --------
  describe("deleteById", () => {
    it("delete the report and return the deleted report", async () => {
      const deleted = makeReport({ id: 7 });
      prismaMock.report.delete.mockResolvedValue(deleted);

      const res = await reportRepository.deleteById(7);

      expect(prismaMock.report.delete).toHaveBeenCalledWith({
        where: { id: 7 },
      });
      expect(res).toBe(deleted);
    });
  });

  describe("findAssignedReportsForOfficer", () => {
    it("returns reports assigned to the specified officer ID", async () => {
      const rows = [
        makeReport({ id: 3, assignedOfficerId: 1 }),
        makeReport({ id: 4, assignedOfficerId: 1 }),
      ];
      prismaMock.report.findMany.mockResolvedValue(rows);

      const res = await reportRepository.findAssignedReportsForOfficer(1);

      expect(prismaMock.report.findMany).toHaveBeenCalledWith({
        where: { assignedOfficerId: 1 },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          externalMaintainer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      expect(res).toBe(rows);
    });

    it("filters by officer ID and status when provided", async () => {
      const rows = [
        makeReport({
          id: 8,
          assignedOfficerId: 2,
          status: ReportStatus.ASSIGNED,
        }),
      ];
      prismaMock.report.findMany.mockResolvedValue(rows);

      const res = await reportRepository.findAssignedReportsForOfficer(
        2,
        ReportStatus.ASSIGNED,
      );

      expect(prismaMock.report.findMany).toHaveBeenCalledWith({
        where: { assignedOfficerId: 2, status: ReportStatus.ASSIGNED },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          externalMaintainer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      expect(res).toBe(rows);
    });

    it("returns an empty array when no reports are found", async () => {
      prismaMock.report.findMany.mockResolvedValue([]);

      const res = await reportRepository.findAssignedReportsForOfficer(3);

      expect(prismaMock.report.findMany).toHaveBeenCalledWith({
        where: { assignedOfficerId: 3 },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          externalMaintainer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      expect(res).toEqual([]);
    });
  });

  // -------- findByExternalMaintainerId --------
  describe("findByExternalMaintainerId", () => {
    it("should find all reports assigned to external maintainer", async () => {
      const maintainerId = 1;
      const reports = [
        makeReport({ id: 1, externalMaintainerId: maintainerId }),
        makeReport({ id: 2, externalMaintainerId: maintainerId }),
      ];
      prismaMock.report.findMany.mockResolvedValue(reports);

      const res =
        await reportRepository.findByExternalMaintainerId(maintainerId);

      expect(prismaMock.report.findMany).toHaveBeenCalledWith({
        where: { externalMaintainerId: maintainerId },
      });
      expect(res).toEqual(reports);
    });

    it("should return empty array when no reports found", async () => {
      prismaMock.report.findMany.mockResolvedValue([]);

      const res = await reportRepository.findByExternalMaintainerId(999);

      expect(res).toEqual([]);
    });
  });

  // ---------- addCommentToReport / getCommentsByReportId ----------
  describe("comment persistence", () => {
    it("addCommentToReport calls prisma.comment.create with proper data", async () => {
      const created = {
        id: 10,
        reportId: 2,
        content: "c",
        municipality_user_id: 3,
        external_maintainer_id: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const prismaMock = prisma as any;
      prismaMock.comment = prismaMock.comment || {};
      prismaMock.comment.create = jest.fn().mockResolvedValue(created);

      const reportRepository =
        require("@repositories/reportRepository").default;

      const res = await reportRepository.addCommentToReport({
        reportId: 2,
        content: "c",
        municipality_user_id: 3,
        external_maintainer_id: null,
      });

      expect(prismaMock.comment.create).toHaveBeenCalledWith({
        data: {
          reportId: 2,
          content: "c",
          municipality_user_id: 3,
          external_maintainer_id: null,
        },
      });
      expect(res).toBe(created);
    });

    it("getCommentsByReportId calls prisma.comment.findMany and orders by createdAt asc", async () => {
      const prismaMock = prisma as any;
      prismaMock.comment = prismaMock.comment || {};
      prismaMock.comment.findMany = jest.fn().mockResolvedValue([]);

      const reportRepository =
        require("@repositories/reportRepository").default;
      const res = await reportRepository.getCommentsByReportId(5);

      expect(prismaMock.comment.findMany).toHaveBeenCalledWith({
        where: { reportId: 5 },
        orderBy: { createdAt: "asc" },
      });
      expect(Array.isArray(res)).toBe(true);
    });

    it("getMunicipalityUserUnreadCommentsByReportId calls prisma.comment.findMany with correct where clause", async () => {
      const prismaMock = prisma as any;
      prismaMock.comment = prismaMock.comment || {};
      prismaMock.comment.findMany = jest.fn().mockResolvedValue([]);

      const reportRepository =
        require("@repositories/reportRepository").default;
      const res = await reportRepository.getMunicipalityUserUnreadCommentsByReportId(5);

      expect(prismaMock.comment.findMany).toHaveBeenCalledWith({
        where: {
          reportId: 5,
          read: false,
          municipality_user_id: null,
        },
        orderBy: { createdAt: "asc" },
      });
      expect(Array.isArray(res)).toBe(true);
    });

    it("getExternalMaintainerUnreadCommentsByReportId calls prisma.comment.findMany with correct where clause", async () => {
      const prismaMock = prisma as any;
      prismaMock.comment = prismaMock.comment || {};
      prismaMock.comment.findMany = jest.fn().mockResolvedValue([]);

      const reportRepository =
        require("@repositories/reportRepository").default;
      const res = await reportRepository.getExternalMaintainerUnreadCommentsByReportId(5);

      expect(prismaMock.comment.findMany).toHaveBeenCalledWith({
        where: {
          reportId: 5,
          read: false,
          external_maintainer_id: null,
        },
        orderBy: { createdAt: "asc" },
      });
      expect(Array.isArray(res)).toBe(true);
    });

    it("markExternalMaintainerCommentsAsRead calls prisma.comment.updateMany", async () => {
      const prismaMock = prisma as any;
      prismaMock.comment = prismaMock.comment || {};
      prismaMock.comment.updateMany = jest.fn().mockResolvedValue({ count: 2 });

      const reportRepository =
        require("@repositories/reportRepository").default;
      const res = await reportRepository.markExternalMaintainerCommentsAsRead(5);

      expect(prismaMock.comment.updateMany).toHaveBeenCalledWith({
        where: {
          reportId: 5,
          read: false,
          municipality_user_id: null,
        },
        data: {
          read: true,
        },
      });
      expect(res).toEqual({ count: 2 });
    });

    it("markMunicipalityCommentsAsRead calls prisma.comment.updateMany", async () => {
      const prismaMock = prisma as any;
      prismaMock.comment = prismaMock.comment || {};
      prismaMock.comment.updateMany = jest.fn().mockResolvedValue({ count: 1 });

      const reportRepository =
        require("@repositories/reportRepository").default;
      const res = await reportRepository.markMunicipalityCommentsAsRead(5);

      expect(prismaMock.comment.updateMany).toHaveBeenCalledWith({
        where: {
          reportId: 5,
          read: false,
          external_maintainer_id: null,
        },
        data: {
          read: true,
        },
      });
      expect(res).toEqual({ count: 1 });
    });

    // -------- findByBoundingBox --------
    describe("findByBoundingBox", () => {
      it("returns reports within bounding box with correct coordinates filter", async () => {
        const mockReports = [
          makeReport({
            id: 1,
            latitude: 45.065,
            longitude: 7.67,
          }),
          makeReport({
            id: 2,
            latitude: 45.068,
            longitude: 7.672,
          }),
        ];
        prismaMock.report.findMany.mockResolvedValue(mockReports);

        const bbox = {
          minLng: 7.66,
          minLat: 45.06,
          maxLng: 7.675,
          maxLat: 45.07,
        };

        const result = await reportRepository.findByBoundingBox(bbox, {
          statuses: [ReportStatus.ASSIGNED, ReportStatus.IN_PROGRESS],
        });

        expect(prismaMock.report.findMany).toHaveBeenCalledWith({
          where: {
            longitude: {
              gte: 7.66,
              lte: 7.675,
            },
            latitude: {
              gte: 45.06,
              lte: 45.07,
            },
            status: {
              in: ["ASSIGNED", "IN_PROGRESS"],
            },
          },
          orderBy: { createdAt: "desc" },
        });
        expect(result).toHaveLength(2);
        expect(result[0].id).toBe(1);
        expect(result[1].id).toBe(2);
      });

      it("returns empty array when no reports in bbox", async () => {
        prismaMock.report.findMany.mockResolvedValue([]);

        const bbox = {
          minLng: 7.66,
          minLat: 45.06,
          maxLng: 7.675,
          maxLat: 45.07,
        };

        const result = await reportRepository.findByBoundingBox(bbox, {
          statuses: [ReportStatus.ASSIGNED],
        });

        expect(result).toEqual([]);
        expect(prismaMock.report.findMany).toHaveBeenCalled();
      });

      it("correctly filters by multiple statuses", async () => {
        const mockReports = [
          makeReport({ id: 1, status: "ASSIGNED" }),
          makeReport({ id: 2, status: "IN_PROGRESS" }),
          makeReport({ id: 3, status: "RESOLVED" }),
        ];
        prismaMock.report.findMany.mockResolvedValue(mockReports);

        const bbox = {
          minLng: -180,
          minLat: -90,
          maxLng: 180,
          maxLat: 90,
        };

        const statuses = ["ASSIGNED", "IN_PROGRESS", "RESOLVED"];

        const result = await reportRepository.findByBoundingBox(bbox, {
          statuses: statuses as any,
        });

        expect(prismaMock.report.findMany).toHaveBeenCalledWith({
          where: {
            longitude: {
              gte: -180,
              lte: 180,
            },
            latitude: {
              gte: -90,
              lte: 90,
            },
            status: {
              in: statuses,
            },
          },
          orderBy: { createdAt: "desc" },
        });
        expect(result).toHaveLength(3);
      });

      it("orders results by createdAt in descending order", async () => {
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

        const mockReports = [
          makeReport({ id: 1, createdAt: now }),
          makeReport({ id: 2, createdAt: yesterday }),
          makeReport({ id: 3, createdAt: twoDaysAgo }),
        ];
        prismaMock.report.findMany.mockResolvedValue(mockReports);

        const bbox = {
          minLng: 7.66,
          minLat: 45.06,
          maxLng: 7.675,
          maxLat: 45.07,
        };

        const result = await reportRepository.findByBoundingBox(bbox, {
          statuses: [ReportStatus.ASSIGNED],
        });

        expect(prismaMock.report.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            orderBy: { createdAt: "desc" },
          }),
        );
        expect(result[0].id).toBe(1); // Most recent
        expect(result[1].id).toBe(2);
        expect(result[2].id).toBe(3); // Oldest
      });

      it("handles negative coordinates correctly", async () => {
        const mockReports = [
          makeReport({
            id: 1,
            latitude: -33.5,
            longitude: -151.5,
          }),
        ];
        prismaMock.report.findMany.mockResolvedValue(mockReports);

        const bbox = {
          minLng: -152,
          minLat: -34,
          maxLng: -151,
          maxLat: -33,
        };

        const result = await reportRepository.findByBoundingBox(bbox, {
          statuses: [ReportStatus.ASSIGNED],
        });

        expect(prismaMock.report.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              longitude: {
                gte: -152,
                lte: -151,
              },
              latitude: {
                gte: -34,
                lte: -33,
              },
            }),
          }),
        );
        expect(result).toHaveLength(1);
      });

      it("handles floating point coordinates with high precision", async () => {
        const mockReports = [
          makeReport({
            id: 1,
            latitude: 45.06501234,
            longitude: 7.67012345,
          }),
        ];
        prismaMock.report.findMany.mockResolvedValue(mockReports);

        const bbox = {
          minLng: 7.6701,
          minLat: 45.065,
          maxLng: 7.6702,
          maxLat: 45.0651,
        };

        const result = await reportRepository.findByBoundingBox(bbox, {
          statuses: [ReportStatus.ASSIGNED],
        });

        expect(prismaMock.report.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              longitude: {
                gte: 7.6701,
                lte: 7.6702,
              },
              latitude: {
                gte: 45.065,
                lte: 45.0651,
              },
            }),
          }),
        );
        expect(result).toHaveLength(1);
      });

      it("throws error when database query fails", async () => {
        prismaMock.report.findMany.mockRejectedValue(
          new Error("Database connection failed"),
        );

        const bbox = {
          minLng: 7.66,
          minLat: 45.06,
          maxLng: 7.675,
          maxLat: 45.07,
        };

        await expect(
          reportRepository.findByBoundingBox(bbox, { statuses: [ReportStatus.ASSIGNED] }),
        ).rejects.toThrow("Database connection failed");
      });

      it("handles world-wide bounding box", async () => {
        const mockReports = [
          makeReport({ id: 1, latitude: 45, longitude: 7 }),
          makeReport({ id: 2, latitude: -33, longitude: 151 }),
          makeReport({ id: 3, latitude: 40, longitude: -74 }),
        ];
        prismaMock.report.findMany.mockResolvedValue(mockReports);

        const bbox = {
          minLng: -180,
          minLat: -90,
          maxLng: 180,
          maxLat: 90,
        };

        const result = await reportRepository.findByBoundingBox(bbox, {
          statuses: [ReportStatus.ASSIGNED, ReportStatus.IN_PROGRESS],
        });

        expect(prismaMock.report.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              longitude: {
                gte: -180,
                lte: 180,
              },
              latitude: {
                gte: -90,
                lte: 90,
              },
            }),
          }),
        );
        expect(result).toHaveLength(3);
      });

      it("returns reports with all expected fields", async () => {
        const mockReports = [
          makeReport({
            id: 42,
            latitude: 45.065,
            longitude: 7.67,
            title: "Test Report",
            category: "WASTE",
          }),
        ];
        prismaMock.report.findMany.mockResolvedValue(mockReports);

        const bbox = {
          minLng: 7.66,
          minLat: 45.06,
          maxLng: 7.675,
          maxLat: 45.07,
        };

        const result = await reportRepository.findByBoundingBox(bbox, {
          statuses: [ReportStatus.ASSIGNED],
        });

        expect(result[0]).toHaveProperty("id", 42);
        expect(result[0]).toHaveProperty("latitude");
        expect(result[0]).toHaveProperty("longitude");
        expect(result[0]).toHaveProperty("title");
        expect(result[0]).toHaveProperty("category");
      });
    });
  });

  describe("retrieve report for the map", () => {
    const expectedQuery = {
      where: {
        OR: [
          { status: ReportStatus.ASSIGNED },
          { status: ReportStatus.IN_PROGRESS },
          { status: ReportStatus.SUSPENDED },
          { status: ReportStatus.RESOLVED },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        externalMaintainer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    };

    it("calls prisma.findMany with approved statuses + include + orderBy and returns results", async () => {
      const rows = [
        makeReport({ id: 1, status: ReportStatus.ASSIGNED }),
        makeReport({ id: 2, status: ReportStatus.RESOLVED }),
      ];

      prismaMock.report.findMany.mockResolvedValue(rows);

      const res = await reportRepository.findAllForMapView();

      expect(prismaMock.report.findMany).toHaveBeenCalledTimes(1);
      expect(prismaMock.report.findMany).toHaveBeenCalledWith(expectedQuery);
      expect(res).toBe(rows);
    });

    it("returns empty array when prisma returns no rows", async () => {
      prismaMock.report.findMany.mockResolvedValue([]);

      const res = await reportRepository.findAllForMapView();

      expect(prismaMock.report.findMany).toHaveBeenCalledTimes(1);
      expect(prismaMock.report.findMany).toHaveBeenCalledWith(expectedQuery);
      expect(res).toEqual([]);
    });
  });
});
