import axios from "axios";

// ==================== Types ====================

export type ReportCategory =
  | "Water Supply – Drinking Water"
  | "Architectural Barriers"
  | "Sewer System"
  | "Public Lighting"
  | "Waste"
  | "Road Signs and Traffic Lights"
  | "Roads and Urban Furnishings"
  | "Public Green Areas and Playgrounds"
  | "Other";

export interface UserRegistration {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
}

export interface User {
  id?: number;
  firstName?: string;
  lastName?: string;
  username?: string;
  role?: string;
  municipality_role_id?: number;
  municipality_role?: {
    id: number;
    name: string;
  };
  telegramUsername?: string;
  notificationsEnabled?: boolean;
  notifications?: boolean;
  profilePhoto?: string;
}

export interface LoginRequest {
  identifier: string; // username or email
  password: string;
}

export interface ReportRequest {
  title: string;
  description: string;
  anonymous: boolean;
  category: ReportCategory;
  photos: File[]; // 1-3 photos
  latitude?: number;
  longitude?: number;
}

export interface Report {
  id?: number;
  title?: string;
  description?: string;
  anonymous?: boolean;
  category?: ReportCategory;
  photos?: string[]; // URLs
  createdAt?: string;
  latitude?: number;
  longitude?: number;
  status?: ReportStatus;
  rejectionReason?: string;
  assignedOffice?: string;
  user_id?: number | null;
  user?: {
    id: number;
    username: string;
    firstName: string;
    lastName: string;
  } | null;
}

export type ReportStatus =
  | "PENDING_APPROVAL"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "SUSPENDED"
  | "REJECTED"
  | "RESOLVED";

export type ReportStatusFilter = ReportStatus;

export interface ApproveReportRequest {
  status: Extract<ReportStatus, "ASSIGNED" | "REJECTED">;
  category?: string;
  motivation?: string;
}

export interface ApiError {
  error: string;
  message: string;
}

// ==================== Municipality User Types ====================

export interface MunicipalityRole {
  id: number;
  name: string;
}

export interface MunicipalityUserCreateRequest {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  municipality_role_id: number;
}

export interface MunicipalityUser {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  municipality_role_id: number;
  municipality_role?: {
    id: number;
    name: string;
  };
  createdAt: string;
}

// ==================== External Maintainer User Types ====================
export interface ExternalMaintainerUserCreateRequest {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  companyName: string;
  password: string;
  category: string;
}

export interface ExternalMaintainerUser {
  id: number;
  email: string;
  username: string;
  companyName: string;
  category: string;
  createdAt: string;
  reports: Report[];
}

// ==================== API Instance ====================

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api",
  withCredentials: true, // Important: enables cookies for authentication
});

// ==================== Authentication APIs ====================

/**
 * Register a new user
 * @returns User data on success
 * @throws ApiError on failure
 */
export const register = async (userData: UserRegistration): Promise<User> => {
  const response = await api.post("/users", userData);
  return response.data;
};

/**
 * Login with username/email and password
 * @returns User data on success
 * @throws ApiError on failure
 */
export const login = async (credentials: LoginRequest): Promise<User> => {
  const response = await api.post("/auth/session", credentials);
  return response.data;
};

/**
 * Verify if the user is authenticated
 * @returns User data if authenticated
 * @throws ApiError if not authenticated
 */
export const verifyAuth = async (): Promise<User> => {
  const response = await api.get("/auth/session");
  return response.data;
};

/**
 * Logout (client-side - clears cookie)
 * Note: You may need to implement a logout endpoint on the backend
 */
export const logout = async (): Promise<void> => {
  await api.delete("/auth/session");
};

// ==================== Report APIs ====================

/**
 * Create a new report with photos (multipart/form-data)
 * @param formData FormData containing report data and photos
 * @returns Created report
 * @throws ApiError on failure
 */
export const createReport = async (
  reportData: ReportRequest,
): Promise<Report> => {
  const formData = new FormData();

  formData.append("title", reportData.title);
  formData.append("description", reportData.description);
  formData.append("anonymous", String(reportData.anonymous));

  // Map human-friendly category labels to canonical backend enum values
  const mapCategoryToEnum = (label: string) => {
    const s = (label || "").toLowerCase();
    if (s.includes("water") && s.includes("drinking"))
      return "WATER_SUPPLY_DRINKING_WATER";
    if (s.includes("architectur") || s.includes("barrier"))
      return "ARCHITECTURAL_BARRIERS";
    if (s.includes("sewer")) return "SEWER_SYSTEM";
    if (s.includes("light")) return "PUBLIC_LIGHTING";
    if (s.includes("waste") || s.includes("trash")) return "WASTE";
    if (s.includes("road") && (s.includes("sign") || s.includes("traffic")))
      return "ROAD_SIGNS_TRAFFIC_LIGHTS";
    if (s.includes("road") || s.includes("urban") || s.includes("furnish"))
      return "ROADS_URBAN_FURNISHINGS";
    if (s.includes("green") || s.includes("playground"))
      return "PUBLIC_GREEN_AREAS_PLAYGROUNDS";
    return "OTHER";
  };

  const categoryEnum = mapCategoryToEnum(reportData.category as string);
  formData.append("category", categoryEnum);

  // Add coordinates if provided
  if (reportData.latitude !== undefined) {
    // backend expects `latitude`
    formData.append("latitude", String(reportData.latitude));
  }
  if (reportData.longitude !== undefined) {
    // backend expects `longitude`
    formData.append("longitude", String(reportData.longitude));
  }

  // Append photos (1-3 photos)
  reportData.photos.forEach((photo) => {
    formData.append("photos", photo);
  });

  // Let axios set the `Content-Type` including boundary for multipart data
  const response = await api.post("/reports", formData);

  return response.data;
};

/**
 * Get all reports
 * @returns Array of reports
 * @param statusFilter Optional status filter
 * @throws ApiError on failure
 */
export const getReports = async (
  statusFilter?: ReportStatusFilter,
): Promise<Report[]> => {
  const response = await api.get("/reports", {
    params: statusFilter ? { status: statusFilter } : undefined,
  });
  return response.data;
};

/**
 * Get a single report by id
 */
export const getReportById = async (id: string | number): Promise<Report> => {
  const response = await api.get(`/reports/${id}`);
  return response.data;
};

/**
 * Get reports assigned to a municipality officer
 */
export const getAssignedReports = async (
  userId: number,
  statusFilter?: string,
): Promise<Report[]> => {
  const response = await api.get(`/reports/municipality-user/${userId}`, {
    params: statusFilter ? { status: statusFilter } : undefined,
  });
  return response.data;
};

/**
 * Approve or reject a report
 * @param id Report ID
 * @param status "ASSIGNED" or "REJECTED"
 * @param motivation Rejection reason (required if status is "REJECTED")
 * @returns Updated report status
 * @throws ApiError on failure
 */
export const approveOrRejectReport = async (
  id: string | number,
  request: ApproveReportRequest,
): Promise<{ status: string }> => {
  const response = await api.post(`/reports/${id}`, request);
  return response.data;
};

/**
 * Get user's own reports
 * @returns Array of reports
 * @throws ApiError on failure
 */
export const getMyReports = async (): Promise<Report[]> => {
  const response = await api.get("/reports/my");
  return response.data;
};

/**
 * Get reports assigned to a municipality user (technical officer)
 * Requires: MUNICIPALITY role
 * @param municipalityUserId
 * @param statusFilter
 * @returns
 */
export const getAssignedReportsForOfficer = async (
  municipalityUserId: number,
  statusFilter?: ReportStatus,
): Promise<Report[]> => {
  const response = await api.get(
    `/reports/municipality-user/${municipalityUserId}`,
    {
      params: statusFilter ? { status: statusFilter } : undefined,
    },
  );

  return response.data;
};

/**
 * Assign a report to an external maintainer
 * @param reportId Report ID
 * @throws ApiError on failure
 */
export const assignReportToExternalMaintainer = async (
  reportId: number,
): Promise<void> => {
  await api.post(
    `/reports/${reportId}/external-maintainers/`,
  );
};

export const getReportsForExternalMaintainer = async(
  externalMaintainerId: number
): Promise<Report[]> => {
  const response = await api.get(`/reports/external-maintainers/${externalMaintainerId}`);
  return response.data;
};

// ==================== Municipality User APIs ====================

/**
 * Get all municipality roles
 * Requires: ADMIN role
 * @returns Array of municipality roles
 * @throws ApiError on failure
 */
export const getMunicipalityRoles = async (): Promise<MunicipalityRole[]> => {
  const response = await api.get("/users/municipality-users/roles");
  return response.data;
};

/**
 * Get all municipality users
 * Requires: ADMIN role
 * @returns Array of municipality users
 * @throws ApiError on failure
 */
export const getMunicipalityUsers = async (): Promise<MunicipalityUser[]> => {
  const response = await api.get("/users/municipality-users");
  return response.data;
};

/**
 * Create a new municipality user
 * Requires: ADMIN role
 * @param userData Municipality user data
 * @returns Created municipality user
 * @throws ApiError on failure
 */
export const createMunicipalityUser = async (
  userData: MunicipalityUserCreateRequest,
): Promise<MunicipalityUser> => {
  const response = await api.post("/users/municipality-users", userData);
  return response.data;
};

/**
 * Update municipality user's role
 * Requires: ADMIN role
 * @param userId User ID
 * @param roleId New role ID
 * @returns Updated user
 * @throws ApiError on failure
 */
export const updateMunicipalityUserRole = async (
  userId: number,
  roleId: number,
): Promise<MunicipalityUser> => {
  const response = await api.patch(`/users/${userId}`, {
    municipality_role_id: roleId,
  });
  return response.data;
};

// ==================== External Maintainer User APIs ====================
/**
 * Create a new external maintainer user
 * @param userData 
 * @returns Created external maintainer user
 * @throws ApiError on failure
 */
export const createExternalMaintainerUser = async (
  userData: ExternalMaintainerUserCreateRequest,
): Promise<any> => {
  const response = await api.post("/users/external-users", userData);
  return response.data;
}

/**
 * Get all external maintainer users
 * @returns 
 * @throws ApiError on failure
 */
export const getExternalMaintainerUsers = async (): Promise<ExternalMaintainerUser[]> => {
  const response = await api.get("/users/external-users");
  return response.data;
}

// ==================== Citizen Profile APIs ====================

/**
 * Update citizen profile (photo, telegram, notifications)
 * Requires: CITIZEN role
 * @param formData FormData containing profile data
 * @returns Success response
 * @throws ApiError on failure
 */
export const updateCitizenProfile = async (
  formData: FormData,
): Promise<void> => {
  await api.patch("/users", formData);
};

export default api;
