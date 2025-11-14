import React from "react";
import { StatusBadge, type ReportStatus } from "./StatusBadge";

export interface Report {
  id: string;
  title: string;
  category: string;
  createdAt: string; // ISO date
  status: ReportStatus;
  location: string;
}

export const ReportsTable: React.FC<{ data: Report[] }> = ({ data }) => {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Report</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Created</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Location</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{r.title}</div>
                  <div className="text-xs text-slate-500">{r.id}</div>
                </td>
                <td className="px-4 py-3 text-slate-700">{r.category}</td>
                <td className="px-4 py-3 text-slate-700">{r.createdAt}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-3 text-slate-700">{r.location}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* simple footer */}
      <div className="flex items-center justify-between px-4 py-3 text-xs text-slate-500 bg-slate-50 border-t border-slate-200">
        <span>{data.length} results</span>
        <div className="space-x-1">
          <button className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 hover:bg-slate-100">
            Prev
          </button>
          <button className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 hover:bg-slate-100">
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
