import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getReportById } from "src/services/api";

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
  if (status === "REJECTED") return "bg-red-100 text-red-800";
  if (status === "PENDING" || status === "PENDING_APPROVAL")
    return "bg-indigo-100 text-indigo-800";
  if (status === "ASSIGNED") return "bg-blue-100 text-blue-800";
  if (status === "IN_PROGRESS") return "bg-amber-100 text-amber-800";
  if (status === "RESOLVED") return "bg-green-100 text-green-800";
  return "bg-slate-100 text-slate-800";
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
  <main className="p-6">
    <p className="text-red-600">{error}</p>
    <button onClick={onGoBack} className="text-indigo-600 hover:underline">
      ← Go Back
    </button>
  </main>
);

const LoadingView: React.FC = () => (
  <main className="p-6">
    <p>Loading...</p>
  </main>
);

const ReportDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<any | null>(null);
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
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">{report.title}</h1>
      <p className="text-sm text-slate-500 mb-4">
        Created: {new Date(report.createdAt).toLocaleString()}
      </p>

      {/* Status Badge */}
      <div className="mb-4">
        <strong>Status:</strong>{" "}
        <span
          className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(report.status)}`}
        >
          {getStatusDisplayText(report.status)}
        </span>
      </div>

      {/* Rejection Reason - Only show if rejected */}
      {report.status === "REJECTED" && report.rejectionReason && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <strong className="text-red-800">Rejection Reason:</strong>
          <p className="mt-2 text-red-700">{report.rejectionReason}</p>
        </div>
      )}

      {/* User Information */}
      <div className="mb-4">
        <strong>Submitted by:</strong>{" "}
        <span>
          {report.anonymous || !report.user
            ? "Anonymous"
            : `${report.user.firstName} ${report.user.lastName}`}
        </span>
      </div>

      <div className="mb-4">
        <strong>Category:</strong>{" "}
        <span>{ENUM_TO_LABEL[report.category] ?? report.category}</span>
      </div>
      <div className="mb-4">
        <strong>Description</strong>
        <p className="mt-1 text-slate-700">{report.description}</p>
      </div>

      {report.photos && report.photos.length > 0 && (
        <div className="mb-4">
          <strong>Photos</strong>
          <div className="grid grid-cols-2 gap-3 mt-2">
            {report.photos.map((p: string) => (
              <img
                key={p}
                src={`${import.meta.env.VITE_API_URL || "http://localhost:4000"}/uploads/${p}`}
                alt={`Report photo`}
                className="w-full h-40 object-cover rounded"
              />
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <button
          onClick={() => navigate(-1)}
          className="text-indigo-600 hover:underline"
        >
          ← Go Back
        </button>
      </div>
    </main>
  );
};

export default ReportDetailsPage;
