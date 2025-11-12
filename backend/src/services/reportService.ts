import reportRepository from "../repositories/reportRepository";
import { CreateReportDto, ReportResponseDto } from "../models/dto/reportDto";
import imageService from "./imageService";

const findAll = async (): Promise<ReportResponseDto[]> => {
  const reports = await reportRepository.findAll();

  const reportsWithImages = await Promise.all(
    reports.map(async (report) => {
      const photos = await imageService.getMultipleImages(report.photos);
      return {
        ...report,
        photos,
      };
    }),
  );

  return reportsWithImages;
};

const findById = async (id: number): Promise<ReportResponseDto | null> => {
  const report = await reportRepository.findById(id);

  if (!report) {
    return null;
  }

  const photos = await imageService.getMultipleImages(report.photos);

  return {
    ...report,
    photos,
  };
};

const submitReport = async (
  data: CreateReportDto,
): Promise<ReportResponseDto> => {
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
  });

  const imagePaths = await imageService.persistImagesForReport(
    data.photoKeys,
    report.id,
  );

  const updatedReport = await reportRepository.update(report.id, {
    photos: imagePaths,
  });

  const photos = await imageService.getMultipleImages(updatedReport.photos);

  return {
    ...updatedReport,
    photos,
  };
};

const deleteReport = async (id: number): Promise<ReportResponseDto> => {
  const report = await reportRepository.findById(id);

  if (!report) {
    throw new Error("Report not found");
  }

  const deletedReport = await reportRepository.deleteById(id);

  await imageService.deleteImages(report.photos);

  return {
    ...deletedReport,
    photos: [],
  };
};

export default {
  findAll,
  findById,
  submitReport,
  deleteReport,
};
