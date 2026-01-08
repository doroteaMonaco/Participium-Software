import React, { useEffect, useState } from "react";
import { Container } from "src/components/shared/Container";
import { SectionTitle } from "src/components/shared/SectionTitle";
import MapView from "src/components/map/MapView";
import { getReportsForMapView, searchReports } from "src/services/api";
import { ReportModel } from "src/services/models";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Tag, FileText, AlignLeft } from "lucide-react";

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

const getStatusDisplayText = (status: string): string => {
  if (status === "PENDING_APPROVAL") return "Pending Approval";
  if (status === "IN_PROGRESS") return "In Progress";
  return status.charAt(0) + status.slice(1).toLowerCase();
};

const MapPage: React.FC = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<ReportModel[]>([]);
  const [filteredReports, setFilteredReports] = useState<ReportModel[]>([]);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [error, setError] = useState<string>("");
  const [isAuthError, setIsAuthError] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);

  const handleAddressSearch = async (lat: number, lon: number) => {
    try {
      setError("");
      const data = await searchReports(lat, lon);
      const mapped = (data ?? []).map((r: any) => new ReportModel(r));
      setFilteredReports(mapped);
      setIsSearchActive(true);
    } catch (err: any) {
      console.error("Error searching reports:", err);
      setError("Could not search reports in this area.");
    }
  };

  useEffect(() => {
    // fetchReports is defined so it can be called on mount and when reports change
    const fetchReports = async () => {
      try {
        const data = await getReportsForMapView();
        // Backend returns only approved reports for authenticated users
        // Filter to show only approved statuses
        const mapped = (data ?? []).map((r: any) => new ReportModel(r));
        setReports(mapped);
        setFilteredReports(mapped);
        setIsAuthError(false);
      } catch (err: any) {
        console.error("Error fetching reports:", err);
        setError("Could not fetch reports.");
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
          if (!isSearchActive) {
            setFilteredReports((prev) => [rep, ...prev]);
          }
          return;
        }
      } catch (err) {
        // Ignore error and fall back to full refetch
        console.warn("Failed to parse report event detail, refetching all reports");
      }

      fetchReports();
    };

    globalThis.window.addEventListener(
      "reports:changed",
      onReportsChanged as EventListener,
    );

    return () => {
      globalThis.window.removeEventListener(
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
            <div className={`mb-4 rounded-md border p-4 shadow-sm ${isAuthError
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
            <MapView
              reports={filteredReports}
              markerDraggable={false}
              markerLocation={false}
              showLegend={true}
              showMarker={false}
              selectedReportId={selectedReportId}
              onAddressSearch={handleAddressSearch}
            />
          </div>

          {/* Reports List */}
          <div className="w-full lg:w-96 bg-white border-t lg:border-l lg:border-t-0 border-slate-200 overflow-y-auto scrollbar-thin">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Reports ({filteredReports.length}){isSearchActive && " - Filtered"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Click to view details</p>
                </div>
                {isSearchActive && (
                  <button
                    onClick={() => {
                      setFilteredReports(reports);
                      setIsSearchActive(false);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            </div>

            <div className="divide-y divide-slate-200">
              {filteredReports.length === 0 ? (
                <div className="px-4 py-8 text-center text-slate-500">
                  <MapPin className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">{isSearchActive ? "No reports found in this area" : "No reports to display"}</p>
                </div>
              ) : (
                filteredReports.map((report) => (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    whileHover={{ backgroundColor: "#f8fafc" }}
                    className={`px-4 py-3 transition-colors ${
                      selectedReportId === report.id ? "bg-indigo-50" : ""
                    }`}
                  >
                    {/* Status Badge */}
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadgeClass(report.status)}`}
                      >
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
                    <div className="flex items-start gap-1.5 mb-1.5">
                      <FileText className="h-3.5 w-3.5 text-slate-700 flex-shrink-0 mt-0.5" />
                      <h4 className="font-semibold text-slate-900 text-sm line-clamp-2 text-left">
                        {report.title}
                      </h4>
                    </div>

                    {/* Description */}
                    <div className="flex items-start gap-1.5 mb-2">
                      <AlignLeft className="h-3.5 w-3.5 text-slate-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-600 line-clamp-2 text-left">
                        {report.description}
                      </p>
                    </div>

                    {/* Category */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-2">
                      <Tag className="h-3 w-3" />
                      <span>{ENUM_TO_LABEL[report.category] ?? report.category}</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedReportId(report.id);
                        }}
                        className="flex-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        <MapPin className="h-3 w-3" />
                        Show on Map
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/report/${report.id}`);
                        }}
                        className="flex-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        View Details
                      </button>
                    </div>
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
