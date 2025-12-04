import { prisma } from "@database";
import { CreateReportDto } from "@dto/reportDto";
import { Report } from "@models/entities/report";
import { ReportStatus } from "@models/enums";

type ReportStatusFilter = "ASSIGNED";

const findAll = async (statusFilter?: ReportStatusFilter, userId?: number) => {
  // If userId is provided, citizen wants to see their own reports + ASSIGNED reports
  if (userId) {
    return prisma.report.findMany({
      where: {
        OR: [
          { user_id: userId }, // Own reports (all statuses)
          { status: "ASSIGNED" }, // Assigned (approved) reports from others
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  // Default behavior: filter by status (for admin/municipality)
  return prisma.report.findMany({
    where: statusFilter ? { status: statusFilter } : undefined,
    include: {
      user: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

const findById = async (id: number) => {
  return prisma.report.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
        },
      },
    },
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
    anonymous: (data as any).anonymous || false,
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

const findByStatus = async (status: ReportStatus) => {
  return prisma.report.findMany({
    where: { status: status as any },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
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

const findAssignedReportsForOfficer = async (
  officerId: number,
  status?: ReportStatus,
) => {
  return prisma.report.findMany({
    where: {
      assignedOfficerId: officerId,
      ...(status ? { status: status } : {}),
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
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
    assignedOfficerId: number | null;
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
  findAssignedReportsForOfficer,
  deleteById,
  update,
  findByStatusesAndCategories,
};
