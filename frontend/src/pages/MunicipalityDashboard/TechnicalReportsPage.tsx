import React, { useState } from "react";
import { MunicipalityDashboardLayout } from "../../components/dashboard/MunicipalityDashboardLayout";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { createPortal } from "react-dom";

interface Comment {
  id: number;
  author: string;
  text: string;
  timestamp: string;
}

interface Report {
  id: string;
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
}

const sampleReports: Report[] = [
  {
    id: "RPT-103",
    title: "Overflowing trash bin",
    description:
      "Trash bin has been overflowing for days, attracting pests and creating unpleasant odors.",
    category: "Waste",
    status: "Assigned",
    location: "Corso Francia 100, San Salvario",
    coordinates: { lat: 45.06, lng: 7.68 },
    createdAt: "2025-11-08",
    submittedBy: "Giulia Bianchi",
    isAnonymous: false,
    photos: [],
    assignedOffice: "Environmental Services - Waste Management",
    comments: [],
  },
  {
    id: "RPT-101",
    title: "Water leak on street",
    description:
      "Continuous water leak from underground pipe causing street flooding.",
    category: "Water Supply – Drinking Water",
    status: "In Progress",
    location: "Via Po 25, Lingotto",
    coordinates: { lat: 45.0505, lng: 7.67 },
    createdAt: "2025-11-06",
    submittedBy: "Sara Ferrari",
    isAnonymous: false,
    photos: [],
    assignedOffice: "Water Supply Authority",
    comments: [
      {
        id: 1,
        author: "Marco Rossi",
        text: "Team dispatched to assess the situation. Estimated repair time: 2-3 days.",
        timestamp: "2025-11-07 10:30",
      },
    ],
  },
  {
    id: "RPT-098",
    title: "Broken playground equipment",
    description: "Swing set is damaged and unsafe for children.",
    category: "Public Green Areas and Playgrounds",
    status: "Suspended",
    location: "Parco del Valentino",
    coordinates: { lat: 45.05, lng: 7.685 },
    createdAt: "2025-11-03",
    submittedBy: "Laura Verdi",
    isAnonymous: false,
    photos: [],
    assignedOffice: "Parks & Recreation Department",
    comments: [
      {
        id: 1,
        author: "Elena Colombo",
        text: "Waiting for replacement parts to arrive. Expected delivery next week.",
        timestamp: "2025-11-05 14:20",
      },
    ],
  },
  {
    id: "RPT-095",
    title: "Streetlight maintenance completed",
    description: "Malfunctioning streetlight has been repaired.",
    category: "Public Lighting",
    status: "Resolved",
    location: "Via Roma 45, Centro",
    coordinates: { lat: 45.0703, lng: 7.6869 },
    createdAt: "2025-10-28",
    submittedBy: "Mario Rossi",
    isAnonymous: false,
    photos: [],
    assignedOffice: "Public Works - Lighting Division",
    comments: [
      {
        id: 1,
        author: "Luca Ferrari",
        text: "Bulb replaced and tested. Light is now operational.",
        timestamp: "2025-10-30 16:45",
      },
      {
        id: 2,
        author: "Luca Ferrari",
        text: "Closing this report as resolved.",
        timestamp: "2025-10-30 16:50",
      },
    ],
  },
];

const statusColors = {
  Assigned: "bg-blue-50 text-blue-700 border-blue-200",
  "In Progress": "bg-indigo-50 text-indigo-700 border-indigo-200",
  Suspended: "bg-orange-50 text-orange-700 border-orange-200",
  Resolved: "bg-green-50 text-green-700 border-green-200",
};

export const TechnicalReportsPage: React.FC = () => {
  const [reports, setReports] = useState<Report[]>(sampleReports);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [newStatus, setNewStatus] = useState<Report["status"] | "">("");
  const [newComment, setNewComment] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const handleStatusChange = (report: Report) => {
    setSelectedReport(report);
    setNewStatus(report.status);
    setShowStatusModal(true);
  };

  const handleAddComment = (report: Report) => {
    setSelectedReport(report);
    setNewComment("");
    setShowCommentModal(true);
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
      setShowStatusModal(false);
      setSelectedReport(null);
      setNewStatus("");
    }
  };

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedReport && newComment.trim()) {
      const comment: Comment = {
        id: Date.now(),
        author: "Current User", // In real app, this would be the logged-in user
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
      setShowCommentModal(false);
      setSelectedReport(null);
      setNewComment("");
    }
  };

  // Filter reports
  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !filterStatus || report.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const assignedCount = reports.filter((r) => r.status === "Assigned").length;
  const inProgressCount = reports.filter(
    (r) => r.status === "In Progress",
  ).length;
  const suspendedCount = reports.filter((r) => r.status === "Suspended").length;
  const resolvedCount = reports.filter((r) => r.status === "Resolved").length;

  return (
    <MunicipalityDashboardLayout>
      <div className="space-y-6 w-full max-w-full">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" /> Technical Office
            Reports
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Manage assigned reports and update their status
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Assigned</p>
                <p className="text-2xl font-bold text-slate-900">
                  {assignedCount}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
                <PlayCircle className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">In Progress</p>
                <p className="text-2xl font-bold text-slate-900">
                  {inProgressCount}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50">
                <PauseCircle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Suspended</p>
                <p className="text-2xl font-bold text-slate-900">
                  {suspendedCount}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Resolved</p>
                <p className="text-2xl font-bold text-slate-900">
                  {resolvedCount}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, ID, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
          >
            <option value="">All Status</option>
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="Suspended">Suspended</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>

        {/* Reports List */}
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
                className="rounded-2xl border-2 border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all"
              >
                {/* Header Section */}
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-bold text-slate-700 bg-white px-3 py-1 rounded-lg border border-slate-300">
                          {report.id}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900">
                        {report.title}
                      </h3>
                    </div>

                    <span
                      className={`inline-flex items-center rounded-xl px-4 py-2 text-sm font-bold shadow-sm ${
                        statusColors[report.status]
                      }`}
                    >
                      {report.status}
                    </span>
                  </div>
                </div>

                {/* Content Section */}
                <div className="px-6 py-5">
                  <p className="text-base text-slate-700 mb-4 leading-relaxed">
                    {report.description}
                  </p>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                      <MapPin className="h-4 w-4 text-indigo-600" />
                      <span className="font-medium">{report.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                      <Calendar className="h-4 w-4 text-indigo-600" />
                      <span className="font-medium">{report.createdAt}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                      <User className="h-4 w-4 text-indigo-600" />
                      <span className="font-medium">
                        {report.isAnonymous
                          ? "Anonymous Report"
                          : `By ${report.submittedBy}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                      <FileText className="h-4 w-4 text-indigo-600" />
                      <span className="font-medium">{report.category}</span>
                    </div>
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
                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200">
                    <button
                      onClick={() => handleStatusChange(report)}
                      className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-6 py-3 text-base font-bold text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                      <Edit3 className="h-5 w-5" />
                      Update Status
                    </button>
                    <button
                      onClick={() => handleAddComment(report)}
                      className="flex-1 rounded-xl bg-slate-600 hover:bg-slate-700 px-6 py-3 text-base font-bold text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                      <MessageSquare className="h-5 w-5" />
                      Add Comment
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Update Status Modal */}
      {showStatusModal &&
        selectedReport &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            >
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
                <Edit3 className="h-5 w-5 text-indigo-600" />
                Update Report Status
              </h2>

              <form onSubmit={handleSubmitStatus} className="space-y-4">
                {/* Report Summary */}
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-900 mb-1">
                    {selectedReport.id}: {selectedReport.title}
                  </p>
                  <p className="text-xs text-slate-600">
                    {selectedReport.location}
                  </p>
                  <p className="text-xs text-slate-600">
                    Current Status: <strong>{selectedReport.status}</strong>
                  </p>
                </div>

                {/* Status Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    New Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) =>
                      setNewStatus(e.target.value as Report["status"])
                    }
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                  >
                    <option value="Assigned">
                      Assigned - Newly assigned to office
                    </option>
                    <option value="In Progress">
                      In Progress - Intervention scheduled/started
                    </option>
                    <option value="Suspended">
                      Suspended - Awaiting resources/evaluation
                    </option>
                    <option value="Resolved">
                      Resolved - Problem fixed and closed
                    </option>
                  </select>
                </div>

                {/* Status Information */}
                <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
                  <p className="text-sm font-semibold text-blue-900 mb-2">
                    Status Workflow:
                  </p>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>
                      <strong>Assigned:</strong> Report received by technical
                      office
                    </li>
                    <li>
                      <strong>In Progress:</strong> Intervention scheduled, work
                      started
                    </li>
                    <li>
                      <strong>Suspended:</strong> Paused awaiting resources or
                      evaluation
                    </li>
                    <li>
                      <strong>Resolved:</strong> Problem fixed, report closed
                    </li>
                  </ul>
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowStatusModal(false);
                      setSelectedReport(null);
                      setNewStatus("");
                    }}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
                  >
                    Update Status
                  </button>
                </div>
              </form>
            </motion.div>
          </div>,
          document.body,
        )}

      {/* Add Comment Modal */}
      {showCommentModal &&
        selectedReport &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            >
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
                <MessageSquare className="h-5 w-5 text-indigo-600" />
                Add Comment
              </h2>

              <form onSubmit={handleSubmitComment} className="space-y-4">
                {/* Report Summary */}
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-900 mb-1">
                    {selectedReport.id}: {selectedReport.title}
                  </p>
                  <p className="text-xs text-slate-600">
                    {selectedReport.location}
                  </p>
                </div>

                {/* Comment Input */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Comment <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add notes about progress, issues, or resolution..."
                    required
                    rows={4}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition resize-none"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Comments help track progress and communicate with team
                    members.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCommentModal(false);
                      setSelectedReport(null);
                      setNewComment("");
                    }}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
                  >
                    Add Comment
                  </button>
                </div>
              </form>
            </motion.div>
          </div>,
          document.body,
        )}
    </MunicipalityDashboardLayout>
  );
};

export default TechnicalReportsPage;
