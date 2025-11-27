import multer from "multer";
import { Request, Response, NextFunction } from "express";

const storage = multer.memoryStorage();

const fileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
});

// Middleware that wraps multer.array to handle errors
export const uploadArray = (fieldName: string, maxCount: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    upload.array(fieldName, maxCount)(req, res, (err) => {
      if (err) {
        if (err.code === "LIMIT_FILE_COUNT") {
          return res
            .status(400)
            .json({ error: `Maximum ${maxCount} photos are allowed` });
        }
        if (err.code === "LIMIT_FILE_SIZE") {
          return res
            .status(400)
            .json({ error: "File size exceeds maximum allowed" });
        }
        if (err.message === "Only image files are allowed") {
          return res
            .status(400)
            .json({ error: err.message });
        }
        if (err.message === "Unexpected field") {
          return res
            .status(400)
            .json({ error: `Maximum ${maxCount} photos are allowed` });
        }
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  };
};

export { upload };
