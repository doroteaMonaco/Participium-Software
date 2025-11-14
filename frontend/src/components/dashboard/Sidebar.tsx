// src/dashboard/components/Sidebar.tsx
import React from "react";
import {
  ShieldCheck,
  LayoutDashboard,
  FilePlus2,
  BarChart3,
  MessageSquare,
  X,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const nav = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    href: "/dashboard/new-report",
    label: "New Report",
    icon: <FilePlus2 className="h-4 w-4" />,
  },
  {
    href: "/dashboard/stats",
    label: "Statistics",
    icon: <BarChart3 className="h-4 w-4" />,
  },
  {
    href: "/dashboard/messages",
    label: "Messages",
    icon: <MessageSquare className="h-4 w-4" />,
  },
];

interface SidebarProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  mobileMenuOpen,
  setMobileMenuOpen,
}) => {
  const { pathname } = useLocation();

  const navContent = (
    <>
      <div className="flex h-16 items-center justify-between gap-2 border-b border-slate-200 px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <span className="text-sm font-semibold text-slate-900">
            Participium
          </span>
        </div>
        {/* Close button for mobile */}
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100"
        >
          <X className="h-5 w-5 text-slate-700" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {nav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition
                ${
                  active
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                    : "text-slate-700 hover:bg-slate-50 border border-transparent"
                }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 text-xs text-slate-400">
        © {new Date().getFullYear()} Participium
      </div>
    </>
  );

  return (
    <>
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 flex-col border-r border-slate-200 bg-white shadow-xl
          transform transition-transform duration-300 ease-in-out lg:hidden h-screen overflow-auto
          ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {navContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className="
          hidden lg:flex
          fixed inset-y-0 left-0 z-40
          w-64 flex-col border-r border-slate-200 bg-white
          shadow-sm
        "
      >
        {navContent}
      </aside>
    </>
  );
};
