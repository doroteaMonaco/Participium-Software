# API Service Usage Guide

This guide shows how to use the API service functions in your React components.

## Import

```typescript
import {
  register,
  login,
  verifyAuth,
  logout,
  createReport,
  type UserRegistration,
  type LoginRequest,
  type ReportRequest,
  type User,
  type Report,
  type ReportCategory,
} from './services/api';
```

## Authentication

### Register a New User

```typescript
const handleRegister = async () => {
  try {
    const userData: UserRegistration = {
      firstName: 'Mario',
      lastName: 'Rossi',
      username: 'mrossi',
      email: 'mario.rossi@example.com',
      password: 'P@ssw0rd!',
    };
    
    const user = await register(userData);
    console.log('Registration successful:', user);
    // User is automatically authenticated (cookie set by server)
    // Redirect to /reports or dashboard
  } catch (error: any) {
    if (error.response?.status === 409) {
      console.error('Username or email already exists');
    } else if (error.response?.status === 400) {
      console.error('Invalid input data');
    } else {
      console.error('Registration failed:', error);
    }
  }
};
```

### Login

```typescript
const handleLogin = async () => {
  try {
    const credentials: LoginRequest = {
      identifier: 'mrossi', // can be username or email
      password: 'P@ssw0rd!',
    };
    
    const user = await login(credentials);
    console.log('Login successful:', user);
    // Cookie is automatically set by server
    // Redirect to /reports or dashboard
  } catch (error: any) {
    if (error.response?.status === 401) {
      console.error('Invalid username or password');
    } else {
      console.error('Login failed:', error);
    }
  }
};
```

### Verify Authentication

```typescript
const checkAuth = async () => {
  try {
    const user = await verifyAuth();
    console.log('User is authenticated:', user);
    return true;
  } catch (error: any) {
    if (error.response?.status === 401) {
      console.log('User is not authenticated');
      // Redirect to login page
    }
    return false;
  }
};
```

### Logout

```typescript
const handleLogout = async () => {
  try {
    await logout();
    console.log('Logged out successfully');
  } catch (error: any) {
    if (error.response?.status === 401) {
      console.error('Logout failed:', error.response.data?.message);
    } else {
      console.error('Logout failed:', error);
    }
  }
};
```

## Reports

### Create a Report with Photos

```typescript
const handleCreateReport = async (files: File[]) => {
  try {
    // Validate number of photos (1-3)
    if (files.length < 1 || files.length > 3) {
      throw new Error('Please upload between 1 and 3 photos');
    }
    
    const reportData: ReportRequest = {
      title: 'Broken street light',
      description: 'The street light on Via Roma has been broken for a week',
      anonymous: false,
      category: 'Public Lighting', // must match ReportCategory enum
      photos: files, // File objects from <input type="file">
    };
    
    const report = await createReport(reportData);
    console.log('Report created successfully:', report);
    // Show success message and redirect
  } catch (error: any) {
    if (error.response?.status === 401) {
      console.error('You must be logged in to create a report');
      // Redirect to login
    } else if (error.response?.status === 400) {
      console.error('Invalid report data');
    } else {
      console.error('Failed to create report:', error);
    }
  }
};
```

## Important Notes

### Cookie Handling
- The API client is configured with `withCredentials: true` to automatically handle authentication cookies
- Cookies are set by the server on successful registration/login
- Cookies are automatically sent with every request to authenticated endpoints
- The `logout()` function calls `DELETE /auth` on the backend to invalidate the session

### Error Handling
Always wrap API calls in try-catch blocks and handle specific HTTP status codes:
- `400`: Bad Request - Invalid input data
- `401`: Unauthorized - Not authenticated or invalid credentials
- `409`: Conflict - Username/email already exists (registration)

**Note**: Axios automatically throws an error for non-2xx status codes. The error object contains:
- `error.response.status` - HTTP status code
- `error.response.data` - Response body (usually `{ error: string, message: string }`)
- `error.response.headers` - Response headers

Optionally use `axios.isAxiosError(error)` to check if the error is from Axios.

### File Upload
- The `createReport` function automatically handles multipart/form-data encoding
- Photos must be File objects (from `<input type="file">`)
- Minimum 1 photo, maximum 3 photos per report

### TypeScript
All functions are fully typed. Import and use the provided interfaces for type safety:
- `UserRegistration` - Registration data
- `LoginRequest` - Login credentials
- `ReportRequest` - Report creation data
- `User` - User data returned by API
- `Report` - Report data returned by API
- `ReportCategory` - Valid report categories (enum type)
- `ApiError` - Error response structure
