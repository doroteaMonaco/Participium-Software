import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth, type UserRole } from "../contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requiredMunicipalityRole?: string;
}

const getDefaultDashboard = (role: UserRole | string): string => {
  if (role === "ADMIN") return "/admin";
  if (role === "MUNICIPALITY") return "/municipality/technical-reports";
  if (role === "EXTERNAL_MAINTAINER") return "/maintainer";
  return "/dashboard";
};

const getMunicipalityRedirect = (municipalityRole: string): string => {
  const roleLower = municipalityRole.toLowerCase();
  if (roleLower.includes("municipal public relations officer")) {
    return "/municipality/reports";
  }
  return "/municipality/technical-reports";
};

const hasRequiredMunicipalityRole = (
  userRole: string,
  requiredRole: string,
): boolean => {
  return userRole.toLowerCase().includes(requiredRole.toLowerCase());
};

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
  if (!isAuthenticated || !user || !user.role) {
    return <Navigate to="/login" replace />;
  }

  const userRole = user.role;

  // Check role if required
  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to={getDefaultDashboard(userRole)} replace />;
  }

  // Check municipality role if required (for MUNICIPALITY users only)
  if (requiredMunicipalityRole && userRole === "MUNICIPALITY") {
    const userMunicipalityRole = user.municipality_role?.name || "";

    if (
      !hasRequiredMunicipalityRole(
        userMunicipalityRole,
        requiredMunicipalityRole,
      )
    ) {
      return (
        <Navigate to={getMunicipalityRedirect(userMunicipalityRole)} replace />
      );
    }
  }

  // Authenticated and has correct role
  return <>{children}</>;
};
