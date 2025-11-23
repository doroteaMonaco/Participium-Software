import multer from "multer";

const multerConfig = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per file
    files: 3, // Maximum 3 files
  },
  fileFilter: (_req, file, cb) => {
     console.log("a",file);
    // Accept only image files
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

export default multerConfig;
