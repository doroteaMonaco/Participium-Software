// Municipality Sidebar Component
import React from "react";
import {
  Building2,
  LayoutDashboard,
  FileText,
  Wrench,
  MapPin,
  BarChart3,
  Settings,
  X,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const municipalityNav = [
  {
    href: "/municipality",
    label: "Dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    href: "/municipality/reports",
    label: "Review Reports",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    href: "/municipality/technical-reports",
    label: "Technical Office",
    icon: <Wrench className="h-4 w-4" />,
  },
  {
    href: "/municipality/map",
    label: "Map View",
    icon: <MapPin className="h-4 w-4" />,
  },
  {
    href: "/municipality/analytics",
    label: "Analytics",
    icon: <BarChart3 className="h-4 w-4" />,
  },
  {
    href: "/municipality/settings",
    label: "Settings",
    icon: <Settings className="h-4 w-4" />,
  },
];

interface MunicipalitySidebarProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export const MunicipalitySidebar: React.FC<MunicipalitySidebarProps> = ({
  mobileMenuOpen,
  setMobileMenuOpen,
}) => {
  const { pathname } = useLocation();

  const navContent = (
    <>
      <div className="flex h-16 items-center justify-between gap-2 border-b border-slate-200 px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-sm font-bold text-slate-900">
              Participium
            </span>
            <p className="text-xs text-slate-500">Municipality Panel</p>
          </div>
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
        {municipalityNav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition
                ${
                  active
                    ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-sm"
                    : "text-slate-700 hover:bg-slate-50 border border-transparent"
                }`}
            >
              <span className={active ? "text-blue-600" : "text-slate-500"}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200">
        <div className="rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 p-4">
          <p className="text-xs font-semibold text-slate-900 mb-1">
            Municipality Staff
          </p>
          <p className="text-xs text-slate-600">Internal Access</p>
        </div>
      </div>

      <div className="px-4 pb-4 text-xs text-slate-400">
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
