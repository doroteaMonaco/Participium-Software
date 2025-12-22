import React, { useEffect, useState } from "react";
import { Container } from "src/components/shared/Container";
import { SectionTitle } from "src/components/shared/SectionTitle";
import MapView from "src/components/map/MapView";
import { getReports } from "src/services/api";
import { ReportModel } from "src/services/models";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Tag, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";

// Category labels mapping
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
  if (status === "REJECTED") return <XCircle className="h-3.5 w-3.5" />;
  if (status === "PENDING" || status === "PENDING_APPROVAL") return <Clock className="h-3.5 w-3.5" />;
  if (status === "ASSIGNED" || status === "IN_PROGRESS") return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
  if (status === "RESOLVED") return <CheckCircle2 className="h-3.5 w-3.5" />;
  return <Clock className="h-3.5 w-3.5" />;
};

const getStatusDisplayText = (status: string): string => {
  if (status === "PENDING_APPROVAL") return "Pending Approval";
  if (status === "IN_PROGRESS") return "In Progress";
  return status.charAt(0) + status.slice(1).toLowerCase();
};

// Mock data for the list
const mockReports = [
  {
    id: "1",
    title: "Broken streetlight on Main Street",
    status: "ASSIGNED",
    category: "PUBLIC_LIGHTING",
    createdAt: "2024-12-20T10:30:00Z",
    latitude: 45.0677,
    longitude: 7.6825,
    photos: ["mock-photo-1.jpg"],
  },
  {
    id: "2",
    title: "Pothole causing traffic issues",
    status: "IN_PROGRESS",
    category: "ROADS_URBAN_FURNISHINGS",
    createdAt: "2024-12-19T14:20:00Z",
    latitude: 45.0680,
    longitude: 7.6830,
    photos: [],
  },
  {
    id: "3",
    title: "Overflowing trash bins near park",
    status: "RESOLVED",
    category: "WASTE",
    createdAt: "2024-12-18T09:15:00Z",
    latitude: 45.0675,
    longitude: 7.6820,
    photos: ["mock-photo-2.jpg"],
  },
  {
    id: "4",
    title: "Damaged sidewalk ramp accessibility issue",
    status: "ASSIGNED",
    category: "ARCHITECTURAL_BARRIERS",
    createdAt: "2024-12-21T16:45:00Z",
    latitude: 45.0682,
    longitude: 7.6815,
    photos: ["mock-photo-3.jpg"],
  },
  {
    id: "5",
    title: "Water leak on residential street",
    status: "IN_PROGRESS",
    category: "WATER_SUPPLY_DRINKING_WATER",
    createdAt: "2024-12-17T11:00:00Z",
    latitude: 45.0670,
    longitude: 7.6835,
    photos: [],
  },
  {
    id: "6",
    title: "Malfunctioning traffic light intersection",
    status: "SUSPENDED",
    category: "ROAD_SIGNS_TRAFFIC_LIGHTS",
    createdAt: "2024-12-16T08:30:00Z",
    latitude: 45.0685,
    longitude: 7.6810,
    photos: ["mock-photo-4.jpg"],
  },
];

const MapPage: React.FC = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<ReportModel[]>([]);
  const [error, setError] = useState<string>("");
  const [isAuthError, setIsAuthError] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  useEffect(() => {
    // fetchReports is defined so it can be called on mount and when reports change
    const fetchReports = async () => {
      try {
        const data = await getReports();
        console.debug("GET /api/reports ->", data);
        // Backend returns only approved reports for authenticated users
        // Filter to show only approved statuses
        const approvedStatuses = ["ASSIGNED", "IN_PROGRESS", "SUSPENDED", "RESOLVED"];
        const mapped = (data ?? [])
          .filter((r: any) => approvedStatuses.includes(r.status))
          .map((r: any) => new ReportModel(r));
        setReports(mapped);
        setIsAuthError(false);
      } catch (err: any) {
        console.error("Error fetching reports:", err);
        // Check if it's an authentication error
        if (err?.response?.status === 401) {
          setIsAuthError(true);
          setError("Please login to view the map of approved reports.");
        } else {
          setError("Could not fetch reports.");
        }
      }
    };

    fetchReports();

    const onReportsChanged = (e: Event) => {
      // If the event contains a created report, append it immediately to avoid a full refetch
      try {
        const ce = e as CustomEvent<any>;
        if (ce?.detail) {
          const r = ce.detail;
          const rep = new ReportModel(r);
          setReports((prev) => [rep, ...prev]);
          return;
        }
      } catch (err) {
        // fallback to refetch
      }

      fetchReports();
    };

    window.addEventListener(
      "reports:changed",
      onReportsChanged as EventListener,
    );

    return () => {
      window.removeEventListener(
        "reports:changed",
        onReportsChanged as EventListener,
      );
    };
  }, []);

  return (
    <main>
      <section className="bg-gradient-to-b from-white to-slate-50 py-12">
        <Container>
          <SectionTitle
            title="Explore reported issues on the map"
            subtitle="Pan, zoom and click markers to see details."
          />
          {error && (
            <div className={`mb-4 rounded-md border p-4 shadow-sm ${
              isAuthError 
                ? "bg-blue-50 border-blue-200 text-blue-800" 
                : "bg-amber-50 border-amber-200 text-amber-800"
            }`}>
              <p className="font-semibold mb-2">{error}</p>
              {isAuthError && (
                <div className="flex gap-3 mt-3">
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center rounded-lg border border-indigo-600 px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          )}
        </Container>
      </section>

      {!isAuthError && (
        <section className="h-[80vh] flex flex-col lg:flex-row">
          {/* Map Container */}
          <div className="flex-1 h-full">
            <MapView reports={reports} markerDraggable={false} markerLocation={false} showLegend={false} />
          </div>

          {/* Reports List */}
          <div className="w-full lg:w-96 bg-white border-t lg:border-l lg:border-t-0 border-slate-200 overflow-y-auto scrollbar-thin">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 z-10">
              <h3 className="text-lg font-bold text-slate-900">
                Reports ({mockReports.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Click to view details</p>
            </div>

            <div className="divide-y divide-slate-200">
              {mockReports.length === 0 ? (
                <div className="px-4 py-8 text-center text-slate-500">
                  <MapPin className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">No reports to display</p>
                </div>
              ) : (
                mockReports.map((report) => (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    whileHover={{ backgroundColor: "#f8fafc" }}
                    className={`px-4 py-3 cursor-pointer transition-colors ${
                      selectedReportId === report.id ? "bg-indigo-50" : ""
                    }`}
                    onClick={() => {
                      setSelectedReportId(report.id);
                      navigate(`/report/${report.id}`);
                    }}
                  >
                    {/* Status Badge */}
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadgeClass(report.status)}`}
                      >
                        {getStatusIcon(report.status)}
                        {getStatusDisplayText(report.status)}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(report.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    {/* Title */}
                    <h4 className="font-semibold text-slate-900 text-sm mb-1.5 line-clamp-2">
                      {report.title}
                    </h4>

                    {/* Category */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-1">
                      <Tag className="h-3 w-3" />
                      <span>{ENUM_TO_LABEL[report.category] ?? report.category}</span>
                    </div>

                    {/* Location */}
                    {report.latitude && report.longitude && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <MapPin className="h-3 w-3" />
                        <span>
                          {report.latitude.toFixed(4)}°, {report.longitude.toFixed(4)}°
                        </span>
                      </div>
                    )}

                    {/* Photo Thumbnail */}
                    {report.photos && report.photos.length > 0 && (
                      <div className="mt-2">
                        <div className="w-full h-24 bg-gradient-to-br from-slate-200 to-slate-300 rounded-lg flex items-center justify-center">
                          <MapPin className="h-8 w-8 text-slate-400" />
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </section>
      )}
    </main>
  );
};

export default MapPage;
