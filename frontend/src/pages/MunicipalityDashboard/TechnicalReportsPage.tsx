import React, { useState, useMemo, useEffect } from "react";
import { MunicipalityDashboardLayout } from "src/components/dashboard/MunicipalityDashboardLayout";
import { StatusUpdateModal } from "src/components/dashboard/StatusUpdateModal";
import { CommentModal } from "src/components/dashboard/CommentModal";
import { AssignMaintainerModal } from "src/components/dashboard/AssignMaintainerModal";
import { Drawer } from "src/components/shared/Drawer";
import CommentsSection from "src/components/report/CommentsSection";
import { motion } from "framer-motion";
import { useAuth } from "src/contexts/AuthContext";
import { getAssignedReports } from "src/services/api";
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
  MessageSquare,
  Edit3,
  Image as ImageIcon,
  UserPlus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { ReportModel } from "src/services/models";

interface Comment {
  id: number;
  author: string;
  text: string;
  timestamp: string;
}

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
  assignedOffice: string;
  comments: Comment[];
  externalMaintainerId?: number | null;
  externalMaintainer?: {
    id: number;
    firstName: string;
    lastName: string;
    companyName: string;
  } | null;
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

// Map backend data to frontend format
const mapReports = (data: ReportModel[]): Report[] => {
  return data.map((r: ReportModel) => ({
    id: `RPT-${r.id}`,
    numericId: r.id,
    title: r.title || "Untitled Report",
    description: r.description || "No description",
    category: r.category || "Other",
    status: mapBackendStatus(r.status),
    // location: r.location || `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`,
    location: `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`,
    coordinates: { lat: r.lat, lng: r.lng },
    createdAt: new Date(r.createdAt).toLocaleDateString(),
    submittedBy: r.user ? `${r.user.firstName} ${r.user.lastName}` : "Unknown",
    isAnonymous: r.isAnonymous || false,
    photos: (r.photos || []).map(
      (p: string) =>
        `${import.meta.env.VITE_API_URL || "http://localhost:4000"}/uploads/${p}`,
    ),
    assignedOffice: r.assignedOffice || "Not assigned",
    comments: [],
    externalMaintainerId: r.externalMaintainerId,
    externalMaintainer: r.externalMaintainer,
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

interface MetadataCardConfig {
  icon: LucideIcon;
  label: string;
  getValue: (report: Report) => string;
  gradient: string;
  border: string;
  iconBg: string;
  textColor: string;
}

const METADATA_CONFIG: MetadataCardConfig[] = [
  {
    icon: MapPin,
    label: "Location",
    getValue: (r) => r.location,
    gradient: "from-blue-50 to-indigo-50",
    border: "border-blue-200",
    iconBg: "bg-blue-600",
    textColor: "text-blue-700",
  },
  {
    icon: Calendar,
    label: "Reported On",
    getValue: (r) => r.createdAt,
    gradient: "from-green-50 to-emerald-50",
    border: "border-green-200",
    iconBg: "bg-green-600",
    textColor: "text-green-700",
  },
  {
    icon: User,
    label: "Reported By",
    getValue: (r) =>
      r.isAnonymous ? "Anonymous Citizen" : `By ${r.submittedBy}`,
    gradient: "from-purple-50 to-pink-50",
    border: "border-purple-200",
    iconBg: "bg-purple-600",
    textColor: "text-purple-700",
  },
  {
    icon: FileText,
    label: "Category",
    getValue: (r) => r.category,
    gradient: "from-orange-50 to-amber-50",
    border: "border-orange-200",
    iconBg: "bg-orange-600",
    textColor: "text-orange-700",
  },
];

export const TechnicalReportsPage: React.FC = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCommentsDrawer, setShowCommentsDrawer] = useState(false);
  const [newStatus, setNewStatus] = useState<Report["status"] | "">("");
  const [newComment, setNewComment] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        setError(null);
        const data = await getAssignedReports(user.id);
        const reports = data.map((data) => new ReportModel(data));
        const mappedReports = mapReports(reports);
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

  const handleAddComment = (report: Report) => {
    setSelectedReport(report);
    // setNewComment("");
    // setShowCommentModal(true);
    setShowCommentsDrawer(true);
  };

  const handleAssignToMaintainer = (report: Report) => {
    setSelectedReport(report);
    setShowAssignModal(true);
  };

  const handleAssignMaintainer = async () => {
    // Reload data to get updated report with external maintainer assigned
    if (user?.id) {
      try {
        const data = await getAssignedReports(user.id);
        const reports = data.map((data) => new ReportModel(data));
        const mappedReports = mapReports(reports);
        setReports(mappedReports);
      } catch (err) {
        console.error("Error reloading reports:", err);
      }
    }
  };

  const closeStatusModal = () => {
    setShowStatusModal(false);
    setSelectedReport(null);
    setNewStatus("");
  };

  const closeCommentModal = () => {
    setShowCommentModal(false);
    setSelectedReport(null);
    setNewComment("");
  };

  const closeAssignModal = () => {
    setShowAssignModal(false);
    setSelectedReport(null);
  };

  const closeCommentsDrawer = () => {
    setShowCommentsDrawer(false);
    setSelectedReport(null);
  };

  const handleSubmitStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedReport && newStatus) {
      setReports(
        reports.map((r) =>
          r.id === selectedReport.id
            ? { ...r, status: newStatus as Report["status"] }
            : r,
        ),
      );
      closeStatusModal();
    }
  };

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedReport && newComment.trim()) {
      const comment: Comment = {
        id: Date.now(),
        author: "Current User",
        text: newComment,
        timestamp: new Date().toISOString().slice(0, 16).replace("T", " "),
      };

      setReports(
        reports.map((r) =>
          r.id === selectedReport.id
            ? { ...r, comments: [...r.comments, comment] }
            : r,
        ),
      );
      closeCommentModal();
    }
  };

  // Memoized filtered reports
  const filteredReports = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return reports.filter((report) => {
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
      (acc, report) => {
        acc[report.status] = (acc[report.status] || 0) + 1;
        return acc;
      },
      {} as Record<Report["status"], number>,
    );
  }, [reports]);

  return (
    <MunicipalityDashboardLayout>
      <div className="space-y-6 w-full max-w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white shadow-lg">
              <FileText className="h-6 w-6" />
            </div>
            My Assigned Reports
          </h1>
          <p className="text-base text-slate-700 ml-15">
            View and manage reports assigned to your technical office. Update
            status and track maintenance progress.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          {STATS_CONFIG.map((config) => {
            const Icon = config.icon;
            const count = statusCounts[config.status] || 0;
            return (
              <motion.div
                key={config.status}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: config.delay }}
                className={`rounded-xl border-2 ${config.border} bg-gradient-to-br ${config.gradient} p-5 shadow-md hover:shadow-lg transition-all`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-xl ${config.iconBg} text-white shadow-lg`}
                  >
                    <Icon className="h-7 w-7" />
                  </div>
                  <div>
                    <p
                      className="text-xs font-bold uppercase tracking-wide mb-1"
                      style={{
                        color: `var(--${config.iconBg.replace("bg-", "")})`,
                      }}
                    >
                      {config.label}
                    </p>
                    <p className="text-3xl font-extrabold text-slate-900">
                      {count}
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
            <div className="animate-spin h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-600 font-medium">
              Loading your assigned reports...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="rounded-xl border-2 border-red-200 bg-red-50 p-6">
            <p className="text-red-700 font-medium">{error}</p>
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
                  className="w-full rounded-xl border-2 border-slate-300 bg-white pl-11 pr-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                />
              </div>

              <div className="sm:w-56">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
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
                  No reports found matching your filters.
                </p>
              </div>
            ) : (
              filteredReports.map((report, index) => (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="rounded-2xl border-2 border-slate-200 bg-white overflow-hidden shadow-md hover:shadow-xl hover:border-indigo-300 transition-all"
                >
                  {/* Header Section */}
                  <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 px-6 py-5 border-b-2 border-indigo-200">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex items-center justify-center px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold text-sm shadow-md">
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
                          <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
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
                              className="group relative aspect-square rounded-lg overflow-hidden border-2 border-slate-200 bg-white hover:border-indigo-400 transition-all cursor-pointer"
                            >
                              <img
                                src={photo}
                                alt={`Report ${idx + 1}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="absolute bottom-2 left-2 right-2">
                                  <p className="text-xs font-semibold text-white">
                                    Photo {idx + 1}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {METADATA_CONFIG.map((config) => {
                        const Icon = config.icon;
                        return (
                          <div
                            key={config.label}
                            className={`flex items-center gap-3 p-3 bg-gradient-to-br ${config.gradient} rounded-xl border ${config.border}`}
                          >
                            <div
                              className={`flex items-center justify-center w-10 h-10 rounded-lg ${config.iconBg} text-white shadow-md`}
                            >
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-[10px] font-bold ${config.textColor} uppercase tracking-wide`}
                              >
                                {config.label}
                              </p>
                              <p className="text-sm font-semibold text-slate-900 truncate">
                                {config.getValue(report)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Assigned Office */}
                    <div className="rounded-xl bg-indigo-50 border-2 border-indigo-200 p-4 mb-4">
                      <p className="text-sm font-bold text-indigo-900 mb-1">
                        📋 Assigned To:
                      </p>
                      <p className="text-sm text-indigo-700 font-medium">
                        {report.assignedOffice}
                      </p>
                    </div>

                    {/* External Maintainer Assignment */}
                    {report.externalMaintainer && (
                      <div className="rounded-xl bg-purple-50 border-2 border-purple-200 p-4 mb-4">
                        <p className="text-sm font-bold text-purple-900 mb-1">
                          🔧 External Maintainer:
                        </p>
                        <p className="text-sm text-purple-700 font-medium">
                          {report.externalMaintainer.firstName}{" "}
                          {report.externalMaintainer.lastName}
                        </p>
                        <p className="text-xs text-purple-600 mt-1">
                          {report.externalMaintainer.companyName}
                        </p>
                      </div>
                    )}

                    {/* Comments Section */}
                    {report.comments.length > 0 && (
                      <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 mb-4">
                        <p className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Comments ({report.comments.length})
                        </p>
                        <div className="space-y-3">
                          {report.comments.map((comment) => (
                            <div
                              key={comment.id}
                              className="bg-white rounded-lg p-3 border border-slate-200"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-semibold text-slate-900">
                                  {comment.author}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {comment.timestamp}
                                </span>
                              </div>
                              <p className="text-sm text-slate-700">
                                {comment.text}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-3 pt-4 border-t border-slate-200">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          onClick={() => handleStatusChange(report)}
                          className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-6 py-3 text-base font-bold text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                          <Edit3 className="h-5 w-5" />
                          Update Status
                        </button>
                        <button
                          onClick={() => handleAddComment(report)}
                          disabled={report.status === "Resolved"}
                          className="flex-1 rounded-xl bg-slate-600 hover:bg-slate-700 px-6 py-3 text-base font-bold text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <MessageSquare className="h-5 w-5" />
                          Internal Comments
                        </button>
                      </div>

                      {/* Assign to External Maintainer - Only show if not already assigned */}
                      {!report.externalMaintainerId && (
                        <button
                          onClick={() => handleAssignToMaintainer(report)}
                          className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-6 py-3 text-base font-bold text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                          <UserPlus className="h-5 w-5" />
                          Assign to External Maintainer
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <StatusUpdateModal
        isOpen={showStatusModal}
        report={selectedReport}
        newStatus={newStatus}
        onStatusChange={(status) => setNewStatus(status)}
        onSubmit={handleSubmitStatus}
        onClose={closeStatusModal}
      />

      <CommentModal
        isOpen={showCommentModal}
        report={selectedReport}
        comment={newComment}
        onCommentChange={setNewComment}
        onSubmit={handleSubmitComment}
        onClose={closeCommentModal}
      />

      <AssignMaintainerModal
        isOpen={showAssignModal}
        onClose={closeAssignModal}
        reportId={selectedReport?.id || ""}
        reportCategory={selectedReport?.category || ""}
        reportTitle={selectedReport?.title || ""}
        onAssign={handleAssignMaintainer}
      />

      <Drawer
        isOpen={showCommentsDrawer}
        onClose={closeCommentsDrawer}
        title={`Internal Comments`}
        subtitle={`These comments are only visible to internal staff and external maintainers.`}
      >
        {selectedReport && (
          <CommentsSection
            reportId={parseInt(selectedReport.id.replace("RPT-", ""), 10)}
          />
        )}
      </Drawer>
    </MunicipalityDashboardLayout>
  );
};

export default TechnicalReportsPage;
