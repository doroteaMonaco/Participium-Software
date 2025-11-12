jest.mock("../../../repositories/reportRepository", () => {
  const mRepo = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    deleteById: jest.fn(),
  };
  return { __esModule: true, default: mRepo };
});

import reportService from "../../../services/reportService";
import reportRepository from "../../../repositories/reportRepository";

type RepoMock = {
  findAll: jest.Mock;
  findById: jest.Mock;
  create: jest.Mock;
  deleteById: jest.Mock;
};

const repo = reportRepository as unknown as RepoMock;

const makeReport = (overrides: Partial<any> = {}) => ({
  id: 1,
  createdAt: new Date("2025-11-04T14:30:00Z"),
  ...overrides,
});

const makeCreateDto = (overrides: Partial<any> = {}) => ({
  ...overrides,
});

describe("reportService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------- findAll --------
  describe("findAll", () => {
    it("returns all reports from repository", async () => {
      const rows = [makeReport({ id: 2 }), makeReport({ id: 1 })];
      repo.findAll.mockResolvedValue(rows);

      const res = await reportService.findAll();

      expect(repo.findAll).toHaveBeenCalledTimes(1);
      expect(res).toBe(rows);
    });
  });

  // -------- findById --------
  describe("findById", () => {
    it("returns the report when found", async () => {
      const row = makeReport({ id: 42 });
      repo.findById.mockResolvedValue(row);

      const res = await reportService.findById(42);

      expect(repo.findById).toHaveBeenCalledWith(42);
      expect(res).toBe(row);
    });

    it("returns null when report does not exist", async () => {
      repo.findById.mockResolvedValue(null);

      const res = await reportService.findById(999);

      expect(repo.findById).toHaveBeenCalledWith(999);
      expect(res).toBeNull();
    });
  });

  // -------- submitReport --------
  describe("submitReport", () => {
    it("passes the dto to repository.create and returns the created report", async () => {
      const dto = makeCreateDto({}); // empty is fine with your current model
      const created = makeReport({ id: 10 });
      repo.create.mockResolvedValue(created);

      const res = await reportService.submitReport(dto as any);

      expect(repo.create).toHaveBeenCalledWith(dto);
      expect(res).toBe(created);
    });
  });

  // -------- deleteReport --------
  describe("deleteReport", () => {
    it("calls repository.deleteById with id and returns deleted report", async () => {
      const deleted = makeReport({ id: 7 });
      repo.deleteById.mockResolvedValue(deleted);

      const res = await reportService.deleteReport(7);

      expect(repo.deleteById).toHaveBeenCalledWith(7);
      expect(res).toBe(deleted);
    });

    it("propagates repository errors", async () => {
      const err = new Error("delete fail");
      repo.deleteById.mockRejectedValue(err);

      await expect(reportService.deleteReport(3)).rejects.toBe(err);
    });
  });
});
