import React, { useState } from "react";
import { MunicipalityDashboardLayout } from "../../components/dashboard/MunicipalityDashboardLayout";
import { motion } from "framer-motion";
import {
  FileText,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Calendar,
  User,
} from "lucide-react";
import { createPortal } from "react-dom";

interface Report {
  id: string;
  title: string;
  description: string;
  category: string;
  status: "Pending" | "Approved" | "Rejected" | "In Progress" | "Resolved";
  location: string;
  coordinates: { lat: number; lng: number };
  createdAt: string;
  submittedBy: string;
  isAnonymous: boolean;
  photos: string[];
  rejectionReason?: string;
  assignedOffice?: string;
}

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

const sampleReports: Report[] = [
  {
    id: "RPT-105",
    title: "Broken streetlight on Via Roma",
    description:
      "The streetlight near building 45 has been broken for 3 days, creating safety concerns for pedestrians at night.",
    category: "Public Lighting",
    status: "Pending",
    location: "Via Roma 45, Centro",
    coordinates: { lat: 45.0703, lng: 7.6869 },
    createdAt: "2025-11-09",
    submittedBy: "Mario Rossi",
    isAnonymous: false,
    photos: ["/placeholder-report1.jpg", "/placeholder-report2.jpg"],
  },
  {
    id: "RPT-104",
    title: "Pothole near school entrance",
    description:
      "Large pothole at school entrance poses danger to children and vehicles.",
    category: "Roads & Urban Furnishings",
    status: "Pending",
    location: "Via Garibaldi 12, Vanchiglia",
    coordinates: { lat: 45.0702, lng: 7.697 },
    createdAt: "2025-11-08",
    submittedBy: "Anonymous",
    isAnonymous: true,
    photos: ["/placeholder-report3.jpg"],
  },
  {
    id: "RPT-103",
    title: "Overflowing trash bin",
    description:
      "Trash bin has been overflowing for days, attracting pests and creating unpleasant odors.",
    category: "Waste",
    status: "Approved",
    location: "Corso Francia 100, San Salvario",
    coordinates: { lat: 45.06, lng: 7.68 },
    createdAt: "2025-11-08",
    submittedBy: "Giulia Bianchi",
    isAnonymous: false,
    photos: ["/placeholder-report4.jpg"],
    assignedOffice: "Environmental Services - Waste Management",
  },
  {
    id: "RPT-102",
    title: "Graffiti on public building",
    description: "Recent graffiti vandalism on municipal building facade.",
    category: "Other",
    status: "Rejected",
    location: "Piazza Castello, Centro",
    coordinates: { lat: 45.0705, lng: 7.6858 },
    createdAt: "2025-11-07",
    submittedBy: "Marco Verdi",
    isAnonymous: false,
    photos: [],
    rejectionReason:
      "This issue does not fall under citizen-reportable categories. Please contact the cultural heritage office directly.",
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
    photos: ["/placeholder-report5.jpg", "/placeholder-report6.jpg"],
  },
];

const statusColors = {
  Pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  Approved: "bg-green-50 text-green-700 border-green-200",
  Rejected: "bg-red-50 text-red-700 border-red-200",
  "In Progress": "bg-blue-50 text-blue-700 border-blue-200",
  Resolved: "bg-slate-50 text-slate-700 border-slate-200",
};

export const AdminReportsPage: React.FC = () => {
  const [reports, setReports] = useState<Report[]>(sampleReports);
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

  const handleReviewClick = (report: Report, action: "approve" | "reject") => {
    setSelectedReport(report);
    setReviewAction(action);
    setRejectionReason("");
    setShowReviewModal(true);
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedReport && reviewAction) {
      const assignedOffice =
        reviewAction === "approve"
          ? categoryOfficeMapping[selectedReport.category] ||
            "General Services Office"
          : undefined;

      setReports(
        reports.map((r) =>
          r.id === selectedReport.id
            ? {
                ...r,
                status: reviewAction === "approve" ? "Approved" : "Rejected",
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
  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.location.toLowerCase().includes(searchQuery.toLowerCase());

    // Tab-based filtering
    let matchesTab = true;
    if (activeTab === "pending") {
      matchesTab = report.status === "Pending";
    } else if (activeTab === "approved") {
      matchesTab =
        report.status === "Approved" ||
        report.status === "In Progress" ||
        report.status === "Resolved";
    } else if (activeTab === "rejected") {
      matchesTab = report.status === "Rejected";
    }

    return matchesSearch && matchesTab;
  });

  const pendingCount = reports.filter((r) => r.status === "Pending").length;
  const approvedCount = reports.filter(
    (r) =>
      r.status === "Approved" ||
      r.status === "In Progress" ||
      r.status === "Resolved",
  ).length;
  const rejectedCount = reports.filter((r) => r.status === "Rejected").length;

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
              placeholder="Search by title, ID, or location..."
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

                  {/* Status-specific info */}
                  {report.status === "Approved" && report.assignedOffice && (
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
                  )}

                  {report.status === "Rejected" && report.rejectionReason && (
                    <div className="rounded-xl bg-red-50 border-2 border-red-200 p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-red-900 mb-2">
                            ✗ Rejected - Reason:
                          </p>
                          <p className="text-sm text-red-800 leading-relaxed">
                            {report.rejectionReason}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {report.status === "Pending" && (
                    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200">
                      <button
                        onClick={() => handleReviewClick(report, "approve")}
                        className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 px-6 py-3 text-base font-bold text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="h-5 w-5" />
                        Approve Report
                      </button>
                      <button
                        onClick={() => handleReviewClick(report, "reject")}
                        className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 px-6 py-3 text-base font-bold text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                      >
                        <XCircle className="h-5 w-5" />
                        Reject Report
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
                {/* Report Summary */}
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-900 mb-1">
                    {selectedReport.id}: {selectedReport.title}
                  </p>
                  <p className="text-xs text-slate-600">
                    {selectedReport.location}
                  </p>
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
