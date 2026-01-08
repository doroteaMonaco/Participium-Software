import React from "react";
import { Menu, Bell, LogOut } from "lucide-react";
import { useAuth } from "src/contexts/AuthContext";

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
  const { user } = useAuth();

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
        {/* User Info */}
        {user && (
          <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs font-bold shadow-sm">
              {(user.firstName?.[0] || user.username?.[0] || "U").toUpperCase()}
            </div>
            <span className="text-sm font-semibold text-slate-900">
              {user.firstName || user.username || "User"}
            </span>
          </div>
        )}
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
