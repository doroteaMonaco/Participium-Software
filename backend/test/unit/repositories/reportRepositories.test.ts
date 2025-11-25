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
        orderBy: { createdAt: "desc" },
      });
      expect(res).toBe(rows);
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
});
