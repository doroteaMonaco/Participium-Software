import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth, type UserRole } from "../contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requiredMunicipalityRole?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requiredMunicipalityRole,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="mt-4 text-sm text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Check role if required
  if (requiredRole && user.role !== requiredRole) {
    // Redirect to appropriate dashboard based on user's role
    if (user.role === "ADMIN") {
      return <Navigate to="/admin" replace />;
    } else if (user.role === "MUNICIPALITY") {
      return <Navigate to="/municipality/technical-reports" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // Check municipality role if required (for MUNICIPALITY users only)
  if (requiredMunicipalityRole && user.role === "MUNICIPALITY") {
    const userMunicipalityRole =
      user.municipality_role?.name?.toLowerCase() || "";
    const requiredRoleLower = requiredMunicipalityRole.toLowerCase();

    // Check if user's municipality role matches the required role
    if (!userMunicipalityRole.includes(requiredRoleLower)) {
      // Public relations officer goes to reports page, all others to technical reports
      if (userMunicipalityRole.includes("municipal public relations officer")) {
        return <Navigate to="/municipality/reports" replace />;
      } else {
        // All other municipality roles go to technical reports
        return <Navigate to="/municipality/technical-reports" replace />;
      }
    }
  }

  // Authenticated and has correct role
  return <>{children}</>;
};
