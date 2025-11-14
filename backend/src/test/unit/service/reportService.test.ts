jest.mock("../../../repositories/reportRepository", () => {
  const mRepo = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    deleteById: jest.fn(),
    update: jest.fn(), // NEW
  };
  return { __esModule: true, default: mRepo };
});

jest.mock("../../../services/imageService", () => {
  const mImage = {
    persistImagesForReport: jest.fn(),
    getMultipleImages: jest.fn(),
    deleteImages: jest.fn(),
  };
  return { __esModule: true, default: mImage };
});

import reportService from "../../../services/reportService";
import reportRepository from "../../../repositories/reportRepository";
import imageService from "../../../services/imageService";

type RepoMock = {
  findAll: jest.Mock;
  findById: jest.Mock;
  create: jest.Mock;
  deleteById: jest.Mock;
  update: jest.Mock;
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
  latitude: 45.10,
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

  // -------- submitReport (short-circuit path) --------
  describe("submitReport", () => {
    it("when dto is empty, delegates to repo.create and returns created", async () => {
      const dto = {} as any; // percorso 'short-circuit' nel service
      const created = makeReport({ id: 10 });
      repo.create.mockResolvedValue(created);

      const res = await reportService.submitReport(dto);

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
      img.persistImagesForReport.mockResolvedValue(["/img/r/1.jpg", "/img/r/2.jpg"]);
      repo.update.mockResolvedValue({ ...created, photos: ["/img/r/1.jpg", "/img/r/2.jpg"] });
      img.getMultipleImages.mockResolvedValue(["BINARY1", "BINARY2"]);

      const res = await reportService.submitReport(dto as any);

      expect(repo.create).toHaveBeenCalledWith({
        ...dto,
        photoKeys: [],
      });

      expect(img.persistImagesForReport).toHaveBeenCalledWith(dto.photoKeys, 123);
      expect(repo.update).toHaveBeenCalledWith(123, { photos: ["/img/r/1.jpg", "/img/r/2.jpg"] });
      expect(img.getMultipleImages).toHaveBeenCalledWith(["/img/r/1.jpg", "/img/r/2.jpg"]);
      expect(res).toEqual(
        expect.objectContaining({
          id: 123,
          photos: ["BINARY1", "BINARY2"],
        }),
      );
    });

    it("throws if missing required fields", async () => {
      await expect(
        reportService.submitReport(makeCreateDto({ title: "   " }) as any),
      ).rejects.toThrow("Title is required");

      await expect(
        reportService.submitReport(makeCreateDto({ description: "" }) as any),
      ).rejects.toThrow("Description is required");

      await expect(
        reportService.submitReport(makeCreateDto({ category: undefined }) as any),
      ).rejects.toThrow("Category is required");

      await expect(
        reportService.submitReport(makeCreateDto({ photoKeys: [] }) as any),
      ).rejects.toThrow("At least 1 photo is required");

      await expect(
        reportService.submitReport(makeCreateDto({ photoKeys: ["a", "b", "c", "d"] }) as any),
      ).rejects.toThrow("Maximum 3 photos are allowed");
    });
  });

  // -------- deleteReport --------
  describe("deleteReport", () => {
    it("calls repo.deleteById and imageService.deleteImages (with photos) and returns the deleted report", async () => {
      const deleted = makeReport({ id: 7, photos: ["pA", "pB"] });
      repo.deleteById.mockResolvedValue(deleted);
      img.deleteImages.mockResolvedValue(undefined);

      const res = await reportService.deleteReport(7);

      expect(repo.deleteById).toHaveBeenCalledWith(7);
      expect(img.deleteImages).toHaveBeenCalledWith(["pA", "pB"]);
      expect(res).toBe(deleted);
    });

    it("calls deleteImages with [] when report has no photos", async () => {
      const deleted = makeReport({ id: 8, photos: undefined });
      repo.deleteById.mockResolvedValue(deleted);

      await reportService.deleteReport(8);

      expect(img.deleteImages).toHaveBeenCalledWith([]);
    });

    it("propagates repository errors", async () => {
      const err = new Error("delete fail");
      repo.deleteById.mockRejectedValue(err);

      await expect(reportService.deleteReport(3)).rejects.toBe(err);
      expect(img.deleteImages).not.toHaveBeenCalled();
    });
  });
});
