import React, { useEffect, useState } from "react";
import { DashboardLayout } from "src/components/dashboard/DashboardLayout";
import { StatCard } from "src/components/dashboard/StatCard";
import {
  ReportsTable,
  type Report as TableReport,
} from "src/components/dashboard/ReportsTable";
import { StatusBadge } from "src/components/dashboard/StatusBadge";
import { getReports } from "src/services/api";
import { ReportModel, ReportStatus } from "src/services/models";
import { useAuth } from "src/contexts/AuthContext";

import { MapPin } from "lucide-react";

// Map backend status to UI status
const mapStatus = (status: ReportStatus): string => {
  switch (status) {
    case ReportStatus.PENDING:
      return "Pending";
    case ReportStatus.ASSIGNED:
      return "Assigned";
    case ReportStatus.IN_PROGRESS:
      return "In Progress";
    case ReportStatus.SUSPENDED:
      return "Suspended";
    case ReportStatus.REJECTED:
      return "Rejected";
    case ReportStatus.RESOLVED:
      return "Resolved";
    default:
      return "Pending";
  }
};

export const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<ReportModel[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const data = await getReports();
        const reportsData = data
          .filter((r) => r.user_id === user?.id)
          .map((r) => new ReportModel(r));
        setReports(reportsData);
      } catch (err) {
        console.error("Error fetching reports:", err);
      }
    };

    if (user?.id) {
      fetchReports();
    }
  }, [user?.id]);

  // Filter reports based on search and filters
  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      (report.title ?? "")
        .toString()
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      (report.id ?? "")
        .toString()
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter
      ? report.category === categoryFilter
      : true;

    const matchesStatus = statusFilter ? report.status === statusFilter : true;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Calculate KPIs
  const totalReports = reports.length;
  const resolvedCount = reports.filter(
    (r) => r.status === ReportStatus.RESOLVED,
  ).length;
  const inProgressCount = reports.filter(
    (r) => r.status === ReportStatus.IN_PROGRESS,
  ).length;
  const pendingCount = reports.filter(
    (r) => r.status === ReportStatus.PENDING,
  ).length;

  const kpis = [
    { label: "Total Reports", value: totalReports },
    { label: "Resolved", value: resolvedCount },
    { label: "In Progress", value: inProgressCount },
    { label: "Pending Approval", value: pendingCount },
  ];

  // Convert to table format
  const tableReports: TableReport[] = filteredReports.map((r) => ({
    id: `RPT-${r.id}`,
    title: r.title,
    category: r.category,
    createdAt: new Date(r.createdAt).toLocaleDateString(),
    status: mapStatus(r.status) as any,
    location: `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`,
  }));

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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-auto sm:min-w-[200px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
            />

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full sm:w-auto rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
            >
              <option value="">All categories</option>
              <option>Public Lighting</option>
              <option>Waste</option>
              <option>Roads and Urban Furnishings</option>
              <option>Public Green Areas and Playgrounds</option>
              <option>Water Supply – Drinking Water</option>
              <option>Sewer System</option>
              <option>Road Signs and Traffic Lights</option>
              <option>Architectural Barriers</option>
              <option>Other</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
            >
              <option value="">All statuses</option>
              <option value={ReportStatus.PENDING}>Pending</option>
              <option value={ReportStatus.ASSIGNED}>Assigned</option>
              <option value={ReportStatus.IN_PROGRESS}>In Progress</option>
              <option value={ReportStatus.SUSPENDED}>Suspended</option>
              <option value={ReportStatus.REJECTED}>Rejected</option>
              <option value={ReportStatus.RESOLVED}>Resolved</option>
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
            <ReportsTable data={tableReports} />
          </div>

          {/* Map / preview card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <MapPin className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Recent Reports
                </p>
                <p className="text-xs text-slate-600">
                  Your latest submissions
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {filteredReports.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">
                  No reports found
                </p>
              ) : (
                filteredReports.slice(0, 5).map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
                  >
                    <div className="min-w-0 flex-1 mr-2">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {r.title}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {r.category}
                      </p>
                    </div>
                    <StatusBadge status={mapStatus(r.status) as any} compact />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default UserDashboard;
