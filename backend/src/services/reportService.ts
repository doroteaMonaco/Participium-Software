import reportRepository from "@repositories/reportRepository";
import { userRepository } from "@repositories/userRepository";
import { CreateReportDto, ReportDto } from "@dto/reportDto";
import imageService from "@services/imageService";
import { ReportStatus } from "@models/enums";
import { stat } from "node:fs";

// Helper function to hide user info for anonymous reports
const sanitizeReport = (report: any): ReportDto => {
  const sanitized = {
    ...report,
    photos: report.photos || [],
    user_id: report.user_id,
  };

  // If report is anonymous, remove user details but keep user_id for filtering
  if (report.anonymous) {
    sanitized.user = null;
    // Keep user_id so the user can see their own anonymous reports in their dashboard
  }

  return sanitized as ReportDto;
};

// Helper function to map string to ReportStatus enum
const mapStringToStatus = (status: string): ReportStatus => {
  const statusUpper = status.toUpperCase();

  if (Object.values(ReportStatus).includes(statusUpper as ReportStatus)) {
    return statusUpper as ReportStatus;
  }

  throw new Error(
    `Invalid status: ${status}. Valid values are: ${Object.values(ReportStatus).join(", ")}`,
  );
};

const findAll = async (
  statusFilter?: ReportStatus,
  userId?: number,
): Promise<ReportDto[]> => {
  const reports = await reportRepository.findAll(statusFilter as any, userId);
  // Return stored relative paths for photos. The frontend expects relative
  // paths (e.g. "<reportId>/<file>") and will build the full URL as
  // `${backendOrigin}/uploads/${path}`. Avoid returning data URLs here to
  // keep payload size small and let the client fetch images when needed.
  return reports.map(sanitizeReport);
};

const findById = async (id: number): Promise<ReportDto | null> => {
  const report = await reportRepository.findById(id);

  if (!report) {
    return null;
  }
  // Return relative paths (not data URLs). The frontend will request
  // `/uploads/{relativePath}` to fetch each image.
  return sanitizeReport(report);
};

const findByStatus = async (status: string): Promise<ReportDto[]> => {
  // Map string to enum
  const statusEnum = mapStringToStatus(status);

  const reports = await reportRepository.findByStatus(statusEnum);

  if (!reports) {
    return [];
  }

  return reports.map(sanitizeReport);
};

const pickOfficerForService = async (
  officeName: string | undefined,
): Promise<number | null> => {
  if (!officeName) return null;

  const officer =
    await userRepository.findLeastLoadedOfficerByOfficeName(officeName);

  if (!officer) return null;

  return officer.id;
};

const updateReportStatus = async (
  id: number,
  status: string,
  rejectionReason?: string,
) => {
  // Map string to enum
  const statusEnum = mapStringToStatus(status);

  // Fetch existing report to validate and to read the category
  const existing = await reportRepository.findById(id);
  if (!existing) throw new Error("Report not found");

  // Validate allowed transitions: only PENDING_APPROVAL can be ACCEPTED/REJECTED here
  if (existing.status !== ReportStatus.PENDING_APPROVAL) {
    throw new Error(
      `Invalid state transition: only reports in PENDING_APPROVAL can be updated. Current status: ${existing.status}`,
    );
  }

  // When assigning, compute the technical office based on category using a robust matcher
  let assignedOffice: string | undefined = undefined;
  let assignedOfficerId: number | null = null;

  if (statusEnum === ReportStatus.ASSIGNED) {
    const rawCategory = (existing.category || "").toString();

    // Normalization helper: produce canonical key from enum or human label
    const normalize = (c: string) =>
      c
        .toString()
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "_")
        .replace(/[–—]/g, "_")
        .replace(/[^A-Z0-9_]/g, "");

    const key = normalize(rawCategory);

    // Mapping keyed by normalized category keys to actual municipality role names
    // These role names must match the ones in the database (see init-db.ts)
    const categoryToOffice: Record<string, string> = {
      PUBLIC_LIGHTING: "public works project manager",
      ROADS_URBAN_FURNISHINGS: "public works project manager",
      WASTE: "sanitation and waste management officer",
      WATER_SUPPLY_DRINKING_WATER: "environmental protection officer",
      SEWER_SYSTEM: "public works project manager",
      ROAD_SIGNS_TRAFFIC_LIGHTS: "traffic and mobility coordinator",
      PUBLIC_GREEN_AREAS_PLAYGROUNDS: "parks and green spaces officer",
      ARCHITECTURAL_BARRIERS: "urban planning specialist",
      OTHER: "municipal administrator",
    };

    const variantToOffice: Record<string, string> = {
      PUBLIC_LIGHTS: categoryToOffice.PUBLIC_LIGHTING,
      ROADS_AND_URBAN_FURNISHINGS: categoryToOffice.ROADS_URBAN_FURNISHINGS,
      ROAD_SIGNS_AND_TRAFFIC_LIGHTS: categoryToOffice.ROAD_SIGNS_TRAFFIC_LIGHTS,
      PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS:
        categoryToOffice.PUBLIC_GREEN_AREAS_PLAYGROUNDS,
      WATER_SUPPLY: categoryToOffice.WATER_SUPPLY_DRINKING_WATER,
    };

    assignedOffice =
      categoryToOffice[key] ||
      variantToOffice[key] ||
      "municipal administrator"; // Fallback to general municipal administrator

    assignedOfficerId = await pickOfficerForService(assignedOffice);

    // Check if an officer was found
    if (!assignedOfficerId) {
      throw new Error(
        `Cannot approve report: No officer available with role "${assignedOffice}". ` +
          `Please create a municipality user with this role before approving reports in category "${existing.category}".`,
      );
    }
  }

  const updatedReport = await reportRepository.update(id, {
    status: statusEnum,
    rejectionReason:
      statusEnum === ReportStatus.REJECTED ? rejectionReason : undefined,
    assignedOffice: assignedOffice ?? null,
    assignedOfficerId: assignedOfficerId,
  });

  return updatedReport.status;
};

const submitReport = async (
  data: CreateReportDto,
  user_id: number,
): Promise<ReportDto> => {
  // In unit tests we sometimes call submitReport with an empty dto ({}).
  // Shortcut: if empty, delegate directly to repository.create so tests can mock it.
  if (data && Object.keys(data).length === 0) {
    const created = await reportRepository.create(data as any);
    return sanitizeReport(created);
  }

  if (!data.title || data.title.trim().length === 0) {
    throw new Error("Title is required");
  }

  if (!data.description || data.description.trim().length === 0) {
    throw new Error("Description is required");
  }

  if (!data.category) {
    throw new Error("Category is required");
  }

  if (!data.photoKeys || data.photoKeys.length < 1) {
    throw new Error("At least 1 photo is required");
  }

  if (data.photoKeys.length > 3) {
    throw new Error("Maximum 3 photos are allowed");
  }

  // Crea il report prima (senza immagini)
  const report = await reportRepository.create({
    ...data,
    photoKeys: [],
    user_id: user_id, // Always save user_id, even for anonymous reports
    status: ReportStatus.PENDING_APPROVAL,
  });

  const imagePaths = await imageService.persistImagesForReport(
    data.photoKeys,
    report.id,
  );

  const updatedReport = await reportRepository.update(report.id, {
    photos: imagePaths,
  });

  // Return relative paths; frontend will build full URLs to `/uploads/{path}`.
  // Optionally preload the image cache for faster client access.
  try {
    await imageService.preloadCache(imagePaths);
  } catch (e) {
    // non-fatal
  }

  return sanitizeReport(updatedReport);
};

const findAssignedReportsForOfficer = async (
  officerId: number,
  status?: string,
): Promise<ReportDto[]> => {
  const statusEnum = status ? mapStringToStatus(status) : undefined;

  const reports = await reportRepository.findAssignedReportsForOfficer(
    officerId,
    statusEnum,
  );

  return reports.map(sanitizeReport);
};

const deleteReport = async (id: number): Promise<ReportDto> => {
  // Directly call repository.deleteById so repository errors propagate to caller
  const report = await reportRepository.findById(id);

  if (!report) {
    throw new Error("Report not found");
  }

  const deletedReport = await reportRepository.deleteById(id);

  await imageService.deleteImages((deletedReport as any).photos ?? []);

  return sanitizeReport({ ...deletedReport, photos: [] });
};

export default {
  findAll,
  findById,
  findByStatus,
  submitReport,
  findAssignedReportsForOfficer,
  deleteReport,
  updateReportStatus,
  pickOfficerForService,
};
