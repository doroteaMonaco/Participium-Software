export class Report {
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
  // isAnonymous: boolean;
  // assignedOffice?: string;
  // submittedBy?: string;

  constructor(
    lat: number,
    lng: number,
    title: string,
    status: string,
    id?: number,
    description?: string,
    category?: string,
    photos?: string[],
    createdAt?: string,
    rejectionReason?: string,
    // isAnonymous?: boolean,
    // assignedOffice?: string
    // submittedBy?: string;
  ) {
    this.id = id || 0;
    this.title = title;
    this.description = description || "";
    this.category = category || "";
    this.photos = photos || [];
    this.lat = lat;
    this.lng = lng;
    this.createdAt = createdAt || new Date().toISOString();
    this.status = parseReportStatus(status);
    this.rejectionReason = rejectionReason;
    // this.assignedOffice = assignedOffice;
    // this.submittedBy = submittedBy;
    // this.isAnonymous = isAnonymous;
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

export const parseReportStatus = (val?: string): ReportStatus => {
  const s = (val ?? "").toString().trim().toUpperCase();

  if (s === "APPROVED") return ReportStatus.ASSIGNED;
  if (s === "PENDING") return ReportStatus.PENDING;
  if (s === "ASSIGNED") return ReportStatus.ASSIGNED;
  if (s === "IN_PROGRESS") return ReportStatus.IN_PROGRESS;
  if (s === "SUSPENDED") return ReportStatus.SUSPENDED;
  if (s === "REJECTED") return ReportStatus.REJECTED;
  if (s === "RESOLVED") return ReportStatus.RESOLVED;

  // fallback
  return ReportStatus.PENDING;
};
