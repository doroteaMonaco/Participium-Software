import { Router } from "express";
import {
  submitReport,
  getReports,
  getReportById,
  approveOrRejectReport,
  getReportsForMunicipalityUser,
  assignToExternalMaintainer,
  getReportsForExternalMaintainer,
  addCommentToReport,
  getCommentOfAReportById,
} from "@controllers/reportController";
import { isAuthenticated } from "@middlewares/authMiddleware";
import {
  isCitizen,
  isMunicipalityStrict,
  isExternalMaintainer,
  isMunicipalityOrExternalMaintainer
} from "@middlewares/roleMiddleware";
import { uploadArray } from "@middlewares/uploadMiddleware";

const router = Router();

// POST /api/reports - Create a new report (authenticated users only)
router.post(
  "/",
  isAuthenticated,
  isCitizen,
  uploadArray("photos", 3),
  submitReport,
);

// GET /api/reports - Get all reports (authenticated users, role check in controller based on query params)
router.get("/", isAuthenticated, getReports);

// GET /api/reports/:id - Get report by ID (public)
router.get("/:id", getReportById);

// POST /api/reports/:id - Change report status (municipality or external maintainer)
router.post("/:id", isAuthenticated, isMunicipalityOrExternalMaintainer, approveOrRejectReport);

router.get(
  "/municipality-user/:municipalityUserId",
  isAuthenticated,
  isMunicipalityStrict,
  getReportsForMunicipalityUser,
);

router.post(
  "/:report_id/external-maintainers/",
  isAuthenticated,
  isMunicipalityStrict,
  assignToExternalMaintainer,
);

// GET /api/reports/external-maintainers/:externalMaintainersId - Get reports assigned to an external maintainer
router.get(
  "/external-maintainers/:externalMaintainersId",
  isAuthenticated,
  isExternalMaintainer,
  getReportsForExternalMaintainer
);

/**
 * Add a comment to a report - requires municipality user or external maintainer role
 * @route   POST /api/reports/{report_id}/comments
 */
router.post(
  "/:report_id/comments",
  isAuthenticated,
  isMunicipalityOrExternalMaintainer,
  addCommentToReport
)

router.get("/:report_id/comments", isAuthenticated, isMunicipalityOrExternalMaintainer, getCommentOfAReportById)

export default router;
