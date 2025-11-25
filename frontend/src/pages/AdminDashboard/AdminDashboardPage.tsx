import React from "react";
import { AdminDashboardLayout } from "../../components/dashboard/AdminDashboardLayout";
import { motion } from "framer-motion";
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  MapPin,
} from "lucide-react";
import { Link } from "react-router-dom";

interface RecentReport {
  id: string;
  title: string;
  status: string;
  priority: "high" | "medium" | "low";
  category: string;
  createdAt: string;
  location: string;
}

const recentReports: RecentReport[] = [
  {
    id: "RPT-105",
    title: "Broken streetlight on Via Roma",
    status: "Pending",
    priority: "high",
    category: "Public Lighting",
    createdAt: "2025-11-09",
    location: "Centro",
  },
  {
    id: "RPT-104",
    title: "Pothole near school entrance",
    status: "In Progress",
    priority: "high",
    category: "Roads & Urban Furnishings",
    createdAt: "2025-11-08",
    location: "Vanchiglia",
  },
  {
    id: "RPT-103",
    title: "Overflowing trash bin",
    status: "Assigned",
    priority: "medium",
    category: "Waste",
    createdAt: "2025-11-08",
    location: "San Salvario",
  },
  {
    id: "RPT-102",
    title: "Damaged playground equipment",
    status: "Pending",
    priority: "medium",
    category: "Public Green Areas",
    createdAt: "2025-11-07",
    location: "Aurora",
  },
  {
    id: "RPT-101",
    title: "Water leak on street",
    status: "Resolved",
    priority: "low",
    category: "Water Supply",
    createdAt: "2025-11-06",
    location: "Lingotto",
  },
];

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "high":
      return "text-red-600 bg-red-50 border-red-200";
    case "medium":
      return "text-orange-600 bg-orange-50 border-orange-200";
    case "low":
      return "text-green-600 bg-green-50 border-green-200";
    default:
      return "text-slate-600 bg-slate-50 border-slate-200";
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "Pending":
      return "text-yellow-700 bg-yellow-50 border-yellow-200";
    case "In Progress":
      return "text-blue-700 bg-blue-50 border-blue-200";
    case "Assigned":
      return "text-indigo-700 bg-indigo-50 border-indigo-200";
    case "Resolved":
      return "text-green-700 bg-green-50 border-green-200";
    default:
      return "text-slate-600 bg-slate-50 border-slate-200";
  }
};

export const AdminDashboardPage: React.FC = () => {
  const kpis = [
    {
      label: "Total Reports",
      value: 342,
      icon: <FileText className="h-5 w-5" />,
      change: "+12%",
      changeType: "increase" as const,
    },
    {
      label: "Active Reports",
      value: 87,
      icon: <Clock className="h-5 w-5" />,
      change: "+5%",
      changeType: "increase" as const,
    },
    {
      label: "Resolved This Month",
      value: 156,
      icon: <CheckCircle2 className="h-5 w-5" />,
      change: "+18%",
      changeType: "increase" as const,
    },
    {
      label: "High Priority",
      value: 23,
      icon: <AlertCircle className="h-5 w-5" />,
      change: "-8%",
      changeType: "decrease" as const,
    },
  ];

  const categoryStats = [
    { category: "Public Lighting", count: 45, percentage: 15 },
    { category: "Roads & Urban Furnishings", count: 78, percentage: 26 },
    { category: "Waste", count: 62, percentage: 21 },
    { category: "Water Supply", count: 34, percentage: 11 },
    { category: "Public Green Areas", count: 41, percentage: 14 },
    { category: "Other", count: 39, percentage: 13 },
  ];

  return (
    <AdminDashboardLayout>
      <div className="space-y-8 w-full max-w-full">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-sm text-slate-600">
            Overview of all reports and municipality operations
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  {kpi.icon}
                </div>
                <div
                  className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium ${
                    kpi.changeType === "increase"
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  <TrendingUp className="h-3 w-3" />
                  {kpi.change}
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-slate-600">{kpi.label}</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">
                  {kpi.value}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 grid-cols-1 xl:grid-cols-3">
          {/* Recent Reports */}
          <div className="xl:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Recent Reports
              </h2>
              <Link
                to="/admin/reports"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                View all →
              </Link>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="space-y-3"
            >
              {recentReports.map((report, index) => (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-slate-500">
                          {report.id}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${getPriorityColor(
                            report.priority,
                          )}`}
                        >
                          {report.priority}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900 truncate">
                        {report.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-600">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {report.location}
                        </span>
                        <span>•</span>
                        <span>{report.category}</span>
                        <span>•</span>
                        <span>{report.createdAt}</span>
                      </div>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center rounded-lg border px-2.5 py-1 text-xs font-medium ${getStatusColor(
                        report.status,
                      )}`}
                    >
                      {report.status}
                    </span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Category Statistics */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Reports by Category
            </h2>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="space-y-4">
                {categoryStats.map((stat, index) => (
                  <div key={stat.category}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">
                        {stat.category}
                      </span>
                      <span className="text-sm font-semibold text-slate-900">
                        {stat.count}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${stat.percentage}%` }}
                        transition={{ duration: 0.6, delay: index * 0.1 }}
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600"
                      />
                    </div>
                    <span className="text-xs text-slate-500 mt-1">
                      {stat.percentage}% of total
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900">
                    Total Reports
                  </span>
                  <span className="text-2xl font-bold text-indigo-600">
                    299
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </AdminDashboardLayout>
  );
};

export default AdminDashboardPage;
