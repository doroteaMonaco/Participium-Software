import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "src/components/dashboard/DashboardLayout";
import MapView from "src/components/map/MapView";
import { ArrowLeft, Info } from "lucide-react";
import { getReports } from "src/services/api";
import { ReportModel } from "src/services/models";

const NewReportPage: React.FC = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<ReportModel[]>([]);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const data = await getReports();
        const mapped = (data ?? [])
          .filter((r: any) => r.status !== "REJECTED") // Don't show rejected reports on map
          .map((r: any) => new ReportModel(r));
        setReports(mapped);
      } catch (err) {
        console.error("Error fetching reports:", err);
      }
    };

    fetchReports();

    // Listen for new reports being created
    const handleReportCreated = (event: Event) => {
      const customEvent = event as CustomEvent;
      const newReport = customEvent.detail;
      if (newReport) {
        // Add the new report to the map
        const mappedReport = new ReportModel(newReport);
        setReports((prev) => [...prev, mappedReport]);
      }
    };

    window.addEventListener("reports:changed", handleReportCreated);

    return () => {
      window.removeEventListener("reports:changed", handleReportCreated);
    };
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6 w-full h-full">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5 text-slate-700" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Create New Report
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Select a location on the map to report an issue
              </p>
            </div>
          </div>
        </div>

        {/* Instructions Card */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Info className="h-5 w-5 text-indigo-700" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-indigo-900 mb-1">
                How to create a report
              </h3>
              <ol className="text-sm text-indigo-800 space-y-1 list-decimal list-inside">
                <li>
                  Click anywhere on the map to select the problem location
                </li>
                <li>Drag the marker to adjust the position if needed</li>
                <li>Click "Create Report" in the popup to open the form</li>
                <li>
                  Fill in all required details: title, description, category,
                  and photos (1-3)
                </li>
                <li>Choose whether to submit anonymously</li>
                <li>Submit your report</li>
              </ol>
              <p className="text-xs text-indigo-700 mt-2">
                <strong>Note:</strong> You can use the "Locate me" button to
                center the map on your current location.
              </p>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div
          className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
          style={{ height: "calc(100vh - 380px)", minHeight: "500px" }}
        >
          <MapView
            reports={reports}
            markerDraggable={true}
            markerLocation={true}
          />
        </div>

        {/* Quick Tips */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <span className="text-emerald-700 font-bold text-sm">1</span>
              </div>
              <h4 className="font-semibold text-slate-900 text-sm">
                Required Photos
              </h4>
            </div>
            <p className="text-xs text-slate-600">
              Attach 1 to 3 photos of the issue. Each photo must be less than
              5MB. Supported formats: JPEG, PNG, GIF.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                <span className="text-indigo-700 font-bold text-sm">2</span>
              </div>
              <h4 className="font-semibold text-slate-900 text-sm">
                Choose Category
              </h4>
            </div>
            <p className="text-xs text-slate-600">
              Select the most appropriate category for your report. This helps
              the municipality route it to the right department.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-8 w-8 rounded-lg bg-purple-50 flex items-center justify-center">
                <span className="text-purple-700 font-bold text-sm">3</span>
              </div>
              <h4 className="font-semibold text-slate-900 text-sm">
                Anonymous Option
              </h4>
            </div>
            <p className="text-xs text-slate-600">
              You can submit reports anonymously. Your name won't be visible in
              public listings, but officials can still contact you.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default NewReportPage;
