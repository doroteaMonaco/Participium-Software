import React, { useEffect, useState } from "react";
import { MunicipalityDashboardLayout } from "../../components/dashboard/MunicipalityDashboardLayout";
import { motion } from "framer-motion";
import {
  FileText,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
} from "lucide-react";
import { createPortal } from "react-dom";
import { getReports, approveOrRejectReport } from "src/services/api";
import { Report, ReportStatus } from "src/services/models";
import { MapContainer, TileLayer, Marker } from "react-leaflet";

// Technical offices bound to each category
const categoryOfficeMapping: Record<string, string> = {
  "Public Lighting": "Public Works - Lighting Division",
  "Roads & Urban Furnishings": "Public Works - Roads Department",
  Waste: "Environmental Services - Waste Management",
  "Water Supply – Drinking Water": "Water Supply Authority",
  "Sewer System": "Public Works - Sewerage Department",
  "Road Signs and Traffic Lights": "Transportation & Traffic Department",
  "Roads and Urban Furnishings": "Public Works - Roads Department",
  "Public Green Areas and Playgrounds": "Parks & Recreation Department",
  "Architectural Barriers": "Urban Planning - Accessibility Office",
  Other: "General Services Office",
};

const statusColors = (status: ReportStatus) => {
  switch (status) {
    case ReportStatus.PENDING:
      return "bg-yellow-50 text-yellow-700 border-yellow-200";
    case ReportStatus.ASSIGNED:
      return "bg-green-50 text-green-700 border-green-200";
    case ReportStatus.REJECTED:
      return "bg-red-50 text-red-700 border-red-200";
    case ReportStatus.IN_PROGRESS:
      return "bg-blue-50 text-blue-700 border-blue-200";
    case ReportStatus.RESOLVED:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
};

export const AdminReportsPage: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | null>(
    null,
  );
  const [rejectionReason, setRejectionReason] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<
    "pending" | "approved" | "rejected"
  >("pending");
  const [approvalError, setApprovalError] = useState<string>("");

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const data = await getReports();
        const reportsData = data.map(
          (r) =>
            new Report(
              r.latitude ?? 0,
              r.longitude ?? 0,
              r.title ?? "",
              r.status ?? "",
              r.anonymous ?? true,
              r.id,
              r.description ?? "",
              r.category ?? "",
              r.photos ?? [],
              r.createdAt ?? "",
              r.rejectionReason,
              r.user || null,
            ),
        );
        setReports(reportsData);
      } catch (err) {
        console.error("Error fetching reports:", err);
      }
    };

    fetchReports();
  }, []);

  const handleReviewClick = (report: Report, action: "approve" | "reject") => {
    setSelectedReport(report);
    setReviewAction(action);
    setRejectionReason("");
    setApprovalError("");
    setShowReviewModal(true);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setApprovalError("");

    if (selectedReport && reviewAction) {
      const assignedOffice =
        reviewAction === "approve"
          ? categoryOfficeMapping[selectedReport.category] ||
            "General Services Office"
          : undefined;

      try {
        // Do not send `category` (this must be one of report categories).
        // Backend computes `assignedOffice` from the report's category.
        await approveOrRejectReport(selectedReport.id, {
          status: reviewAction === "approve" ? "ASSIGNED" : "REJECTED",
          motivation: reviewAction === "reject" ? rejectionReason : undefined,
        });
      } catch (err: any) {
        console.error("Error approving/rejecting report:", err);
        const errorMessage =
          err.response?.data?.error ||
          err.message ||
          "An error occurred while processing the report";
        setApprovalError(errorMessage);
        return;
      }

      setReports(
        reports.map((r) =>
          r.id === selectedReport.id
            ? {
                ...r,
                status:
                  reviewAction === "approve"
                    ? ReportStatus.ASSIGNED
                    : ReportStatus.REJECTED,
                rejectionReason:
                  reviewAction === "reject" ? rejectionReason : undefined,
                assignedOffice: assignedOffice,
              }
            : r,
        ),
      );

      setShowReviewModal(false);
      setSelectedReport(null);
      setReviewAction(null);
      setRejectionReason("");
    }
  };

  // Filter reports
  const filteredReports = reports
    .filter((report) => {
      const matchesSearch =
        (report.title ?? "")
          .toString()
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (report.id ?? "")
          .toString()
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      // Tab-based filtering
      let matchesTab = true;
      if (activeTab === "pending") {
        matchesTab = report.status === ReportStatus.PENDING;
      } else if (activeTab === "approved") {
        matchesTab =
          report.status === ReportStatus.ASSIGNED ||
          report.status === ReportStatus.IN_PROGRESS ||
          report.status === ReportStatus.RESOLVED;
      } else if (activeTab === "rejected") {
        matchesTab = report.status === ReportStatus.REJECTED;
      }

      return matchesSearch && matchesTab;
    })
    .sort((a, b) => (b.id || 0) - (a.id || 0));

  const pendingCount = reports.filter(
    (r) => r.status === ReportStatus.PENDING,
  ).length;
  const approvedCount = reports.filter(
    (r) =>
      r.status === ReportStatus.ASSIGNED ||
      r.status === ReportStatus.IN_PROGRESS ||
      r.status === ReportStatus.RESOLVED,
  ).length;
  const rejectedCount = reports.filter(
    (r) => r.status === ReportStatus.REJECTED,
  ).length;

  return (
    <MunicipalityDashboardLayout>
      <div className="space-y-6 w-full max-w-full">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-indigo-600" /> Review Reports
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Review, approve, or reject citizen-submitted reports
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-50">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Pending Review</p>
                <p className="text-2xl font-bold text-slate-900">
                  {pendingCount}
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
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Approved</p>
                <p className="text-2xl font-bold text-slate-900">
                  {approvedCount}
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
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Rejected</p>
                <p className="text-2xl font-bold text-slate-900">
                  {rejectedCount}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200">
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-6 py-3 text-sm font-semibold transition relative whitespace-nowrap ${
                activeTab === "pending"
                  ? "text-indigo-700 border-b-2 border-indigo-600"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pending Review
                {pendingCount > 0 && (
                  <span
                    className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold ${
                      activeTab === "pending"
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {pendingCount}
                  </span>
                )}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("approved")}
              className={`px-6 py-3 text-sm font-semibold transition relative whitespace-nowrap ${
                activeTab === "approved"
                  ? "text-indigo-700 border-b-2 border-indigo-600"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Approved
                {approvedCount > 0 && (
                  <span
                    className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold ${
                      activeTab === "approved"
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {approvedCount}
                  </span>
                )}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("rejected")}
              className={`px-6 py-3 text-sm font-semibold transition relative whitespace-nowrap ${
                activeTab === "rejected"
                  ? "text-indigo-700 border-b-2 border-indigo-600"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span className="flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Rejected
                {rejectedCount > 0 && (
                  <span
                    className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold ${
                      activeTab === "rejected"
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {rejectedCount}
                  </span>
                )}
              </span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
            />
          </div>
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
                className="group relative rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-2xl hover:border-indigo-300 transition-all duration-300"
              >
                {/* Decorative gradient bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

                {/* Header Section */}
                <div className="relative px-4 sm:px-6 py-4 sm:py-5 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-sm shadow-lg">
                        #{report.id}
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-3 sm:px-4 py-1.5 text-xs font-bold uppercase tracking-wide shadow-sm ${statusColors(
                          report.status,
                        )}`}
                      >
                        {report.status}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-col items-start">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
                        <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                          Report Title
                        </span>
                      </div>
                      <h3 className="text-lg sm:text-xl md:text-2xl font-extrabold text-slate-900 leading-tight pl-3 break-words w-full text-left">
                        {report.title}
                      </h3>
                    </div>
                  </div>
                </div>

                {/* Content Section */}
                <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5">
                  {/* Description */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-4 bg-purple-500 rounded-full"></div>
                      <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">
                        Description
                      </span>
                    </div>
                    <div className="pl-3 p-4 bg-gradient-to-br from-slate-50 to-purple-50/30 rounded-xl border border-slate-200">
                      <p className="text-left text-slate-700 leading-relaxed">
                        {report.description}
                      </p>
                    </div>
                  </div>

                  {/* Photos */}
                  {report.photos && report.photos.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-pink-500 rounded-full"></div>
                        <span className="text-[10px] font-bold text-pink-600 uppercase tracking-wider">
                          Photos
                        </span>
                      </div>
                      <div className="flex gap-3 pl-3 overflow-x-auto pb-2">
                        {report.photos.map((p, idx) => (
                          <div
                            key={idx}
                            className="relative group/photo flex-shrink-0"
                          >
                            <img
                              src={`${import.meta.env.VITE_API_URL || "http://localhost:4000"}/uploads/${p}`}
                              alt={`photo-${idx}`}
                              className="h-24 w-24 sm:h-32 sm:w-32 object-cover rounded-xl border-2 border-slate-200 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105"
                            />
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover/photo:opacity-100 transition-opacity"></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Map */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-4 bg-emerald-500 rounded-full"></div>
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                        Location
                      </span>
                    </div>
                    <div className="pl-3 h-40 sm:h-48 w-full rounded-xl overflow-hidden border-2 border-slate-200 shadow-md">
                      <MapContainer
                        center={[report.lat || 45.0, report.lng || 7.0]}
                        zoom={15}
                        style={{ height: "100%", width: "100%" }}
                        scrollWheelZoom={true}
                      >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Marker
                          position={[report.lat || 45.0, report.lng || 7.0]}
                        />
                      </MapContainer>
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500 text-white shadow-md flex-shrink-0">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">
                          Date
                        </p>
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {report.createdAt}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-500 text-white shadow-md flex-shrink-0">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wide">
                          Category
                        </p>
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {report.category}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* User Information */}
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500 text-white shadow-md flex-shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">
                        Submitted By
                      </p>
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {report.isAnonymous || !report.user
                          ? "Anonymous"
                          : `${report.user.firstName} ${report.user.lastName}`}
                      </p>
                    </div>
                  </div>

                  {/* Status-specific info */}
                  {/* {report.status === ReportStatus.ASSIGNED &&
                    report.assignedOffice && (
                      <div className="rounded-xl bg-green-50 border-2 border-green-200 p-4 mb-4">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-bold text-green-900 mb-1">
                              ✓ Approved & Assigned
                            </p>
                            <p className="text-sm text-green-800">
                              <strong>Technical Office:</strong>{" "}
                              {report.assignedOffice}
                            </p>
                          </div>
                        </div>
                      </div>
                    )} */}

                  {report.status === ReportStatus.REJECTED &&
                    report.rejectionReason && (
                      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-300 p-5 shadow-md">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-red-200 rounded-full opacity-20 -mr-16 -mt-16"></div>
                        <div className="relative flex items-start gap-4">
                          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-red-500 text-white shadow-lg flex-shrink-0">
                            <XCircle className="h-6 w-6" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-red-900 mb-2 uppercase tracking-wide">
                              Rejection Reason
                            </p>
                            <p className="text-sm text-red-800 leading-relaxed">
                              {report.rejectionReason}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Action Buttons */}
                  {report.status === ReportStatus.PENDING && (
                    <div className="flex flex-col sm:flex-row gap-4 pt-5">
                      <button
                        onClick={() => handleReviewClick(report, "approve")}
                        className="group/btn flex-1 relative overflow-hidden rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 px-6 py-4 text-base font-bold text-white shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-0.5"
                      >
                        <div className="absolute inset-0 bg-white opacity-0 group-hover/btn:opacity-10 transition-opacity"></div>
                        <span className="relative flex items-center justify-center gap-2">
                          <CheckCircle2 className="h-5 w-5" />
                          Approve Report
                        </span>
                      </button>
                      <button
                        onClick={() => handleReviewClick(report, "reject")}
                        className="group/btn flex-1 relative overflow-hidden rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 px-6 py-4 text-base font-bold text-white shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-0.5"
                      >
                        <div className="absolute inset-0 bg-white opacity-0 group-hover/btn:opacity-10 transition-opacity"></div>
                        <span className="relative flex items-center justify-center gap-2">
                          <XCircle className="h-5 w-5" />
                          Reject Report
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal &&
        selectedReport &&
        reviewAction &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            >
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
                {reviewAction === "approve" ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    Approve Report
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-600" />
                    Reject Report
                  </>
                )}
              </h2>

              <form onSubmit={handleSubmitReview} className="space-y-4">
                {/* Error Alert */}
                {approvalError && (
                  <div className="rounded-xl bg-red-50 border-2 border-red-300 p-4">
                    <div className="flex items-start gap-3">
                      <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-red-900 mb-1">
                          Error
                        </p>
                        <p className="text-sm text-red-800 leading-relaxed">
                          {approvalError}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Report Summary */}
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-900 mb-1">
                    {selectedReport.id}: {selectedReport.title}
                  </p>
                  {/* <p className="text-xs text-slate-600">
                    {selectedReport.location}
                  </p> */}
                  <p className="text-xs text-slate-600">
                    Category: {selectedReport.category}
                  </p>
                </div>

                {reviewAction === "approve" ? (
                  <>
                    <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-4">
                      <p className="text-sm font-semibold text-indigo-900 mb-2">
                        📋 This report will be assigned to:
                      </p>
                      <p className="text-base font-bold text-indigo-700">
                        {categoryOfficeMapping[selectedReport.category] ||
                          "General Services Office"}
                      </p>
                      <p className="text-xs text-indigo-600 mt-1">
                        Based on category: {selectedReport.category}
                      </p>
                    </div>

                    <div className="rounded-xl bg-green-50 border border-green-200 p-4">
                      <p className="text-sm text-green-900">
                        <strong>Approving this report will:</strong>
                      </p>
                      <ul className="text-sm text-green-800 mt-2 space-y-1 list-disc list-inside">
                        <li>Mark it as valid and accepted</li>
                        <li>
                          Assign it to the technical office bound to this
                          category
                        </li>
                        <li>
                          Make it visible for the assigned office to process
                        </li>
                        <li>Notify relevant staff members</li>
                      </ul>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Rejection Reason <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Explain why this report is being rejected..."
                        required
                        rows={4}
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition resize-none"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        This explanation will be visible to the citizen who
                        submitted the report.
                      </p>
                    </div>

                    <div className="rounded-xl bg-red-50 border border-red-200 p-4">
                      <p className="text-sm text-red-900">
                        <strong>Rejecting this report will:</strong>
                      </p>
                      <ul className="text-sm text-red-800 mt-2 space-y-1 list-disc list-inside">
                        <li>Mark it as invalid or not actionable</li>
                        <li>Send the rejection reason to the submitter</li>
                        <li>Remove it from active processing queue</li>
                      </ul>
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowReviewModal(false);
                      setSelectedReport(null);
                      setReviewAction(null);
                      setRejectionReason("");
                    }}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${
                      reviewAction === "approve"
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-red-600 hover:bg-red-700"
                    }`}
                  >
                    Confirm{" "}
                    {reviewAction === "approve" ? "Approval" : "Rejection"}
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

export default AdminReportsPage;
