import React, { useEffect, useState } from "react";
import { Container } from "src/components/shared/Container";
import { SectionTitle } from "src/components/shared/SectionTitle";
import MapView from "src/components/map/MapView";
import { getReports } from "src/services/api";
import { Report, ReportStatus } from "src/services/models";

const MapPage: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    // fetchReports is defined so it can be called on mount and when reports change
    const fetchReports = async () => {
      try {
        const data = await getReports();
        console.debug("GET /api/reports ->", data);
        const mapped = (data ?? [])
          .filter((r: any) => r.status !== "REJECTED") // Don't show rejected reports on map
          .map((r: any) => {
            return new Report(
              Number(r.latitude ?? r.lat ?? 0),
              Number(r.longitude ?? r.lng ?? 0),
              r.title ?? "",
              (r.status as any) ?? ReportStatus.PENDING,
              r.anonymous ?? false,
              r.id,
              r.description,
              r.category,
              r.photos,
              r.createdAt,
              r.rejectionReason,
              r.user || null,
            );
          });
        setReports(mapped);
      } catch (err) {
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
          const rep = new Report(
            Number(r.latitude ?? r.lat ?? 0),
            Number(r.longitude ?? r.lng ?? 0),
            r.title ?? "",
            (r.status as any) ?? ReportStatus.PENDING,
            r.anonymous ?? false,
            r.id,
            r.description,
            r.category,
            r.photos,
            r.createdAt,
            r.rejectionReason,
            r.user || null,
          );
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
            <div className="mb-4 rounded-md bg-amber-50 border border-amber-200 p-3 text-amber-800 shadow-sm">
              {error}
            </div>
          )}
        </Container>
      </section>

      <section className="h-[75vh]">
        <MapView reports={reports} />
      </section>
    </main>
  );
};

export default MapPage;
