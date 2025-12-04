import imageService from "@services/imageService";

jest.mock("@redis", () => ({
  redisClient: {
    setex: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  },
}));

jest.mock("fs", () => ({
  promises: {
    writeFile: jest.fn(),
    readFile: jest.fn(),
    unlink: jest.fn(),
    readdir: jest.fn(),
    rmdir: jest.fn(),
  },
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

jest.mock("path", () => ({
  join: jest.fn((...args) => {
    if (args[0] === process.cwd() && args[1] === "uploads") {
      return "uploads";
    }
    return args.join("/");
  }),
  extname: jest.fn((file) => `.${file.split(".").pop()}`),
}));

jest.mock("crypto", () => ({
  randomUUID: jest.fn(() => "test-uuid"),
}));

describe("ImageService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset all mocks
    (require("fs").existsSync as jest.Mock).mockReset();
    (require("fs").promises.readFile as jest.Mock).mockReset();
    (require("fs").promises.writeFile as jest.Mock).mockReset();
    (require("fs").promises.unlink as jest.Mock).mockReset();
    (require("fs").promises.readdir as jest.Mock).mockReset();
    (require("fs").promises.rmdir as jest.Mock).mockReset();
    (require("fs").mkdirSync as jest.Mock).mockReset();
    (require("@redis").redisClient.setex as jest.Mock).mockReset();
    (require("@redis").redisClient.get as jest.Mock).mockReset();
    (require("@redis").redisClient.set as jest.Mock).mockReset();
    (require("@redis").redisClient.del as jest.Mock).mockReset();
    (require("path").join as jest.Mock).mockImplementation((...args) => {
      if (args[0] === process.cwd() && args[1] === "uploads") {
        return "uploads";
      }
      return args.join("/");
    });
    (require("path").extname as jest.Mock).mockImplementation(
      (file) => `.${file.split(".").pop()}`,
    );
    (require("crypto").randomUUID as jest.Mock).mockReturnValue("test-uuid");
  });

  describe("preloadCache", () => {
    it("should preload cache for multiple images", async () => {
      const relativePaths = ["report1/image1.jpg", "report1/image2.jpg"];

      // Mock fs.existsSync to return true so getImage doesn't warn
      (require("fs").existsSync as jest.Mock).mockReturnValue(true);
      // Mock fs.promises.readFile to return buffer
      (require("fs").promises.readFile as jest.Mock).mockResolvedValue(
        Buffer.from("test"),
      );
      // Mock redis get to return null (not cached)
      (require("@redis").redisClient.get as jest.Mock).mockResolvedValue(null);
      // Mock redis set
      (require("@redis").redisClient.set as jest.Mock).mockResolvedValue("OK");

      await imageService.preloadCache(relativePaths);

      // Verify that readFile was called for each image
      expect(require("fs").promises.readFile).toHaveBeenCalledTimes(2);
      expect(require("fs").promises.readFile).toHaveBeenCalledWith(
        "uploads/report1/image1.jpg",
      );
      expect(require("fs").promises.readFile).toHaveBeenCalledWith(
        "uploads/report1/image2.jpg",
      );
    });

    it("should handle empty array", async () => {
      await imageService.preloadCache([]);

      expect(require("fs").promises.readFile).not.toHaveBeenCalled();
    });
  });

  describe("getImageUrl", () => {
    it("should return correct URL for relative path", () => {
      const result = imageService.getImageUrl("report1/image.jpg");
      expect(result).toBe("/uploads/report1/image.jpg");
    });
  });

  describe("getMultipleImageUrls", () => {
    it("should return URLs for multiple paths", () => {
      const paths = ["report1/image1.jpg", "report2/image2.jpg"];
      const result = imageService.getMultipleImageUrls(paths);

      expect(result).toEqual([
        "/uploads/report1/image1.jpg",
        "/uploads/report2/image2.jpg",
      ]);
    });

    it("should handle empty array", () => {
      const result = imageService.getMultipleImageUrls([]);
      expect(result).toEqual([]);
    });
  });
});
