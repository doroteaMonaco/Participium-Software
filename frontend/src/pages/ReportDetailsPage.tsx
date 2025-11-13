import React, { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
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

const backendOrigin = (import.meta.env.VITE_API_URL || "http://localhost:4000/api").replace(/\/api\/?$/, "");

const ReportDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [report, setReport] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      try {
        const data = await getReportById(id);
        setReport(data);
      } catch (err: any) {
        console.error(err);
        setError("Could not load report details");
      }
    };
    fetch();
  }, [id]);

  // Check if we came from the dashboard, otherwise go back to /map
  const fromDashboard = (location.state as any)?.fromDashboard;
  const backLink = fromDashboard ? "/dashboard/new-report" : "/map";
  const backText = fromDashboard ? "Back to Dashboard" : "Back to map";

  if (error) {
    return (
      <main className="p-6">
        <p className="text-red-600">{error}</p>
        <Link to={backLink} className="text-indigo-600 underline">
          {backText}
        </Link>
      </main>
    );
  }

  if (!report) {
    return (
      <main className="p-6">
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">{report.title}</h1>
      <p className="text-sm text-slate-500 mb-4">Created: {new Date(report.createdAt).toLocaleString()}</p>
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
            {report.photos.map((p: string, i: number) => (
              <img
                key={i}
                src={`${backendOrigin}/uploads/${p}`}
                alt={`photo-${i}`}
                className="w-full h-40 object-cover rounded"
              />
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <Link to={backLink} className="text-indigo-600 hover:underline">
          ← {backText}
        </Link>
      </div>
    </main>
  );
};

export default ReportDetailsPage;
