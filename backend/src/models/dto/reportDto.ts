export interface CreateReportDto {
  latitude: number;
  longitude: number;
}

export interface ReportResponseDto {
  id: number;
  createdAt: Date;
  latitude: number;
  longitude: number;
}