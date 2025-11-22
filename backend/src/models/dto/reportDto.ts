export interface CreateReportDto {
  latitude: number;
  longitude: number;
  title: string;
  description: string;
  category: string;
  photoKeys: string[]; // Keys for images stored in Redis
  userId: number;
}

export interface ReportResponseDto {
  id: number;
  createdAt: Date;
  latitude: number;
  longitude: number;
  title: string;
  description: string;
  category: string;
  photos: string[];
}
