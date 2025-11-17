import React from "react";
import { Menu, Bell, LogOut } from "lucide-react";

interface TopbarProps {
  onMenuClick: () => void;
  onLogout?: () => void;
  title?: string;
}
export const Topbar: React.FC<TopbarProps> = ({
  onMenuClick,
  onLogout,
  title = "Dashboard",
}) => {
  return (
    <div className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-slate-50 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="inline-flex lg:hidden h-10 w-10 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-100 transition"
        >
          <Menu className="h-5 w-5 text-slate-700" />
        </button>
        <span className="text-sm font-semibold text-slate-900">{title}</span>
      </div>
      <div className="flex items-center gap-2">
        <button className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-100 transition">
          <Bell className="h-5 w-5 text-slate-700" />
        </button>
        {onLogout && (
          <button
            onClick={onLogout}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-red-50 hover:bg-red-100 transition"
            title="Logout"
          >
            <LogOut className="h-5 w-5 text-red-600" />
          </button>
        )}
      </div>
    </div>
  );
};
