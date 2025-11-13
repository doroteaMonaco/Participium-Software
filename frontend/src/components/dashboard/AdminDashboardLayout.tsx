import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminSidebar } from "./AdminSidebar";
import { Topbar } from "./Topbar";

export const AdminDashboardLayout: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear(); // Clear user session data
    navigate("/login");
  };

  return (
    <div className="flex min-h-svh w-full bg-slate-50">
      {/* Admin Sidebar */}
      <AdminSidebar
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />
      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col lg:ml-64">
        <Topbar onMenuClick={() => setMobileMenuOpen(true)} />
        <button
          onClick={handleLogout}
          className="absolute top-4 right-4 rounded bg-red-500 px-4 py-2 text-white"
        >
          Logout
        </button>
        <main className="flex-1 w-full max-w-full overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl w-full">{children}</div>
        </main>
      </div>
    </div>
  );
};
