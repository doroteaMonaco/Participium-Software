import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, ShieldCheck, ArrowRight } from "lucide-react";
import { Container } from "src/components/shared/Container";

export const NavBar: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();

  const links = [
    { href: "#features", label: "Features" },
    { href: "#categories", label: "Categories" },
    { href: "#status", label: "Status" },
    { href: "#stats", label: "Statistics" },
    { href: "#telegram", label: "Telegram" },
  ];

  const handleLinkClick = (href: string) => {
    if (href.startsWith("#")) {
      if (window.location.pathname !== "/") {
        navigate("/" + href);
      }
      // Scroll to element
      setTimeout(() => {
        const element = document.querySelector(href);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    }
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/70 backdrop-blur">
      <Container>
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold text-slate-900">
              Participium
            </span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleLinkClick(l.href);
                }}
                className="text-sm font-medium text-slate-700 hover:text-slate-900 cursor-pointer"
              >
                {l.label}
              </a>
            ))}
            <Link
              to="/users"
              className="text-sm font-medium text-slate-700 hover:text-slate-900"
            >
              Users
            </Link>
            <Link
              to="/map"
              className="text-sm font-medium text-slate-700 hover:text-slate-900"
            >
              Map
            </Link>
            <Link
              to="/register"
              className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Sign up
            </Link>
          </nav>
          <button
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg border"
            onClick={() => setOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </Container>
      {open && (
        <div className="md:hidden">
          <div
            className="fixed inset-0 z-50 bg-black/20"
            onClick={() => setOpen(false)}
          />
          <div className="fixed right-0 top-0 z-50 h-screen w-2/3 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b p-4">
              <span className="text-base font-semibold text-slate-900">
                Menu
              </span>
              <button
                className="h-9 w-9 rounded-lg border"
                onClick={() => setOpen(false)}
              >
                <div className="w-full h-full flex items-center justify-center">
                  <X className="h-5 w-5" />
                </div>
              </button>
            </div>
            <nav className="flex flex-col gap-3 p-5 text-base font-medium text-slate-700">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={(e) => {
                    e.preventDefault();
                    handleLinkClick(l.href);
                  }}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 shadow-sm hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all"
                >
                  {l.label}
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600" />
                </a>
              ))}

              <Link
                to="/users"
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 shadow-sm hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all"
                onClick={() => setOpen(false)}
              >
                Users
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>

              <Link
                to="/map"
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 shadow-sm hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-all"
                onClick={() => setOpen(false)}
              >
                Map
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>

              <Link
                to="/register"
                className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-all"
                onClick={() => setOpen(false)}
              >
                Sign up
              </Link>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
};
