import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, ShieldCheck, ChevronDown, LogOut } from "lucide-react";
import { useAuth } from "src/contexts/AuthContext";
import { Container } from "src/components/shared/Container";

const HOME_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#categories", label: "Categories" },
  { href: "#status", label: "Status" },
  { href: "#stats", label: "Statistics" },
  { href: "#telegram", label: "Telegram" },
];

const NAV_LINKS = [
  { to: "/users", label: "Users" },
  //   { to: "/map", label: "Map" },
];

const AUTH_BUTTONS = [
  {
    to: "/login",
    label: "Login",
    className:
      "rounded-xl border border-indigo-600 px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors",
    mobileClassName:
      "mt-4 inline-flex w-full items-center justify-center rounded-xl border border-indigo-600 px-4 py-3 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors",
  },
  {
    to: "/register",
    label: "Sign up",
    className:
      "rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm",
    mobileClassName:
      "inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors",
  },
];

export const NavBar: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleHomeClick = (href: string) => {
    if (location.pathname !== "/") {
      navigate("/" + href);
    }

    setTimeout(() => {
      const element = document.querySelector(href);
      element?.scrollIntoView({ behavior: "smooth" });
    }, 100);

    setDropdownOpen(false);
    setMobileDropdownOpen(false);
    setMobileOpen(false);
  };

  const closeMobileMenu = () => setMobileOpen(false);

  const getUserDashboardPath = () => {
    if (!user) return "/dashboard";

    if (user.role === "CITIZEN") return "/dashboard";
    if (user.role === "ADMIN") return "/admin";
    if (user.role === "MUNICIPALITY") return "/municipality/reports";
    return "/dashboard";
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/70 backdrop-blur">
      <Container>
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold text-slate-900">
              Participium
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-6 md:flex">
            {/* Home Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                onMouseEnter={() => setDropdownOpen(true)}
                className="flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
              >
                Home
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {dropdownOpen && (
                <div
                  className="absolute left-0 top-full mt-2 w-48 rounded-xl border border-slate-200 bg-white shadow-lg py-2"
                  onMouseLeave={() => setDropdownOpen(false)}
                >
                  {HOME_LINKS.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={(e) => {
                        e.preventDefault();
                        handleHomeClick(link.href);
                      }}
                      className="block px-4 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Regular Navigation Links */}
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
              >
                {link.label}
              </Link>
            ))}

            {/* Auth Buttons / User */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <Link
                  to={getUserDashboardPath()}
                  className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
                >
                  {user.firstName || user.username || "User"}
                </Link>
                <button
                  onClick={async () => {
                    await logout();
                    navigate("/");
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            ) : (
              <>
                {AUTH_BUTTONS.map((button) => (
                  <Link
                    key={button.to}
                    to={button.to}
                    className={button.className}
                  >
                    {button.label}
                  </Link>
                ))}
              </>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </Container>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden">
          {/* Overlay */}
          <button
            className="fixed inset-0 z-[9998] bg-black/50 cursor-pointer"
            onClick={closeMobileMenu}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") {
                closeMobileMenu();
              }
            }}
            aria-label="Close menu"
            type="button"
          ></button>

          {/* Menu Panel */}
          <div className="fixed right-0 top-0 z-[9999] h-screen w-4/5 max-w-sm bg-white shadow-xl">
            {/* Menu Header */}
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <span className="text-base font-semibold text-slate-900">
                Menu
              </span>
              <button
                className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                onClick={closeMobileMenu}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Menu Content */}
            <nav className="flex flex-col gap-2 p-4 overflow-y-auto max-h-[calc(100vh-5rem)]">
              {/* Home Dropdown in Mobile */}
              <div>
                <button
                  onClick={() => setMobileDropdownOpen(!mobileDropdownOpen)}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all"
                >
                  Home
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${mobileDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {mobileDropdownOpen && (
                  <div className="mt-2 ml-4 space-y-2">
                    {HOME_LINKS.map((link) => (
                      <a
                        key={link.href}
                        href={link.href}
                        onClick={(e) => {
                          e.preventDefault();
                          handleHomeClick(link.href);
                        }}
                        className="block rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Regular Links */}
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all"
                  onClick={closeMobileMenu}
                >
                  {link.label}
                </Link>
              ))}

              {/* Auth Buttons */}
              {AUTH_BUTTONS.map((button) => (
                <Link
                  key={button.to}
                  to={button.to}
                  className={button.mobileClassName}
                  onClick={closeMobileMenu}
                >
                  {button.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
};
