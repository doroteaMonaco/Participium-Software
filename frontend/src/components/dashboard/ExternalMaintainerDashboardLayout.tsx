import React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UnifiedSidebar } from "./UnifiedSidebar";
import { Topbar } from "./Topbar";
import { useAuth } from "src/contexts/AuthContext";

interface ExternalMaintainerDashboardLayoutProps {
  children: React.ReactNode;
}

export const ExternalMaintainerDashboardLayout: React.FC<
  ExternalMaintainerDashboardLayoutProps
> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-svh w-full bg-slate-50">
      {/* Sidebar */}
      <UnifiedSidebar
        role="EXTERNAL_MAINTAINER"
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />
      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col lg:ml-64">
        <Topbar
          onMenuClick={() => setMobileMenuOpen(true)}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-100 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
