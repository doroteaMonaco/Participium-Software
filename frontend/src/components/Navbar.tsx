import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, ShieldCheck } from "lucide-react";
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
        if (href.startsWith('#')) {
            if (window.location.pathname !== '/') {
                navigate('/' + href);
            }
            // Scroll to element
            setTimeout(() => {
                const element = document.querySelector(href);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
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
                        <span className="text-lg font-semibold text-slate-900">Participium</span>
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
                        <Link to="/users" className="text-sm font-medium text-slate-700 hover:text-slate-900">
                            Users
                        </Link>
                        <a href="#cta" className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Sign up</a>
                    </nav>
                    <button className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg border" onClick={() => setOpen(true)}>
                        <Menu className="h-5 w-5" />
                    </button>
                </div>
            </Container>
            {open && (
                <div className="md:hidden">
                    <div className="fixed inset-0 z-50 bg-black/20" onClick={() => setOpen(false)} />
                    <div className="fixed right-0 top-0 z-50 h-full w-80 bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b p-4">
                            <span className="text-base font-semibold text-slate-900">Menu</span>
                            <button className="h-9 w-9 rounded-lg border" onClick={() => setOpen(false)}>
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <nav className="flex flex-col gap-3 p-4">
                            {links.map((l) => (
                                <a
                                    key={l.href}
                                    href={l.href}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleLinkClick(l.href);
                                    }}
                                    className="rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-50 cursor-pointer"
                                >
                                    {l.label}
                                </a>
                            ))}
                            <Link to="/users" className="rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-50" onClick={() => setOpen(false)}>
                                Users
                            </Link>
                            <a href="#cta" className="mt-2 inline-flex justify-center rounded-xl bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">Sign up</a>
                        </nav>
                    </div>
                </div>
            )}
        </header>
    );
};