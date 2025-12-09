import React, { useState, useMemo, useEffect } from "react";
import { ExternalMaintainerDashboardLayout } from "src/components/dashboard/ExternalMaintainerDashboardLayout";
import { motion } from "framer-motion";
import { useAuth } from "src/contexts/AuthContext";
import {
  getReportsForExternalMaintainer,
  updateReportStatusByExternalMaintainer,
} from "src/services/api";
import {
  FileText,
  Search,
  Clock,
  PlayCircle,
  PauseCircle,
  CheckCircle2,
  MapPin,
  Calendar,
  User,
  Image as ImageIcon,
  Loader,
  AlertCircle,
  Wrench,
  MessageSquare,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createPortal } from "react-dom";
import { Drawer } from "src/components/shared/Drawer";
import CommentsSection from "src/components/report/CommentsSection";

interface Report {
  id: string;
  numericId: number;
  title: string;
  description: string;
  category: string;
  status: "Assigned" | "In Progress" | "Suspended" | "Resolved";
  location: string;
  coordinates: { lat: number; lng: number };
  createdAt: string;
  submittedBy: string;
  isAnonymous: boolean;
  photos: string[];
}

// Helper to map backend status to frontend status
const mapBackendStatus = (status: string): Report["status"] => {
  switch (status) {
    case "ASSIGNED":
      return "Assigned";
    case "IN_PROGRESS":
      return "In Progress";
    case "SUSPENDED":
      return "Suspended";
    case "RESOLVED":
      return "Resolved";
    default:
      return "Assigned";
  }
};

// Map frontend status to backend status
const mapToBackendStatus = (
  status: Report["status"],
): "IN_PROGRESS" | "SUSPENDED" | "RESOLVED" => {
  switch (status) {
    case "In Progress":
      return "IN_PROGRESS";
    case "Suspended":
      return "SUSPENDED";
    case "Resolved":
      return "RESOLVED";
    default:
      return "IN_PROGRESS";
  }
};

// Map backend data to frontend format
const mapReports = (data: any[]): Report[] => {
  return data.map((r: any) => ({
    id: `RPT-${r.id}`,
    numericId: r.id,
    title: r.title || "Untitled Report",
    description: r.description || "No description",
    category: r.category || "Other",
    status: mapBackendStatus(r.status),
    location: `${r.lat?.toFixed(4) || 0}, ${r.lng?.toFixed(4) || 0}`,
    coordinates: { lat: r.lat || 0, lng: r.lng || 0 },
    createdAt: new Date(r.createdAt).toLocaleDateString(),
    submittedBy: r.user ? `${r.user.firstName} ${r.user.lastName}` : "Unknown",
    isAnonymous: r.anonymous || false,
    photos: (r.photos || []).map(
      (p: string) =>
        `${import.meta.env.VITE_API_URL || "http://localhost:4000"}/uploads/${p}`,
    ),
  }));
};

const statusColors = {
  Assigned: "bg-blue-50 text-blue-700 border-blue-200",
  "In Progress": "bg-indigo-50 text-indigo-700 border-indigo-200",
  Suspended: "bg-orange-50 text-orange-700 border-orange-200",
  Resolved: "bg-green-50 text-green-700 border-green-200",
};

interface StatCardConfig {
  status: Report["status"];
  label: string;
  icon: LucideIcon;
  gradient: string;
  border: string;
  iconBg: string;
  delay: number;
}

const STATS_CONFIG: StatCardConfig[] = [
  {
    status: "Assigned",
    label: "New Assignments",
    icon: Clock,
    gradient: "from-blue-50 to-blue-100",
    border: "border-blue-200",
    iconBg: "bg-blue-600",
    delay: 0,
  },
  {
    status: "In Progress",
    label: "Active Work",
    icon: PlayCircle,
    gradient: "from-indigo-50 to-indigo-100",
    border: "border-indigo-200",
    iconBg: "bg-indigo-600",
    delay: 0.1,
  },
  {
    status: "Suspended",
    label: "On Hold",
    icon: PauseCircle,
    gradient: "from-orange-50 to-orange-100",
    border: "border-orange-200",
    iconBg: "bg-orange-600",
    delay: 0.2,
  },
  {
    status: "Resolved",
    label: "Completed",
    icon: CheckCircle2,
    gradient: "from-green-50 to-green-100",
    border: "border-green-200",
    iconBg: "bg-green-600",
    delay: 0.3,
  },
];

export const MaintainerReportsPage: React.FC = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showCommentsDrawer, setShowCommentsDrawer] = useState(false);
  const [newStatus, setNewStatus] = useState<Report["status"] | "">("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchReports = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        setError(null);
        const data = await getReportsForExternalMaintainer(user.id);
        const mappedReports = mapReports(data);
        setReports(mappedReports);
      } catch (err) {
        console.error("Error fetching assigned reports:", err);
        setError("Failed to load assigned reports. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [user?.id]);

  const handleStatusChange = (report: Report) => {
    setSelectedReport(report);
    setNewStatus(report.status);
    setShowStatusModal(true);
  };

  const handleOpenComments = (report: Report) => {
    setSelectedReport(report);
    setShowCommentsDrawer(true);
  };

  const closeStatusModal = () => {
    setShowStatusModal(false);
    setSelectedReport(null);
    setNewStatus("");
  };

  const closeCommentsDrawer = () => {
    setShowCommentsDrawer(false);
    setSelectedReport(null);
  };

  const handleSubmitStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport || !newStatus) return;

    setUpdating(true);
    try {
      const backendStatus = mapToBackendStatus(newStatus as Report["status"]);
      await updateReportStatusByExternalMaintainer(selectedReport.numericId, {
        status: backendStatus,
      });

      // Update local state
      setReports(
        reports.map((r: Report) =>
          r.id === selectedReport.id
            ? { ...r, status: newStatus as Report["status"] }
            : r,
        ),
      );
      closeStatusModal();
    } catch (err: any) {
      const message =
        err.response?.data?.error || err.message || "Failed to update status";
      setError(message);
    } finally {
      setUpdating(false);
    }
  };

  // Memoized filtered reports
  const filteredReports = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return reports.filter((report: Report) => {
      const matchesSearch =
        report.title.toLowerCase().includes(query) ||
        report.id.toLowerCase().includes(query) ||
        report.location.toLowerCase().includes(query);
      const matchesStatus = !filterStatus || report.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [reports, searchQuery, filterStatus]);

  // Memoized status counts
  const statusCounts = useMemo(() => {
    return reports.reduce(
      (acc: Record<Report["status"], number>, report: Report) => {
        acc[report.status] = (acc[report.status] || 0) + 1;
        return acc;
      },
      {} as Record<Report["status"], number>,
    );
  }, [reports]);

  // Get allowed status transitions
  const getAllowedStatuses = (
    currentStatus: Report["status"],
  ): Report["status"][] => {
    switch (currentStatus) {
      case "Assigned":
        return ["In Progress"];
      case "In Progress":
        return ["Suspended", "Resolved"];
      case "Suspended":
        return ["In Progress", "Resolved"];
      default:
        return [];
    }
  };

  return (
    <ExternalMaintainerDashboardLayout>
      <div className="space-y-6 w-full max-w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-200">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-orange-600 text-white shadow-lg">
              <Wrench className="h-6 w-6" />
            </div>
            My Assigned Reports
          </h1>
          <p className="text-base text-slate-700 ml-15">
            View and manage reports assigned to you. Update status as you work
            on them.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-900">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800 transition"
            >
              ×
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {STATS_CONFIG.map((config) => {
            const Icon = config.icon;
            const count = statusCounts[config.status] || 0;

            return (
              <motion.div
                key={config.status}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: config.delay }}
                className={`rounded-xl border-2 ${config.border} bg-gradient-to-br ${config.gradient} p-4 shadow-sm hover:shadow-md transition-all cursor-pointer`}
                onClick={() =>
                  setFilterStatus(
                    filterStatus === config.status ? "" : config.status,
                  )
                }
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-lg ${config.iconBg} text-white shadow-md`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{count}</p>
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      {config.label}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
            <Loader className="h-8 w-8 text-orange-600 mx-auto mb-3 animate-spin" />
            <p className="text-slate-600">Loading assigned reports...</p>
          </div>
        )}

        {/* Filters */}
        {!loading && !error && (
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by report title, ID, or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border-2 border-slate-300 bg-white pl-11 pr-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition"
                />
              </div>

              <div className="sm:w-56">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition"
                >
                  <option value="">📊 All Statuses</option>
                  <option value="Assigned">🆕 New Assignments</option>
                  <option value="In Progress">⚙️ Active Work</option>
                  <option value="Suspended">⏸️ On Hold</option>
                  <option value="Resolved">✅ Completed</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Reports List */}
        {!loading && !error && (
          <div className="space-y-4">
            {filteredReports.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
                <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600">
                  {reports.length === 0
                    ? "No reports have been assigned to you yet."
                    : "No reports found matching your filters."}
                </p>
              </div>
            ) : (
              filteredReports.map((report, index) => (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="rounded-2xl border-2 border-slate-200 bg-white overflow-hidden shadow-md hover:shadow-xl hover:border-orange-300 transition-all"
                >
                  {/* Header Section */}
                  <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50 px-6 py-5 border-b-2 border-orange-200">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex items-center justify-center px-4 py-2 rounded-lg bg-orange-600 text-white font-bold text-sm shadow-md">
                            ID: {report.id}
                          </div>
                          <span
                            className={`inline-flex items-center rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide shadow-sm ${
                              statusColors[report.status]
                            }`}
                          >
                            {report.status}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">
                            Report Title
                          </p>
                          <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
                            {report.title}
                          </h3>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="px-6 py-5 space-y-4">
                    {/* Description */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                        Problem Description
                      </p>
                      <p className="text-base text-slate-800 leading-relaxed">
                        {report.description}
                      </p>
                    </div>

                    {/* Photos Section */}
                    {report.photos.length > 0 && (
                      <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                        <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                          <ImageIcon className="h-4 w-4" />
                          Photos ({report.photos.length})
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {report.photos.map((photo, idx) => (
                            <div
                              key={photo}
                              className="group relative aspect-square rounded-lg overflow-hidden border-2 border-slate-200 bg-white hover:border-orange-400 transition-all cursor-pointer"
                            >
                              <img
                                src={photo}
                                alt={`Report ${idx + 1}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-600 text-white shadow-md">
                          <MapPin className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">
                            Location
                          </p>
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {report.location}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-600 text-white shadow-md">
                          <Calendar className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-green-700 uppercase tracking-wide">
                            Reported On
                          </p>
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {report.createdAt}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-600 text-white shadow-md">
                          <User className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-purple-700 uppercase tracking-wide">
                            Reported By
                          </p>
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {report.isAnonymous
                              ? "Anonymous Citizen"
                              : report.submittedBy}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-200">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-600 text-white shadow-md">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-orange-700 uppercase tracking-wide">
                            Category
                          </p>
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {report.category}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row gap-3">
                      {report.status !== "Resolved" && (
                        <button
                          onClick={() => handleStatusChange(report)}
                          className="flex-1 rounded-xl bg-orange-600 hover:bg-orange-700 px-6 py-3 text-base font-bold text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                          <Wrench className="h-5 w-5" />
                          Update Status
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenComments(report)}
                        className="flex-1 rounded-xl bg-slate-600 hover:bg-slate-700 px-6 py-3 text-base font-bold text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                      >
                        <MessageSquare className="h-5 w-5" />
                        Internal Comments
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Status Update Modal */}
      {showStatusModal &&
        selectedReport &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            >
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
                <Wrench className="h-5 w-5 text-orange-600" />
                Update Report Status
              </h2>

              <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                  Current Report
                </p>
                <p className="text-sm font-bold text-slate-900">
                  {selectedReport.title}
                </p>
                <p className="text-xs text-slate-600">{selectedReport.id}</p>
              </div>

              <form onSubmit={handleSubmitStatus} className="space-y-4">
                <div>
                  <label
                    htmlFor="status"
                    className="block text-sm font-medium text-slate-700 mb-2"
                  >
                    New Status
                  </label>
                  <select
                    id="status"
                    value={newStatus}
                    onChange={(e) =>
                      setNewStatus(e.target.value as Report["status"])
                    }
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition"
                  >
                    <option value="">Select status...</option>
                    {getAllowedStatuses(selectedReport.status).map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={closeStatusModal}
                    disabled={updating}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newStatus || updating}
                    className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {updating && <Loader className="h-4 w-4 animate-spin" />}
                    {updating ? "Updating..." : "Update Status"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>,
          document.body,
        )}

      <Drawer
        isOpen={showCommentsDrawer}
        onClose={closeCommentsDrawer}
        title={`Internal Comments - ${selectedReport?.id}`}
        subtitle={`These comments are only visible to internal staff and external maintainers.`}
      >
        {selectedReport && (
          <CommentsSection reportId={selectedReport.numericId} />
        )}
      </Drawer>
    </ExternalMaintainerDashboardLayout>
  );
};

export default MaintainerReportsPage;
