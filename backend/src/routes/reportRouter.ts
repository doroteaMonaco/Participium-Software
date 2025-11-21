import { Router } from "express";
import {
  submitReport,
  getReports,
  getReportById,
} from "@controllers/reportController";
import { isAuthenticated } from "@middlewares/authMiddleware";
import { isCitizen } from "@middlewares/roleMiddleware";
import multer from "multer";

const router = Router();

// Configure multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per file
    files: 3, // Maximum 3 files
  },
  fileFilter: (_req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// POST /api/reports - Create a new report (authenticated users only)
router.post("/", isAuthenticated, upload.array("photos", 3), submitReport);

// Public endpoints for fetching reports (mounted at /api in tests)
router.get("/", getReports);

router.get("/:id", getReportById);

export default router;
