import { prisma } from "@database";
import { CreateReportDto } from "@dto/reportDto";
import { Report } from "@models/entities/report";
import { ReportStatus } from "@models/enums";

const findAll = async () => {
  return prisma.report.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
};

const findById = async (id: number) => {
  return prisma.report.findUnique({
    where: { id },
  });
};

const findByStatus = async (status: ReportStatus) => {
  return prisma.report.findMany({
    where: { status } as any,
    orderBy: {
      createdAt: "desc",
    },
  });
};

const findByStatusesAndCategories = async (
  statuses: ReportStatus[],
  categories: string[],
) => {
  return prisma.report.findMany({
    where: {
      status: { in: statuses as any },
      category: { in: categories as any },
    } as any,
    orderBy: { createdAt: "desc" },
  });
};

const create = async (data: Report) => {
  const createData: any = {
    latitude: data.latitude,
    longitude: data.longitude,
    title: data.title,
    description: data.description,
    category: data.category as any,
    photos: data.photoKeys,
    status: data.status,
    assignedOffice: (data as any).assignedOffice,
  };

  // Add user relation if user_id is provided
  if (data.user_id) {
    createData.user = {
      connect: { id: data.user_id },
    };
  }

  return prisma.report.create({
    data: createData,
  });
};

const deleteById = async (id: number) => {
  return prisma.report.delete({
    where: { id },
  });
};

const update = async (
  id: number,
  data: Partial<{
    photos: string[];
    status: ReportStatus;
    rejectionReason: string;
    assignedOffice: string | null;
  }>,
) => {
  return prisma.report.update({
    where: { id },
    data,
  });
};

export default {
  findAll,
  findById,
  findByStatus,
  create,
  deleteById,
  update,
  findByStatusesAndCategories,
};
