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

  describe("storeTemporaryImages", () => {
    it("should store images in Redis", async () => {
      const images: any[] = [
        {
          buffer: Buffer.from("test_data"),
          mimetype: "image/jpeg",
          originalname: "test.jpg",
        },
      ];

      (require("@redis").redisClient.setex as jest.Mock).mockResolvedValue(
        "OK",
      );

      const result = await imageService.storeTemporaryImages(images);

      expect(result).toHaveLength(1);
      expect(
        require("@redis").redisClient.setex,
      ).toHaveBeenCalledWith(
        expect.stringContaining("temp:image:"),
        60 * 60 * 24,
        expect.any(String),
      );
    });

    it("should handle Redis setex failure", async () => {
      const images: any[] = [
        {
          buffer: Buffer.from("test_data"),
          mimetype: "image/jpeg",
          originalname: "test.jpg",
        },
      ];

      (require("@redis").redisClient.setex as jest.Mock).mockRejectedValue(
        new Error("Redis error"),
      );
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      const result = await imageService.storeTemporaryImages(images);

      expect(result).toHaveLength(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to store temporary image in Redis"),
      );
      consoleSpy.mockRestore();
    });

    it("should handle multiple images", async () => {
      const images: any[] = [
        {
          buffer: Buffer.from("test1"),
          mimetype: "image/jpeg",
          originalname: "test1.jpg",
        },
        {
          buffer: Buffer.from("test2"),
          mimetype: "image/png",
          originalname: "test2.png",
        },
      ];

      (require("@redis").redisClient.setex as jest.Mock).mockResolvedValue(
        "OK",
      );

      const result = await imageService.storeTemporaryImages(images);

      expect(result).toHaveLength(2);
    });
  });

  describe("persistImagesForReport", () => {
    it("should persist images for report", async () => {
      (require("fs").existsSync as jest.Mock).mockReturnValue(false);
      (require("fs").mkdirSync as jest.Mock).mockReturnValue(undefined);
      (require("fs").promises.writeFile as jest.Mock).mockResolvedValue(
        undefined,
      );
      (require("@redis").redisClient.get as jest.Mock).mockResolvedValue(
        JSON.stringify({
          buffer: "dGVzdF9kYXRh",
          mimetype: "image/jpeg",
          originalname: "test.jpg",
        }),
      );
      (require("@redis").redisClient.set as jest.Mock).mockResolvedValue("OK");
      (require("@redis").redisClient.del as jest.Mock).mockResolvedValue(1);

      const tempKeys = ["temp:image:test-uuid"];
      const result = await imageService.persistImagesForReport(tempKeys, 123);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe("123/123_1.jpeg");
      expect(require("fs").promises.writeFile).toHaveBeenCalled();
    });

    it("should create dummy image when Redis get fails", async () => {
      (require("fs").existsSync as jest.Mock).mockReturnValue(false);
      (require("fs").mkdirSync as jest.Mock).mockReturnValue(undefined);
      (require("fs").promises.writeFile as jest.Mock).mockResolvedValue(
        undefined,
      );
      (require("@redis").redisClient.get as jest.Mock).mockResolvedValue(null);
      (require("@redis").redisClient.set as jest.Mock).mockResolvedValue("OK");
      (require("@redis").redisClient.del as jest.Mock).mockResolvedValue(1);
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      const tempKeys = ["temp:image:test-uuid"];
      const result = await imageService.persistImagesForReport(tempKeys, 123);

      expect(result).toHaveLength(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Temporary image not found"),
      );
      consoleSpy.mockRestore();
    });

    it("should handle Redis get error gracefully", async () => {
      (require("fs").existsSync as jest.Mock).mockReturnValue(false);
      (require("fs").mkdirSync as jest.Mock).mockReturnValue(undefined);
      (require("fs").promises.writeFile as jest.Mock).mockResolvedValue(
        undefined,
      );
      (require("@redis").redisClient.get as jest.Mock).mockRejectedValue(
        new Error("Redis error"),
      );
      (require("@redis").redisClient.set as jest.Mock).mockResolvedValue("OK");
      (require("@redis").redisClient.del as jest.Mock).mockResolvedValue(1);
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      const tempKeys = ["temp:image:test-uuid"];
      const result = await imageService.persistImagesForReport(tempKeys, 123);

      expect(result).toHaveLength(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to get temporary image from Redis"),
      );
      consoleSpy.mockRestore();
    });

    it("should handle Redis cache failure", async () => {
      (require("fs").existsSync as jest.Mock).mockReturnValue(false);
      (require("fs").mkdirSync as jest.Mock).mockReturnValue(undefined);
      (require("fs").promises.writeFile as jest.Mock).mockResolvedValue(
        undefined,
      );
      (require("@redis").redisClient.get as jest.Mock).mockResolvedValue(
        JSON.stringify({
          buffer: "dGVzdF9kYXRh",
          mimetype: "image/jpeg",
          originalname: "test.jpg",
        }),
      );
      (require("@redis").redisClient.set as jest.Mock).mockRejectedValue(
        new Error("Cache error"),
      );
      (require("@redis").redisClient.del as jest.Mock).mockResolvedValue(1);
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      const tempKeys = ["temp:image:test-uuid"];
      const result = await imageService.persistImagesForReport(tempKeys, 123);

      expect(result).toHaveLength(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to cache image in Redis"),
      );
      consoleSpy.mockRestore();
    });

    it("should handle Redis del failure", async () => {
      (require("fs").existsSync as jest.Mock).mockReturnValue(false);
      (require("fs").mkdirSync as jest.Mock).mockReturnValue(undefined);
      (require("fs").promises.writeFile as jest.Mock).mockResolvedValue(
        undefined,
      );
      (require("@redis").redisClient.get as jest.Mock).mockResolvedValue(
        JSON.stringify({
          buffer: "dGVzdF9kYXRh",
          mimetype: "image/jpeg",
          originalname: "test.jpg",
        }),
      );
      (require("@redis").redisClient.set as jest.Mock).mockResolvedValue("OK");
      (require("@redis").redisClient.del as jest.Mock).mockRejectedValue(
        new Error("Del error"),
      );
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      const tempKeys = ["temp:image:test-uuid"];
      const result = await imageService.persistImagesForReport(tempKeys, 123);

      expect(result).toHaveLength(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to delete temporary key from Redis"),
      );
      consoleSpy.mockRestore();
    });
  });

  describe("persistUserImage", () => {
    it("should persist user image", async () => {
      (require("@redis").redisClient.get as jest.Mock).mockResolvedValue(
        JSON.stringify({
          buffer: "dGVzdF9kYXRh",
          mimetype: "image/jpeg",
          originalname: "test.jpg",
        }),
      );
      (require("fs").promises.readdir as jest.Mock).mockResolvedValue([]);
      (require("fs").promises.writeFile as jest.Mock).mockResolvedValue(
        undefined,
      );
      (require("@redis").redisClient.set as jest.Mock).mockResolvedValue("OK");
      (require("@redis").redisClient.del as jest.Mock).mockResolvedValue(1);

      const result = await imageService.persistUserImage("temp:image:uuid", 42);

      expect(result).toBe("user_42.jpeg");
      expect(require("fs").promises.writeFile).toHaveBeenCalled();
    });

    it("should delete old profile image if exists", async () => {
      (require("@redis").redisClient.get as jest.Mock).mockResolvedValue(
        JSON.stringify({
          buffer: "dGVzdF9kYXRh",
          mimetype: "image/jpeg",
          originalname: "test.jpg",
        }),
      );
      (require("fs").promises.readdir as jest.Mock).mockResolvedValue([
        "user_42.png",
      ]);
      (require("fs").promises.unlink as jest.Mock).mockResolvedValue(undefined);
      (require("fs").promises.writeFile as jest.Mock).mockResolvedValue(
        undefined,
      );
      (require("@redis").redisClient.set as jest.Mock).mockResolvedValue("OK");
      (require("@redis").redisClient.del as jest.Mock).mockResolvedValue(1);
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      await imageService.persistUserImage("temp:image:uuid", 42);

      expect(require("fs").promises.unlink).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Deleted old profile image"),
      );
      consoleSpy.mockRestore();
    });

    it("should throw error if temporary image not found", async () => {
      (require("@redis").redisClient.get as jest.Mock).mockResolvedValue(null);

      await expect(
        imageService.persistUserImage("temp:image:uuid", 42),
      ).rejects.toThrow("Temporary image not found");
    });
  });

  describe("getImage", () => {
    it("should return cached image", async () => {
      (require("@redis").redisClient.get as jest.Mock).mockResolvedValue(
        JSON.stringify({
          buffer: "dGVzdF9kYXRh",
          mimetype: "image/jpeg",
        }),
      );

      const result = await imageService.getImage("report1/image.jpg");

      expect(result).toBe("data:image/jpeg;base64,dGVzdF9kYXRh");
    });

    it("should load from filesystem if not cached", async () => {
      (require("@redis").redisClient.get as jest.Mock).mockResolvedValue(null);
      (require("fs").existsSync as jest.Mock).mockReturnValue(true);
      (require("fs").promises.readFile as jest.Mock).mockResolvedValue(
        Buffer.from("test_data"),
      );
      (require("@redis").redisClient.set as jest.Mock).mockResolvedValue("OK");

      const result = await imageService.getImage("report1/image.jpg");

      expect(result).toContain("data:image/jpg;base64,");
      expect(require("fs").promises.readFile).toHaveBeenCalled();
    });

    it("should return null if file not found", async () => {
      (require("@redis").redisClient.get as jest.Mock).mockResolvedValue(null);
      (require("fs").existsSync as jest.Mock).mockReturnValue(false);
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      const result = await imageService.getImage("report1/image.jpg");

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Image not found"),
      );
      consoleSpy.mockRestore();
    });

    it("should handle user images", async () => {
      (require("@redis").redisClient.get as jest.Mock).mockResolvedValue(null);
      (require("fs").existsSync as jest.Mock).mockReturnValue(true);
      (require("fs").promises.readFile as jest.Mock).mockResolvedValue(
        Buffer.from("user_data"),
      );
      (require("@redis").redisClient.set as jest.Mock).mockResolvedValue("OK");

      const result = await imageService.getImage("user_42.jpg", true);

      expect(result).toContain("data:image/jpg;base64,");
    });
  });

  describe("getMultipleImages", () => {
    it("should get multiple images", async () => {
      (require("@redis").redisClient.get as jest.Mock).mockResolvedValue(
        JSON.stringify({
          buffer: "dGVzdF9kYXRh",
          mimetype: "image/jpeg",
        }),
      );

      const result = await imageService.getMultipleImages([
        "report1/image1.jpg",
        "report1/image2.jpg",
      ]);

      expect(result).toHaveLength(2);
    });

    it("should filter out null images", async () => {
      (require("@redis").redisClient.get as jest.Mock).mockResolvedValue(null);
      (require("fs").existsSync as jest.Mock)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);
      (require("fs").promises.readFile as jest.Mock).mockResolvedValue(
        Buffer.from("test"),
      );
      (require("@redis").redisClient.set as jest.Mock).mockResolvedValue("OK");

      const result = await imageService.getMultipleImages([
        "report1/image1.jpg",
        "report1/image2.jpg",
      ]);

      expect(result).toHaveLength(1);
    });
  });

  describe("deleteImages", () => {
    it("should return early for empty array", async () => {
      await imageService.deleteImages([]);

      expect(require("fs").existsSync).not.toHaveBeenCalled();
    });

    it("should return early for null", async () => {
      await imageService.deleteImages(null as any);

      expect(require("fs").existsSync).not.toHaveBeenCalled();
    });

    it("should delete images from filesystem and cache", async () => {
      (require("fs").existsSync as jest.Mock).mockReturnValue(true);
      (require("fs").promises.unlink as jest.Mock).mockResolvedValue(
        undefined,
      );
      (require("@redis").redisClient.del as jest.Mock).mockResolvedValue(1);
      (require("fs").promises.readdir as jest.Mock).mockResolvedValue([
        "123_1.jpg",
      ]);
      (require("fs").promises.rmdir as jest.Mock).mockResolvedValue(undefined);
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      await imageService.deleteImages(["123/123_1.jpg"]);

      expect(require("fs").promises.unlink).toHaveBeenCalled();
      expect(require("@redis").redisClient.del).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Deleted image"),
      );
      consoleSpy.mockRestore();
    });

    it("should clean up empty directories", async () => {
      (require("fs").existsSync as jest.Mock).mockReturnValue(true);
      (require("fs").promises.unlink as jest.Mock).mockResolvedValue(
        undefined,
      );
      (require("@redis").redisClient.del as jest.Mock).mockResolvedValue(1);
      (require("fs").promises.readdir as jest.Mock).mockResolvedValue([]);
      (require("fs").promises.rmdir as jest.Mock).mockResolvedValue(undefined);
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      await imageService.deleteImages(["123/123_1.jpg"]);

      expect(require("fs").promises.rmdir).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Deleted empty directory"),
      );
      consoleSpy.mockRestore();
    });

    it("should handle readdir errors gracefully", async () => {
      (require("fs").existsSync as jest.Mock).mockReturnValue(true);
      (require("fs").promises.unlink as jest.Mock).mockResolvedValue(
        undefined,
      );
      (require("@redis").redisClient.del as jest.Mock).mockResolvedValue(1);
      (require("fs").promises.readdir as jest.Mock).mockRejectedValue(
        new Error("readdir error"),
      );

      await imageService.deleteImages(["123/123_1.jpg"]);

      expect(require("fs").promises.unlink).toHaveBeenCalled();
    });

    it("should handle user images deletion", async () => {
      (require("fs").existsSync as jest.Mock).mockReturnValue(true);
      (require("fs").promises.unlink as jest.Mock).mockResolvedValue(
        undefined,
      );
      (require("@redis").redisClient.del as jest.Mock).mockResolvedValue(1);
      (require("fs").promises.readdir as jest.Mock).mockResolvedValue([]);
      (require("fs").promises.rmdir as jest.Mock).mockResolvedValue(undefined);

      await imageService.deleteImages(["user_42.jpg"], true);

      expect(require("fs").promises.unlink).toHaveBeenCalled();
    });

    it("should skip deletion if file does not exist", async () => {
      (require("fs").existsSync as jest.Mock).mockReturnValue(false);
      (require("@redis").redisClient.del as jest.Mock).mockResolvedValue(0);
      (require("fs").promises.readdir as jest.Mock).mockResolvedValue([]);

      await imageService.deleteImages(["123/123_1.jpg"]);

      expect(require("fs").promises.unlink).not.toHaveBeenCalled();
      expect(require("@redis").redisClient.del).toHaveBeenCalled();
    });
  });
});
