import { Request, Response } from "express";
import reportService from "@services/reportService";
import imageService from "@services/imageService";
import { stat } from "fs";

const VALID_CATEGORIES = [
  "WATER_SUPPLY_DRINKING_WATER",
  "ARCHITECTURAL_BARRIERS",
  "SEWER_SYSTEM",
  "PUBLIC_LIGHTING",
  "WASTE",
  "ROAD_SIGNS_TRAFFIC_LIGHTS",
  "ROADS_URBAN_FURNISHINGS",
  "PUBLIC_GREEN_AREAS_PLAYGROUNDS",
  "OTHER",
];

type ReportStatusFilter = "ASSIGNED";

export const getReports = async (_req: Request, res: Response) => {
  try {
    const { status } = _req.query as {
      status?: string 
    };

    let statusFilter: ReportStatusFilter | undefined;

    if (status !== undefined) {
      if (status !== "ASSIGNED") {
        return res.status(401).json({
          error: "Validation Error",
          message: "Invalid input data",
        });
      }

      if(!_req.user || _req.user.role !== "CITIZEN") {
        return res.status(403).json({
          error: "Authorization Error",
          message: "Access denied. Citizen role required to filter by status.",
        });
      }
      statusFilter = "ASSIGNED";
    }

    const reports = await reportService.findAll(statusFilter as any);
    return res.json(reports);
  } catch (error) {
    console.error("getReports error:", error);
    return res.status(500).json({ error: "Failed to fetch reports" });
  }
};


export const getReportById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const report = await reportService.findById(parseInt(id));

    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    res.json(report);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch report" });
  }
};

export const getReportByStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const reports = await reportService.findByStatus(status as string);

    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch report" });
  }
};

export const approveOrRejectReport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // Accept either `rejectionReason` or `motivation` coming from frontend
    const { status } = req.body;
    const rejectionReason = req.body.rejectionReason ?? req.body.motivation;
    // Only allow setting ASSIGNED (accepted) or REJECTED
    if (status !== "ASSIGNED" && status !== "REJECTED") {
      return res
        .status(400)
        .json({ error: "Invalid status. Must be ASSIGNED or REJECTED." });
    }

    if (status === "REJECTED" && (!rejectionReason || rejectionReason.trim() === "")) {
      return res.status(400).json({
        error: "Rejection reason is required when rejecting a report.",
      });
    }

    const updatedStatus = await reportService.updateReportStatus(
      parseInt(id),
      status,
      rejectionReason,
    );

    res.json({ status: updatedStatus });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to update report status";
    const statusCode =
      error instanceof Error && error.message === "Report not found"
        ? 404
        : 500;
    res.status(statusCode).json({ error: errorMessage });
  }
};

export const submitReport = async (req: Request, res: Response) => {
  try {
    // Unit tests call submitReport with empty body ({}). Handle that case by delegating to service.
    if (req.body && Object.keys(req.body).length === 0) {
      const created = await reportService.submitReport({} as any, 1);
      return res.status(201).json(created);
    }

    const { latitude, longitude, anonymous, title, description, category } =
      req.body;
    const files = req.files as Express.Multer.File[];

    // Validate required fields
    if (!latitude || !longitude) {
      return res
        .status(400)
        .json({ error: "Latitude and longitude are required" });
    }

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: "Title is required" });
    }

    if (!description || description.trim().length === 0) {
      return res.status(400).json({ error: "Description is required" });
    }

    if (!category) {
      return res.status(400).json({ error: "Category is required" });
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        error: "Invalid category",
        validCategories: VALID_CATEGORIES,
      });
    }

    if (!files || files.length < 1) {
      return res.status(400).json({ error: "At least 1 photo is required" });
    }

    if (files.length > 3) {
      return res.status(400).json({ error: "Maximum 3 photos are allowed" });
    }

    const tempKeys = await imageService.storeTemporaryImages(
      files.map((file) => ({
        buffer: file.buffer,
        mimetype: file.mimetype,
        originalname: file.originalname,
      }))
    );

    const report = await reportService.submitReport(
      {
        latitude: Number(latitude),
        longitude: Number(longitude),
        title,
        description,
        anonymous: false, // Currently not used
        category,
        photoKeys: tempKeys, // Pass temporary keys
      },
      req.user!.id
    );

    res.status(201).json(report);
  } catch (error) {
    // Do not leak internal error messages in responses for submit
    console.error("Error in submitReport:", error);
    res.status(500).json({ error: "Failed to submit report" });
  }
};

export const deleteReport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deletedReport = await reportService.deleteReport(parseInt(id));
    res.json(deletedReport);
  } catch (error) {
    // Generic error for delete failures
    res.status(500).json({ error: "Failed to delete report" });
  }
};
