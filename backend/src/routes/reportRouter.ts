import { Router } from "express";
import {
  submitReport,
  getReports,
  getReportById,
  approveOrRejectReport,
} from "@controllers/reportController";
import { isAuthenticated } from "@middlewares/authMiddleware";
import { isCitizen, isMunicipality } from "@middlewares/roleMiddleware";

const router = Router();

// Configure multer
// const upload = multer({
//   storage: multer.memoryStorage(),
//   limits: {
//     fileSize: 50 * 1024 * 1024, // 50MB per file
//     files: 3, // Maximum 3 files
//   },
//   fileFilter: (_req, file, cb) => {
//     // Accept only image files
//     if (file.mimetype.startsWith("image/")) {
//       cb(null, true);
//     } else {
//       cb(new Error("Only image files are allowed"));
//     }
//   },
// });

// POST /api/reports - Create a new report (authenticated users only)
router.post("/", isAuthenticated, submitReport);

// GET /api/reports - Get all reports (public)
router.get("/", getReports);

// GET /api/reports/:id - Get report by ID (public)
router.get("/:id", getReportById);

// POST /api/reports/:id - Approve or reject a report (municipality role only)
router.post("/:id", isAuthenticated, isMunicipality, approveOrRejectReport);

export default router;
