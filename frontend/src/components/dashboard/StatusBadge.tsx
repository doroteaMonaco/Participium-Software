import React from "react";
import {
  Clock,
  UserCheck,
  Loader2,
  PauseCircle,
  XCircle,
  CheckCircle2,
} from "lucide-react";

export type ReportStatus =
  | "Pending"
  | "Assigned"
  | "In Progress"
  | "Suspended"
  | "Rejected"
  | "Resolved";

const map = {
  Pending: {
    wrap: "bg-indigo-50 text-indigo-700 border-indigo-200",
    icon: <Clock className="h-3.5 w-3.5 text-indigo-600" />,
  },
  Assigned: {
    wrap: "bg-blue-50 text-blue-700 border-blue-200",
    icon: <UserCheck className="h-3.5 w-3.5 text-blue-600" />,
  },
  "In Progress": {
    wrap: "bg-amber-50 text-amber-700 border-amber-200",
    icon: <Loader2 className="h-3.5 w-3.5 text-amber-600 " />,
  },
  Suspended: {
    wrap: "bg-slate-50 text-slate-700 border-slate-200",
    icon: <PauseCircle className="h-3.5 w-3.5 text-slate-500" />,
  },
  Rejected: {
    wrap: "bg-rose-50 text-rose-700 border-rose-200",
    icon: <XCircle className="h-3.5 w-3.5 text-rose-600" />,
  },
  Resolved: {
    wrap: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />,
  },
} as const;

export const StatusBadge: React.FC<{
  status: ReportStatus;
  compact?: boolean;
}> = ({ status, compact }) => {
  const s = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 ${compact ? "py-0.5 text-xs" : "py-1 text-xs"} ${s.wrap}`}
    >
      {s.icon}
      {status}
    </span>
  );
};
