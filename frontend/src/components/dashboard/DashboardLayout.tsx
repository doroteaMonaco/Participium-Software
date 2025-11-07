import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export const DashboardLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (

    <div className="flex min-h-svh w-full overflow-x-hidden">
      {/* Sidebar */}
      <Sidebar
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <Topbar onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>

      </div> </div>
  );
};
