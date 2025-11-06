import axios from 'axios';

// ==================== Types ====================

export type ReportCategory =
  | 'Water Supply – Drinking Water'
  | 'Architectural Barriers'
  | 'Sewer System'
  | 'Public Lighting'
  | 'Waste'
  | 'Road Signs and Traffic Lights'
  | 'Roads and Urban Furnishings'
  | 'Public Green Areas and Playgrounds'
  | 'Other';

export interface UserRegistration {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
}

export interface User {
  firstName?: string;
  lastName?: string;
  username?: string;
}

export interface LoginRequest {
  identifier: string; // username or email
  password: string;
}

// export interface ReportRequest {
//   title: string;
//   description: string;
//   anonymous: boolean;
//   category: ReportCategory;
//   photos: File[]; // 1-3 photos
// }

export interface Report {
  id?: number;
  title?: string;
  description?: string;
  anonymous?: boolean;
  category?: ReportCategory;
  photos?: string[]; // URLs
  createdAt?: string;
}

export interface ApiError {
  error: string;
  message: string;
}

// ==================== API Instance ====================

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  withCredentials: true, // Important: enables cookies for authentication
});

// ==================== Authentication APIs ====================

/**
 * Register a new user
 * @returns User data on success
 * @throws ApiError on failure
 */
export const register = async (userData: UserRegistration): Promise<User> => {
  const response = await api.post('/users', userData);
  return response.data;
};

/**
 * Login with username/email and password
 * @returns User data on success
 * @throws ApiError on failure
 */
export const login = async (credentials: LoginRequest): Promise<User> => {
  const response = await api.post('/auth/session', credentials);
  return response.data;
};

/**
 * Verify if the user is authenticated
 * @returns User data if authenticated
 * @throws ApiError if not authenticated
 */
export const verifyAuth = async (): Promise<User> => {
  const response = await api.get('/auth/session');
  return response.data;
};

/**
 * Logout (client-side - clears cookie)
 * Note: You may need to implement a logout endpoint on the backend
 */
export const logout = async (): Promise<void> => {
  await api.delete('/auth/session');
};

// ==================== Report APIs ====================

/**
 * Create a new report with photos (multipart/form-data)
 * @param reportData Report data including photos as File objects
 * @returns Created report
 * @throws ApiError on failure
 */
export const createReport = async (): Promise<Report> => {
  const formData = new FormData();

  // formData.append('title', reportData.title);
  // formData.append('description', reportData.description);
  // formData.append('anonymous', String(reportData.anonymous));
  // formData.append('category', reportData.category);

  // // Append photos (1-3 photos)
  // reportData.photos.forEach((photo) => {
  //   formData.append('photos', photo);
  // });

  const response = await api.post('/reports', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

export default api;