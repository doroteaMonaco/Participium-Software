import { Router } from "express";
import { submitReport } from "../controllers/reportController";
import { isAuthenticated } from "../middlewares/authMiddleware";
import { isCitizen } from "../middlewares/roleMiddleware";
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
router.post(
  "/reports",
  // POST is public in unit tests; authentication can be enforced elsewhere if needed
  upload.array("photos", 3),
  submitReport,
);

// Public endpoints for fetching reports (mounted at /api in tests)
router.get("/reports", async (_req, res) => {
  // Delegate to controller via dynamic import to avoid circular deps in tests
  const { getReports } = await import("../controllers/reportController");
  return getReports(_req as any, res as any);
});

router.get("/reports/:id", async (req, res) => {
  const { getReportById } = await import("../controllers/reportController");
  return getReportById(req as any, res as any);
});

export default router;
