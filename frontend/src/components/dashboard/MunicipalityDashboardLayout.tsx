import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UnifiedSidebar } from "./UnifiedSidebar";
import { Topbar } from "./Topbar";
import { useAuth } from "src/contexts/AuthContext";

export const MunicipalityDashboardLayout: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-svh w-full bg-slate-50">
      {/* Municipality Sidebar */}
      <UnifiedSidebar
        role="MUNICIPALITY"
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        municipalityRole={user?.municipality_role?.name}
      />
      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col lg:ml-64">
        <Topbar
          onMenuClick={() => setMobileMenuOpen(true)}
          onLogout={handleLogout}
          title="Municipality Dashboard"
        />
        <main className="flex-1 w-full max-w-full overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl w-full">{children}</div>
        </main>
      </div>
    </div>
  );
};
