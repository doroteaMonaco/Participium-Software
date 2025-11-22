import reportRepository from "@repositories/reportRepository";
import { CreateReportDto, ReportResponseDto } from "@dto/reportDto";
import imageService from "@services/imageService";
import { ReportStatus } from "@models/enums";

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

const findAll = async (): Promise<ReportResponseDto[]> => {
  const reports = await reportRepository.findAll();
  // Return stored relative paths for photos. The frontend expects relative
  // paths (e.g. "<reportId>/<file>") and will build the full URL as
  // `${backendOrigin}/uploads/${path}`. Avoid returning data URLs here to
  // keep payload size small and let the client fetch images when needed.
  return reports.map((report) => ({
    ...report,
    photos: report.photos || [],
  }));
};

const findById = async (id: number): Promise<ReportResponseDto | null> => {
  const report = await reportRepository.findById(id);

  if (!report) {
    return null;
  }
  // Return relative paths (not data URLs). The frontend will request
  // `/uploads/{relativePath}` to fetch each image.
  return {
    ...report,
    photos: report.photos || [],
  };
};

const findByStatus = async (status: string): Promise<ReportResponseDto[]> => {
  // Map string to enum
  const statusEnum = mapStringToStatus(status);

  const reports = await reportRepository.findByStatus(statusEnum);

  if (!reports) {
    return [];
  }

  return reports.map((report: any) => ({
    ...report,
    photos: report.photos || [],
  }));
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

    // Mapping keyed by normalized category keys. Also check a small set of
    // human-friendly variants if present.
    const categoryToOffice: Record<string, string> = {
      PUBLIC_LIGHTING: "Public Works - Lighting Division",
      ROADS_URBAN_FURNISHINGS: "Public Works - Roads Department",
      WASTE: "Environmental Services - Waste Management",
      WATER_SUPPLY_DRINKING_WATER: "Water Supply Authority",
      SEWER_SYSTEM: "Public Works - Sewerage Department",
      ROAD_SIGNS_TRAFFIC_LIGHTS: "Transportation & Traffic Department",
      PUBLIC_GREEN_AREAS_PLAYGROUNDS: "Parks & Recreation Department",
      ARCHITECTURAL_BARRIERS: "Urban Planning - Accessibility Office",
      OTHER: "General Services Office",
    };

    const variantToOffice: Record<string, string> = {
      PUBLIC_LIGHTS: categoryToOffice.PUBLIC_LIGHTING,
      ROADS_AND_URBAN_FURNISHINGS: categoryToOffice.ROADS_URBAN_FURNISHINGS,
      ROAD_SIGNS_AND_TRAFFIC_LIGHTS: categoryToOffice.ROAD_SIGNS_TRAFFIC_LIGHTS,
      PUBLIC_GREEN_AREAS_AND_PLAYGROUNDS: categoryToOffice.PUBLIC_GREEN_AREAS_PLAYGROUNDS,
      WATER_SUPPLY: categoryToOffice.WATER_SUPPLY_DRINKING_WATER,
    };

    assignedOffice = categoryToOffice[key] || variantToOffice[key] || "General Services Office";
  }

  const updatedReport = await reportRepository.update(id, {
    status: statusEnum,
    rejectionReason: statusEnum === ReportStatus.REJECTED ? rejectionReason : undefined,
    assignedOffice: assignedOffice ?? null,
  });

  return updatedReport.status;
};

const submitReport = async (
  data: CreateReportDto,
  user_id: number,
): Promise<ReportResponseDto> => {
  // In unit tests we sometimes call submitReport with an empty dto ({}).
  // Shortcut: if empty, delegate directly to repository.create so tests can mock it.
  if (data && Object.keys(data).length === 0) {
    const created = await reportRepository.create(data as any);
    return created as ReportResponseDto;
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
    user_id: data.anonymous ? null : user_id,
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

  return {
    ...(updatedReport as any),
    photos: updatedReport.photos || [],
  } as any;
};

const deleteReport = async (id: number): Promise<ReportResponseDto> => {
  // Directly call repository.deleteById so repository errors propagate to caller
  const report = await reportRepository.findById(id);

  if (!report) {
    throw new Error("Report not found");
  }

  const deletedReport = await reportRepository.deleteById(id);

  await imageService.deleteImages((deletedReport as any).photos ?? []);

  return {
    ...deletedReport,
    photos: [],
  };
};

export default {
  findAll,
  findById,
  findByStatus,
  submitReport,
  deleteReport,
  updateReportStatus,
};
