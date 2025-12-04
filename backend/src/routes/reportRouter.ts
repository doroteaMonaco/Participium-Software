import { Router } from "express";
import {
  submitReport,
  getReports,
  getReportById,
  approveOrRejectReport,
  getReportsForMunicipalityUser,
} from "@controllers/reportController";
import { isAuthenticated } from "@middlewares/authMiddleware";
import {
  isCitizen,
  isMunicipality,
  isMunicipalityStrict,
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

// POST /api/reports/:id - Approve or reject a report (municipality role only)
router.post("/:id", isAuthenticated, isMunicipality, approveOrRejectReport);

router.get(
  "/municipality-user/:municipalityUserId",
  isAuthenticated,
  isMunicipalityStrict,
  getReportsForMunicipalityUser,
);

export default router;
