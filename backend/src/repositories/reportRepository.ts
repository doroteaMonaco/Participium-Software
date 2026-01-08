import { prisma } from "@database";
import { Report } from "@models/entities/report";
import { ReportStatus} from "@models/enums";

type BoundingBox = {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
};

type ReportStatusFilter = "ASSIGNED";

interface AddCommentPersistenceData {
  reportId: number;
  content: string;
  municipality_user_id: number | null;
  external_maintainer_id: number | null;
}

const findAll = async (statusFilter?: ReportStatusFilter, userId?: number) => {
  // If userId is provided, citizen wants to see:
  // - Their own reports (all statuses)
  // - Other users' reports EXCEPT PENDING_APPROVAL and REJECTED
  if (userId) {
    return prisma.report.findMany({
      where: {
        OR: [
          { user_id: userId }, // Own reports (all statuses)
          {
            // Other users' reports: all statuses except PENDING_APPROVAL and REJECTED
            user_id: { not: userId },
            status: {
              in: ["ASSIGNED", "IN_PROGRESS", "SUSPENDED", "RESOLVED"],
            },
          },
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
        externalMaintainer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true,
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
      externalMaintainer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          companyName: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

const findAllForMapView = async () => {
  return prisma.report.findMany({
    where: {
      OR: [
        { status: ReportStatus.ASSIGNED },
        { status: ReportStatus.IN_PROGRESS },
        { status: ReportStatus.SUSPENDED },
        { status: ReportStatus.RESOLVED },
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
      externalMaintainer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          companyName: true,
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
      externalMaintainer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          companyName: true,
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
      externalMaintainer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          companyName: true,
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
      externalMaintainer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          companyName: true,
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
    externalMaintainerId: number | null;
  }>,
) => {
  return prisma.report.update({
    where: { id },
    data,
  });
};

const findByExternalMaintainerId = async (externalMaintainerId: number) => {
  return prisma.report.findMany({
    where: { externalMaintainerId },
  });
};

const addCommentToReport = async (data: AddCommentPersistenceData) => {
  return prisma.comment.create({
    data: {
      reportId: data.reportId,
      content: data.content,
      municipality_user_id: data.municipality_user_id,
      external_maintainer_id: data.external_maintainer_id,
    },
  });
};

const getCommentsByReportId = async (reportId: number) => {
  return prisma.comment.findMany({
    where: { reportId },
    orderBy: { createdAt: "asc" },
  });
};

const getMunicipalityUserUnreadCommentsByReportId = async (
  reportId: number,
) => {
  return prisma.comment.findMany({
    where: {
      reportId,
      read: false,
      municipality_user_id: null,
    },
    orderBy: { createdAt: "asc" },
  });
};

const getExternalMaintainerUnreadCommentsByReportId = async (
  reportId: number,
) => {
  return prisma.comment.findMany({
    where: {
      reportId,
      read: false,
      external_maintainer_id: null,
    },
    orderBy: { createdAt: "asc" },
  });
};

const markExternalMaintainerCommentsAsRead = async (reportId: number) => {
  return prisma.comment.updateMany({
    where: {
      reportId,
      read: false,
      municipality_user_id: null,
    },
    data: {
      read: true,
    },
  });
};

const markMunicipalityCommentsAsRead = async (reportId: number) => {
  return prisma.comment.updateMany({
    where: {
      reportId,
      read: false,
      external_maintainer_id: null,
    },
    data: {
      read: true,
    },
  });
};

const findByBoundingBox = async (bbox: BoundingBox, options: { statuses: ReportStatus[]}) => {
  return prisma.report.findMany({
    where: {
      longitude: {
        gte: bbox.minLng,
        lte: bbox.maxLng,
      }, 
      latitude: {
        gte: bbox.minLat,
        lte: bbox.maxLat,
      },
      status: {
        in: options.statuses as any,
      },
    },
    orderBy: { createdAt: "desc" },
  })
}

export default {
  findAll,
  findAllForMapView,
  findById,
  findByStatus,
  create,
  findAssignedReportsForOfficer,
  deleteById,
  update,
  findByStatusesAndCategories,
  findByExternalMaintainerId,
  addCommentToReport,
  getCommentsByReportId,
  getMunicipalityUserUnreadCommentsByReportId,
  getExternalMaintainerUnreadCommentsByReportId,
  markExternalMaintainerCommentsAsRead,
  markMunicipalityCommentsAsRead,
  findByBoundingBox,
};
