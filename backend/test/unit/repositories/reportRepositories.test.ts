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
          OR: [
            { user_id: 5 },
            { status: "ASSIGNED" },
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

      const res = await reportRepository.findByExternalMaintainerId(
        maintainerId,
      );

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
});
