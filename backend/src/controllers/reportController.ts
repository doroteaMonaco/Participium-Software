import { Request, Response } from "express";
import reportService from "@services/reportService";
import imageService from "@services/imageService";
import { roleType } from "@models/enums";
import { report } from "process";
import { commentAuthorType } from "@models/dto/commentDto";
import { userService } from "@services/userService";

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
      status?: string;
    };

    let statusFilter: ReportStatusFilter | undefined;
    let userId: number | undefined;

    if (!_req.user) {
      return res.status(401).json({
        error: "Authentication Error",
        message: "User not authenticated",
      });
    }

    // CITIZEN: Can see their own reports + ASSIGNED reports
    if (_req.role === roleType.CITIZEN) {
      if (status !== undefined && status !== "ASSIGNED") {
        return res.status(400).json({
          error: "Validation Error",
          message:
            "request/query/status must be equal to one of the allowed values: ASSIGNED",
        });
      }
      userId = _req.user.id;
      // If status=ASSIGNED is passed, also filter by ASSIGNED (which findAll already does with userId)
      // If no status is passed, show all their reports + ASSIGNED from others
    }
    // ADMIN/MUNICIPALITY: Can see all reports, optionally filtered by status
    else if (
      _req.role === roleType.ADMIN ||
      _req.role === roleType.MUNICIPALITY
    ) {
      // Allow filtering by status if provided
      if (status !== undefined && status !== "ASSIGNED") {
        return res.status(400).json({
          error: "Validation Error",
          message:
            "request/query/status must be equal to one of the allowed values: ASSIGNED",
        });
      }
      if (status === "ASSIGNED") {
        statusFilter = "ASSIGNED";
      }
    } else {
      return res.status(403).json({
        error: "Authorization Error",
        message: `Access denied. Allowed roles: CITIZEN, ADMIN, MUNICIPALITY. Your role: ${_req.role}`,
      });
    }

    const reports = await reportService.findAll(statusFilter as any, userId);
    return res.json(reports);
  } catch (error) {
    console.error("getReports error:", error);
    return res.status(500).json({ error: "Failed to fetch reports" });
  }
};

export const getReportById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parsedId = Number.parseInt(id);

    if (Number.isNaN(parsedId)) {
      return res.status(400).json({ error: "Invalid report ID" });
    }

    const report = await reportService.findById(parsedId);

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
    const { status } = req.body;
    const rejectionReason = req.body.rejectionReason ?? req.body.motivation;
    const userRole = req.role;

    // Define allowed statuses based on user role
    const municipalityStatuses = ["ASSIGNED", "REJECTED"];
    const externalMaintainerStatuses = ["IN_PROGRESS", "SUSPENDED", "RESOLVED"];

    const isMunicipalityRole = userRole === "MUNICIPALITY";
    const isExternalMaintainerRole = userRole === "EXTERNAL_MAINTAINER";

    // Validate status based on role
    if (isMunicipalityRole && !municipalityStatuses.includes(status)) {
      return res.status(400).json({
        error:
          "Invalid status. Municipality users can only set ASSIGNED or REJECTED.",
      });
    }

    if (
      isExternalMaintainerRole &&
      !externalMaintainerStatuses.includes(status)
    ) {
      return res.status(400).json({
        error:
          "Invalid status. External maintainers can only set IN_PROGRESS, SUSPENDED or RESOLVED.",
      });
    }

    if (
      status === "REJECTED" &&
      (!rejectionReason || rejectionReason.trim() === "")
    ) {
      return res.status(400).json({
        error: "Rejection reason is required when rejecting a report.",
      });
    }

    let result;
    if (isExternalMaintainerRole) {
      // External maintainer updating status
      result = await reportService.updateReportStatusByExternalMaintainer(
        Number.parseInt(id),
        req.user!.id,
        status,
      );
    } else {
      // Municipality user approving/rejecting
      result = await reportService.updateReportStatus(
        Number.parseInt(id),
        status,
        rejectionReason,
      );
    }

    res.status(204).json({ status: result });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to update report status";
    let statusCode = 500;
    if (error instanceof Error) {
      if (error.message === "Report not found") statusCode = 404;
      else if (/not authorized/i.test(error.message)) statusCode = 403;
      else if (/invalid/i.test(error.message)) statusCode = 400;
    }
    res.status(statusCode).json({ error: errorMessage });
  }
};

export const submitReport = async (req: Request, res: Response) => {
  try {
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
      })),
    );

    const report = await reportService.submitReport(
      {
        latitude: Number(latitude),
        longitude: Number(longitude),
        title,
        description,
        anonymous: anonymous === "true" || anonymous === true,
        category,
        photoKeys: tempKeys, // Pass temporary keys
      },
      req.user!.id,
    );

    res.status(201).json(report);
  } catch (error) {
    // Do not leak internal error messages in responses for submit
    console.error("Error in submitReport:", error);
    res.status(500).json({ error: "Failed to submit report" });
  }
};

export const getReportsForMunicipalityUser = async (
  req: Request,
  res: Response,
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication Error",
        message: "User not authenticated",
      });
    }

    const municipalityUserId = Number(req.params.municipalityUserId);
    if (!Number.isInteger(municipalityUserId) || municipalityUserId < 0) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid municipality user ID",
      });
    }

    if (req.user.id !== municipalityUserId) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You can only access reports assigned to yourself",
      });
    }

    const statusParam =
      typeof req.query.status === "string" ? req.query.status : undefined;

    const reports = await reportService.findAssignedReportsForOfficer(
      municipalityUserId,
      statusParam,
    );

    return res.status(200).json(reports);
  } catch (error) {
    return res.status(500).json({
      error: "Internal Server Error",
      message: "Unable to fetch assigned reports for municipality user",
    });
  }
};

export const deleteReport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deletedReport = await reportService.deleteReport(Number.parseInt(id));
    res.json(deletedReport);
  } catch (error) {
    // Generic error for delete failures
    res.status(500).json({ error: "Failed to delete report" });
  }
};

export const assignToExternalMaintainer = async (
  req: Request,
  res: Response,
) => {
  try {
    const rawReportId = req.params.report_id ?? req.params.reportId;
    const reportId = Number.parseInt(String(rawReportId));

    if (Number.isNaN(reportId)) {
      return res.status(400).json({
        error: "Validation Error",
        message: "Invalid report or external maintainer id",
      });
    }

    const updatedReport =
      await reportService.assignToExternalMaintainer(reportId);

    return res.status(200).json(updatedReport);
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to assign external maintainer";
    const statusCode =
      error instanceof Error && /not found/i.test(error.message) ? 404 : 500;
    return res.status(statusCode).json({ error: errorMessage });
  }
};

export const getReportsForExternalMaintainer = async (
  req: Request,
  res: Response,
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication Error",
        message: "User not authenticated",
      });
    }

    const externalMaintainerId = Number(req.params.externalMaintainersId);
    if (!Number.isInteger(externalMaintainerId) || externalMaintainerId < 0) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid external maintainer ID",
      });
    }

    if (req.user.id !== externalMaintainerId) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You can only access reports assigned to yourself",
      });
    }

    const reports =
      await reportService.findReportsForExternalMaintainer(
        externalMaintainerId,
      );

    return res.status(200).json(reports);
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to retrieve reports for external maintainer";
    const statusCode =
      error instanceof Error && /not found/i.test(error.message) ? 404 : 500;
    return res.status(statusCode).json({ error: errorMessage });
  }
};

export const addCommentToReport = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication Error",
        message: "User not authenticated",
      });
    }

    const reportId = Number.parseInt(req.params.report_id);
    if (Number.isNaN(reportId)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid report id",
      });
    }

    if (!req.body.content || req.body.content.trim().length === 0) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Comment content cannot be empty",
      });
    }

    const authorType: commentAuthorType =
      req.role === roleType.MUNICIPALITY
        ? "MUNICIPALITY"
        : "EXTERNAL_MAINTAINER";

    const response = await reportService.addCommentToReport({
      reportId,
      authorId: req.user.id,
      authorType,
      content: req.body.content,
    });

    if (!response) {
      return res.status(404).json({
        error: "Not Found",
        message: "Report not found",
      });
    }

    return res.status(201).json(response);
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to add comment to report";
    
    // Check for specific error messages
    if (error instanceof Error && /resolved/i.test(error.message)) {
      return res.status(403).json({
        error: "Forbidden",
        message: errorMessage,
      });
    }
    
    if (error instanceof Error && /only comment on reports assigned/i.test(error.message)) {
      return res.status(403).json({
        error: "Forbidden",
        message: errorMessage,
      });
    }
    
    const statusCode =
      error instanceof Error && /not found/i.test(error.message) ? 404 : 500;
    return res.status(statusCode).json({ error: errorMessage });
  }
};

export const getCommentOfAReportById = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication Error",
        message: "User not authenticated",
      });
    }

    const reportId = Number.parseInt(req.params.report_id);
    if (Number.isNaN(reportId)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid report id",
      });
    }

    const response = await reportService.getCommentsOfAReportById(reportId);

    if (!response) {
      return res.status(404).json({
        error: "Not Found",
        message: "Report not found",
      });
    }

    return res.status(200).json(response);
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to retrieve reports for external maintainer";
    const statusCode =
      error instanceof Error && /not found/i.test(error.message) ? 404 : 500;
    return res.status(statusCode).json({ error: errorMessage });
  }
};
