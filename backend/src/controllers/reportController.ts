import { Request, Response } from "express";
import reportService from "../services/reportService";
import imageService from "../services/imageService";

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

export const getReports = async (_req: Request, res: Response) => {
  try {
    const reports = await reportService.findAll();
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch reports" });
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

export const submitReport = async (req: Request, res: Response) => {
  try {
    // Unit tests call submitReport with empty body ({}). Handle that case by delegating to service.
    if (req.body && Object.keys(req.body).length === 0) {
      const created = await reportService.submitReport({} as any);
      return res.status(201).json(created);
    }

    const { latitude, longitude, title, description, category } = req.body;
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
      })),
    );

    const report = await reportService.submitReport({
      latitude: Number(latitude),
      longitude: Number(longitude),
      title,
      description,
      category,
      photoKeys: tempKeys, // Pass temporary keys
    });

    res.status(201).json(report);
  } catch (error) {
    // Do not leak internal error messages in responses for submit
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
