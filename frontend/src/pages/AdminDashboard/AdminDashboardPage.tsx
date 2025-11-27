import React, { useState, useEffect } from "react";
import { AdminDashboardLayout } from "../../components/dashboard/AdminDashboardLayout";
import { motion } from "framer-motion";
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import { getReports, type Report } from "../../services/api";

export const AdminDashboardPage: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const data = await getReports();
        setReports(data);
      } catch (error) {
        console.error("Failed to fetch reports:", error);
      }
    };
    fetchReports();
  }, []);

  // Compute KPIs
  const totalReports = reports.length;
  const activeReports = reports.filter(r => r.status !== "RESOLVED").length;
  const resolvedThisMonth = reports.filter(r => {
    if (r.status !== "RESOLVED") return false;
    const createdAt = new Date(r.createdAt || "");
    const now = new Date();
    return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
  }).length;
  const highPriority = 0; // No priority field, set to 0

  const kpis = [
    {
      label: "Total Reports",
      value: totalReports,
      icon: <FileText className="h-5 w-5" />,
      change: "0%",
      changeType: "increase" as const,
    },
    {
      label: "Active Reports",
      value: activeReports,
      icon: <Clock className="h-5 w-5" />,
      change: "0%",
      changeType: "increase" as const,
    },
    {
      label: "Resolved This Month",
      value: resolvedThisMonth,
      icon: <CheckCircle2 className="h-5 w-5" />,
      change: "0%",
      changeType: "increase" as const,
    },
    {
      label: "High Priority",
      value: highPriority,
      icon: <AlertCircle className="h-5 w-5" />,
      change: "0%",
      changeType: "decrease" as const,
    },
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
        <div className="grid gap-6 grid-cols-1 xl:grid-cols-1">
        </div>
      </div>
    </AdminDashboardLayout>
  );
};

export default AdminDashboardPage;
