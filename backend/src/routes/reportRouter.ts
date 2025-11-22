import { Router } from "express";
import { submitReport } from "@controllers/reportController";
import { isAuthenticated } from "@middlewares/authMiddleware";
import { isCitizen } from "@middlewares/roleMiddleware";
import multerConfig from "@config/multerConfig";

const router = Router();

// POST /api/reports - Create a new report (authenticated users only)
router.post(
  "/",
  isAuthenticated,
  isCitizen,
  multerConfig.array("photos", 3),
  submitReport,
);

// Public endpoints for fetching reports (mounted at /api in tests)
router.get("/", async (_req, res) => {
  // Delegate to controller via dynamic import to avoid circular deps in tests
  const { getReports } = await import("../controllers/reportController");
  return getReports(_req as any, res as any);
});

router.get("/:id", async (req, res) => {
  const { getReportById } = await import("../controllers/reportController");
  return getReportById(req as any, res as any);
});

export default router;
