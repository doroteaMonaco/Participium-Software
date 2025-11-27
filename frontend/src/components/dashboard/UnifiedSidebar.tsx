import React from "react";
import {
  ShieldCheck,
  Shield,
  Building2,
  LayoutDashboard,
  FilePlus2,
  FileText,
  Users,
  Wrench,
  MapPin,
  BarChart3,
  Settings,
  MessageSquare,
  X,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

type UserRole = "CITIZEN" | "ADMIN" | "MUNICIPALITY";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface RoleConfig {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  activeColor: string;
  bgColor: string;
  borderColor: string;
  iconColor: string;
  footerBg: string;
  footerText: string;
  navItems: NavItem[];
}

const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  CITIZEN: {
    icon: <ShieldCheck className="h-5 w-5" />,
    title: "Participium",
    subtitle: "",
    activeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    bgColor: "bg-indigo-600",
    borderColor: "border-indigo-200",
    iconColor: "text-indigo-600",
    footerBg: "",
    footerText: "",
    navItems: [
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
      {
        href: "/dashboard/settings",
        label: "Settings",
        icon: <Settings className="h-4 w-4" />,
      },
    ],
  },
  ADMIN: {
    icon: <Shield className="h-5 w-5" />,
    title: "Participium",
    subtitle: "Admin Panel",
    activeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    bgColor: "bg-gradient-to-br from-indigo-600 to-indigo-700",
    borderColor: "border-indigo-200",
    iconColor: "text-indigo-600",
    footerBg: "bg-gradient-to-br from-indigo-50 to-blue-50",
    footerText: "Administrator • Full system access",
    navItems: [
      {
        href: "/admin",
        label: "Dashboard",
        icon: <LayoutDashboard className="h-4 w-4" />,
      },
      {
        href: "/admin/users",
        label: "Municipality Users",
        icon: <Users className="h-4 w-4" />,
      },
      {
        href: "/admin/map",
        label: "Map View",
        icon: <MapPin className="h-4 w-4" />,
      },
      {
        href: "/admin/analytics",
        label: "Analytics",
        icon: <BarChart3 className="h-4 w-4" />,
      },
      {
        href: "/admin/settings",
        label: "Settings",
        icon: <Settings className="h-4 w-4" />,
      },
    ],
  },
  MUNICIPALITY: {
    icon: <Building2 className="h-5 w-5" />,
    title: "Participium",
    subtitle: "Municipality Panel",
    activeColor: "bg-blue-50 text-blue-700 border-blue-200",
    bgColor: "bg-gradient-to-br from-blue-600 to-blue-700",
    borderColor: "border-blue-200",
    iconColor: "text-blue-600",
    footerBg: "bg-gradient-to-br from-blue-50 to-cyan-50",
    footerText: "Municipality Staff • Internal Access",
    navItems: [
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
    ],
  },
};

interface UnifiedSidebarProps {
  role: UserRole;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  municipalityRole?: string;
}

export const UnifiedSidebar: React.FC<UnifiedSidebarProps> = ({
  role,
  mobileMenuOpen,
  setMobileMenuOpen,
  municipalityRole,
}) => {
  const { pathname } = useLocation();
  const config = ROLE_CONFIGS[role];

  // Filter nav items based on municipality role
  const filteredNavItems = React.useMemo(() => {
    if (role !== "MUNICIPALITY") {
      return config.navItems;
    }

    // For municipality users, check if they can access each page
    const isPublicRelations = municipalityRole
      ?.toLowerCase()
      .includes("municipal public relations officer");

    return config.navItems.filter((item) => {
      // Show "Review Reports" only to public relations officers
      if (item.href === "/municipality/reports" && !isPublicRelations) {
        return false;
      }
      // Show "Technical Reports" to all municipality users except public relations officers
      if (
        item.href === "/municipality/technical-reports" &&
        isPublicRelations
      ) {
        return false;
      }
      return true;
    });
  }, [role, municipalityRole, config.navItems]);

  const navContent = (
    <>
      {/* Header */}
      <div className="flex h-16 items-center justify-between gap-2 border-b border-slate-200 px-4">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl ${config.bgColor} text-white shadow-md`}
          >
            {config.icon}
          </div>
          <div>
            <span className="text-sm font-bold text-slate-900">
              {config.title}
            </span>
            {config.subtitle && (
              <p className="text-xs text-slate-500">{config.subtitle}</p>
            )}
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

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {filteredNavItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition
                ${
                  active
                    ? `${config.activeColor} shadow-sm`
                    : "text-slate-700 hover:bg-slate-50 border border-transparent"
                }`}
            >
              <span className={active ? config.iconColor : "text-slate-500"}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      {config.footerText && (
        <div className="p-4 border-t border-slate-200">
          <div className={`rounded-xl ${config.footerBg} p-4`}>
            <p className="text-xs text-slate-600">{config.footerText}</p>
          </div>
        </div>
      )}

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
