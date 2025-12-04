export interface CreateReportDto {
  latitude: number;
  longitude: number;
  title: string;
  description: string;
  category: string;
  anonymous: boolean;
  photoKeys: string[]; // Keys for images stored in Redis
}

export interface ReportDto {
  id: number;
  createdAt: Date;
  latitude: number;
  longitude: number;
  title: string;
  description: string;
  category: string;
  anonymous: boolean;
  photos: string[];
  status?: string;
  user_id?: number | null;
  user?: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
  } | null;
}
