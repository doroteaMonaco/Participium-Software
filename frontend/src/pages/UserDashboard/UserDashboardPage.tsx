import React from "react";
import { DashboardLayout } from "src/components/dashboard/DashboardLayout";
import { StatCard } from "src/components/dashboard/StatCard";
import {
  ReportsTable,
  type Report,
} from "src/components/dashboard/ReportsTable";
import { StatusBadge } from "src/components/dashboard/StatusBadge";

import { MapPin, FileDown } from "lucide-react";

const sampleReports: Report[] = [
  {
    id: "RPT-001",
    title: "Broken streetlight near Via Garibaldi",
    category: "Public Lighting",
    createdAt: "2025-11-02",
    status: "In Progress",
    location: "Turin - Centro",
  },
  {
    id: "RPT-002",
    title: "Overflowing trash bin",
    category: "Waste",
    createdAt: "2025-11-03",
    status: "Assigned",
    location: "San Salvario",
  },
  {
    id: "RPT-003",
    title: "Pothole next to bus stop",
    category: "Roads & Urban Furnishings",
    createdAt: "2025-11-03",
    status: "Pending",
    location: "Aurora",
  },
  {
    id: "RPT-004",
    title: "Damaged playground slide",
    category: "Public Green Areas & Playgrounds",
    createdAt: "2025-10-29",
    status: "Resolved",
    location: "Vanchiglia",
  },
];

export const UserDashboard: React.FC = () => {
  const kpis = [
    { label: "Total Reports", value: 24 },
    { label: "Resolved", value: 9 },
    { label: "In Progress", value: 6 },
    { label: "Pending Approval", value: 3 },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8 w-full max-w-full">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-slate-900">Your Dashboard</h1>
          <p className="text-sm text-slate-600">
            Track your reports, statuses, and progress at a glance.
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((k) => (
            <StatCard key={k.label} label={k.label} value={k.value} />
          ))}
        </div>

        {/* Filters + Actions */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <input
              placeholder="Search by title or ID…"
              className="w-full sm:w-auto sm:min-w-[200px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
            />

            <select className="w-full sm:w-auto rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition">
              <option value="">All categories</option>
              <option>Public Lighting</option>
              <option>Waste</option>
              <option>Roads & Urban Furnishings</option>
              <option>Public Green Areas & Playgrounds</option>
              <option>Water Supply – Drinking Water</option>
              <option>Sewer System</option>
              <option>Road Signs & Traffic Lights</option>
              <option>Architectural Barriers</option>
              <option>Other</option>
            </select>

            <select className="w-full sm:w-auto rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition">
              <option value="">All statuses</option>
              <option>Pending Approval</option>
              <option>Assigned</option>
              <option>In Progress</option>
              <option>Suspended</option>
              <option>Rejected</option>
              <option>Resolved</option>
            </select>
          </div>

          {/* <button
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50 whitespace-nowrap"
            onClick={() => alert("Hook up to CSV export")}
          >
            <FileDown className="h-4 w-4" /> Export CSV
          </button> */}
        </div>

        {/* Content grid */}
        <div className="grid gap-6 grid-cols-1 xl:grid-cols-3">
          {/* Table */}
          <div className="xl:col-span-2 min-w-0">
            <ReportsTable data={sampleReports} />
          </div>

          {/* Map / preview card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <MapPin className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Map preview
                </p>
                <p className="text-xs text-slate-600">
                  Your recent report locations
                </p>
              </div>
            </div>
            <div className="mt-4 aspect-[4/3] w-full rounded-xl bg-gradient-to-br from-indigo-50 to-emerald-50 ring-1 ring-inset ring-slate-200" />
            <p className="mt-3 text-xs text-slate-500">
              Replace this with your actual map component (Leaflet, Mapbox,
              Google Maps).
            </p>

            <div className="mt-4 space-y-2">
              {sampleReports.slice(0, 3).map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
                >
                  <div className="min-w-0 flex-1 mr-2">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {r.title}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {r.location}
                    </p>
                  </div>
                  <StatusBadge status={r.status} compact />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default UserDashboard;
