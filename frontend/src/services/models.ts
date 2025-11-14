export class Report {
  id: number;
  title: string;
  description: string;
  anonymous: boolean;
  category: string;
  photos: string[];
  lat: number;
  lng: number;
  createdAt: string;
  status: ReportStatus;

  constructor(
    lat: number,
    lng: number,
    title: string,
    status: ReportStatus,
    id?: number,
    description?: string,
    anonymous?: boolean,
    category?: string,
    photos?: string[],
    createdAt?: string,
  ) {
    this.id = id || 0;
    this.title = title;
    this.description = description || "";
    this.anonymous = anonymous ?? true;
    this.category = category || "";
    this.photos = photos || [];
    this.lat = lat;
    this.lng = lng;
    this.createdAt = createdAt || new Date().toISOString();
    this.status = status;
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
