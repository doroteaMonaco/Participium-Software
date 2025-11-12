import React, { useState } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { Topbar } from "./Topbar";

export const AdminDashboardLayout: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 w-full max-w-full overflow-x-hidden">
          <div className="max-w-7xl mx-auto w-full">{children}</div>
        </main>
      </div>
    </div>
  );
};
