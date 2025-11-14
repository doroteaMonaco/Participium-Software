import React from "react";

export const StatCard: React.FC<{
  label: string;
  value: number | string;
  helper?: string;
}> = ({ label, value, helper }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <p className="text-xs font-medium text-slate-500">{label}</p>
    <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    {helper && <p className="mt-1 text-xs text-slate-500">{helper}</p>}
  </div>
);
