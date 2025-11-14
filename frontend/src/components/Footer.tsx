import React from "react";
import { ShieldCheck } from "lucide-react";
import { Container } from "../components/shared/Container";

export const Footer: React.FC = () => (
  <footer className="border-t border-slate-200 bg-white py-10">
    <Container>
      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <span className="text-sm font-semibold text-slate-900">
            Participium
          </span>
        </div>
        <p className="text-center text-xs text-slate-500 sm:text-right">
          © {new Date().getFullYear()} Municipality of Turin • Designed for
          transparency & accessibility
        </p>
      </div>
    </Container>
  </footer>
);

export default Footer;
