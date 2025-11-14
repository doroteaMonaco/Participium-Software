import React from "react";
import {
  Clock,
  UserCheck,
  Loader2,
  PauseCircle,
  XCircle,
  CheckCircle2,
} from "lucide-react";
import { Container } from "../shared/Container";
import { SectionTitle } from "../shared/SectionTitle";

interface StatusItem {
  label: string;
  desc: string;
  color: string;
  icon: React.ReactNode;
}

const statusData: StatusItem[] = [
  {
    label: "Pending Approval",
    desc: "Initial moderation by Organization Office.",
    color: "border-indigo-200 bg-indigo-50 text-indigo-700",
    icon: <Clock className="h-5 w-5 text-indigo-600" />,
  },
  {
    label: "Assigned",
    desc: "Forwarded to the competent technical office.",
    color: "border-blue-200 bg-blue-50 text-blue-700",
    icon: <UserCheck className="h-5 w-5 text-blue-600" />,
  },
  {
    label: "In Progress",
    desc: "Intervention scheduled and started.",
    color: "border-amber-200 bg-amber-50 text-amber-700",
    icon: <Loader2 className="h-5 w-5 text-amber-600 animate-spin-slow" />,
  },
  {
    label: "Suspended",
    desc: "Awaiting evaluation or resources.",
    color: "border-slate-200 bg-slate-50 text-slate-600",
    icon: <PauseCircle className="h-5 w-5 text-slate-500" />,
  },
  {
    label: "Rejected",
    desc: "Rejected with an explanation.",
    color: "border-rose-200 bg-rose-50 text-rose-700",
    icon: <XCircle className="h-5 w-5 text-rose-600" />,
  },
  {
    label: "Resolved",
    desc: "Issue fixed and report closed.",
    color: "border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
  },
];

export const Status: React.FC = () => (
  <section id="status" className="bg-white py-20 sm:py-24">
    <Container>
      <SectionTitle
        eyebrow="Lifecycle"
        title="From submission to resolution"
        subtitle="Each report moves through transparent states."
      />
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {statusData.map((s, i) => (
          <div
            key={i}
            className={`flex flex-col rounded-2xl border p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md ${s.color}`}
          >
            <div className="flex items-center gap-3 font-semibold">
              {s.icon}
              <span>{s.label}</span>
            </div>
            <p className="mt-2 text-sm text-slate-700">{s.desc}</p>
          </div>
        ))}
      </div>
    </Container>
  </section>
);
