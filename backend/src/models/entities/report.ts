import { ReportStatus } from "../enums";

export interface Report {
  id?: number;
  latitude: number;
  longitude: number;
  title: string;
  description: string;
  category: string;
  photoKeys: string[]; // Keys for images stored in Redis
  status: ReportStatus;
  user_id?: number | null;
}
