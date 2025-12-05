import type { Report, ReportStatus as APIReportStatus } from "./api";

export class ReportModel {
  id: number;
  title: string;
  description: string;
  category: string;
  photos: string[];
  lat: number;
  lng: number;
  createdAt: string;
  status: ReportStatus;
  rejectionReason?: string;
  isAnonymous: boolean;
  user?: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
  } | null;
  assignedOffice?: string;
  // submittedBy?: string;

  constructor(x: Report) {
    this.id = x.id ?? 0;
    this.title = x.title ?? "";
    this.description = x.description ?? "";
    this.category = x.category ?? "";
    this.photos = x.photos ?? [];
    this.lat = x.latitude ?? 0;
    this.lng = x.longitude ?? 0;
    this.createdAt = x.createdAt ?? new Date().toISOString();
    this.status = x.status ? parseReportStatus(x.status) : ReportStatus.PENDING;
    this.rejectionReason = x.rejectionReason;
    this.user = x.user || null;
    this.assignedOffice = x.assignedOffice;
    // this.submittedBy = submittedBy;
    this.isAnonymous = x.anonymous || false;
  }
}

export const ReportStatus = {
  PENDING: "PENDING",
  ASSIGNED: "ASSIGNED",
  IN_PROGRESS: "IN_PROGRESS",
  SUSPENDED: "SUSPENDED",
  REJECTED: "REJECTED",
  RESOLVED: "RESOLVED",
} as const;

export type ReportStatus = (typeof ReportStatus)[keyof typeof ReportStatus];

export const parseReportStatus = (
  val?: string | APIReportStatus,
): ReportStatus => {
  const s = (val ?? "").toString().trim().toUpperCase();

  if (s === "APPROVED") return ReportStatus.ASSIGNED;
  if (s === "PENDING" || s === "PENDING_APPROVAL") return ReportStatus.PENDING;
  if (s === "ASSIGNED") return ReportStatus.ASSIGNED;
  if (s === "IN_PROGRESS") return ReportStatus.IN_PROGRESS;
  if (s === "SUSPENDED") return ReportStatus.SUSPENDED;
  if (s === "REJECTED") return ReportStatus.REJECTED;
  if (s === "RESOLVED") return ReportStatus.RESOLVED;

  // fallback
  return ReportStatus.PENDING;
};
