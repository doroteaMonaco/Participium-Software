import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  User, 
  Tag, 
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2
} from "lucide-react";
import { getReportById, type Report } from "src/services/api";

// Reverse map backend enum -> human-friendly labels (keep in sync with form)
const ENUM_TO_LABEL: Record<string, string> = {
  WATER_SUPPLY_DRINKING_WATER: "Water Supply – Drinking Water",
  ARCHITECTURAL_BARRIERS: "Architectural Barriers",
  SEWER_SYSTEM: "Sewer System",
  PUBLIC_LIGHTING: "Public Lighting",
  WASTE: "Waste",
  ROAD_SIGNS_TRAFFIC_LIGHTS: "Road Signs and Traffic Lights",
  ROADS_URBAN_FURNISHINGS: "Roads and Urban Furnishings",
  PUBLIC_GREEN_AREAS_PLAYGROUNDS: "Public Green Areas and Playgrounds",
  OTHER: "Other",
};

const getStatusBadgeClass = (status: string): string => {
  if (status === "REJECTED") return "bg-red-100 text-red-700 border-red-200";
  if (status === "PENDING" || status === "PENDING_APPROVAL")
    return "bg-purple-100 text-purple-700 border-purple-200";
  if (status === "ASSIGNED") return "bg-blue-100 text-blue-700 border-blue-200";
  if (status === "IN_PROGRESS") return "bg-amber-100 text-amber-700 border-amber-200";
  if (status === "RESOLVED") return "bg-green-100 text-green-700 border-green-200";
  if (status === "SUSPENDED") return "bg-gray-100 text-gray-700 border-gray-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
};

const getStatusIcon = (status: string) => {
  if (status === "REJECTED") return <XCircle className="h-4 w-4" />;
  if (status === "PENDING" || status === "PENDING_APPROVAL") return <Clock className="h-4 w-4" />;
  if (status === "ASSIGNED" || status === "IN_PROGRESS") return <Loader2 className="h-4 w-4 animate-spin" />;
  if (status === "RESOLVED") return <CheckCircle2 className="h-4 w-4" />;
  return <AlertCircle className="h-4 w-4" />;
};

const getStatusDisplayText = (status: string): string => {
  if (status === "PENDING_APPROVAL") return "Pending";
  if (status === "IN_PROGRESS") return "In Progress";
  return status.charAt(0) + status.slice(1).toLowerCase();
};

const ErrorView: React.FC<{ error: string; onGoBack: () => void }> = ({
  error,
  onGoBack,
}) => (
  <main className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center p-6">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full border border-red-200"
    >
      <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
        <XCircle className="h-8 w-8 text-red-600" />
      </div>
      <h2 className="text-2xl font-bold text-center text-slate-900 mb-2">Oops!</h2>
      <p className="text-center text-red-600 mb-6">{error}</p>
      <button
        onClick={onGoBack}
        className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
      >
        <ArrowLeft className="h-5 w-5" />
        Go Back
      </button>
    </motion.div>
  </main>
);

const LoadingView: React.FC = () => (
  <main className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex items-center justify-center p-6">
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center"
    >
      <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
      </div>
      <p className="text-lg text-slate-600 font-medium">Loading report details...</p>
    </motion.div>
  </main>
);

const ReportDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      try {
        const data = await getReportById(id);
        setReport(data);
      } catch (err) {
        console.error(err);
        setError("Could not load report details");
      }
    };
    fetch();
  }, [id]);

  if (error) return <ErrorView error={error} onGoBack={() => navigate(-1)} />;
  if (!report) return <LoadingView />;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8">
      <div className="max-w-7xl mx-auto px-6">
        {/* Back button - left aligned */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium transition-colors group mb-6"
        >
          <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
          Back
        </button>

        {/* Single White Box Container */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden"
        >
          {/* Header Section - Title and Status */}
          <div className="p-8 border-b border-slate-200">
            <div className="flex items-start justify-between gap-4 mb-4">
              <h1 className="text-3xl font-bold text-slate-900 leading-tight flex-1">
                {report.title}
              </h1>
              <span
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border flex-shrink-0 ${getStatusBadgeClass(report.status)}`}
              >
                {getStatusIcon(report.status)}
                {getStatusDisplayText(report.status)}
              </span>
            </div>

            {/* Rejection Reason - Only show if rejected */}
            {report.status === "REJECTED" && report.rejectionReason && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg"
              >
                <div className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-red-900 text-sm mb-1">Rejection Reason</h3>
                    <p className="text-red-700 text-sm">{report.rejectionReason}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Content Section */}
          <div className="p-8">
            {/* First Row - Report Details and Description */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Report Details */}
              <div className="border border-slate-200 rounded-xl p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4 text-left">Report Details</h2>
                
                <div className="space-y-5">
                  {/* Date */}
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Submitted</p>
                      <p className="text-slate-900 font-semibold">
                        {new Date(report.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                      <p className="text-sm text-slate-500">
                        {new Date(report.createdAt).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Category */}
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <Tag className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Category</p>
                      <p className="text-slate-900 font-semibold">
                        {ENUM_TO_LABEL[report.category] ?? report.category}
                      </p>
                    </div>
                  </div>

                  {/* Submitted By */}
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <User className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Submitted by</p>
                      <p className="text-slate-900 font-semibold">
                        {report.anonymous || !report.user
                          ? "Anonymous User"
                          : `${report.user.firstName} ${report.user.lastName}`}
                      </p>
                    </div>
                  </div>

                  {/* Location */}
                  {(report.latitude && report.longitude) && (
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Location</p>
                        <p className="text-slate-900 font-semibold text-sm">
                          Lat: {report.latitude.toFixed(4)}°, Lon: {report.longitude.toFixed(4)}°
                        </p>
                        <a
                          href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium hover:underline inline-flex items-center gap-1 mt-1"
                        >
                          View on Google Maps →
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Assigned Office */}
                  {report.assignedOffice && (
                    <div className="pt-4 border-t border-slate-200">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Assigned To</p>
                      <p className="text-blue-700 font-semibold capitalize">
                        {report.assignedOffice}
                      </p>
                    </div>
                  )}

                  {/* External Maintainer */}
                  {report.externalMaintainer && (
                    <div className="pt-4 border-t border-slate-200">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Handled By</p>
                      <p className="text-purple-700 font-semibold">
                        {report.externalMaintainer.companyName}
                      </p>
                      <p className="text-sm text-slate-600 mt-1">
                        {report.externalMaintainer.firstName} {report.externalMaintainer.lastName}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="border border-slate-200 rounded-xl p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4 text-left">Description</h2>
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap text-left">
                  {report.description}
                </p>
              </div>
            </div>

            {/* Second Row - Photos */}
            {report.photos && report.photos.length > 0 && (
              <div className="border-t border-slate-200 pt-8">
                <h2 className="text-lg font-bold text-slate-900 mb-4 text-left">Photos</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {report.photos.map((p: string, index: number) => (
                    <motion.div
                      key={p}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="relative group overflow-hidden rounded-xl border border-slate-200"
                    >
                      <img
                        src={`${import.meta.env.VITE_API_URL || "http://localhost:4000"}/uploads/${p}`}
                        alt={`Report photo ${index + 1}`}
                        className="w-full h-56 object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </main>
  );
};

export default ReportDetailsPage;
