import React, { useEffect } from "react";
import L from "leaflet";
// @ts-ignore - leaflet.markercluster doesn't have type definitionsf
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { useMap } from "react-leaflet";
import { ReportModel, ReportStatus } from "src/services/models";

function getColorForStatus(status?: ReportStatus): string {
  switch (status) {
    case ReportStatus.PENDING:
      return "#a855f7"; // Purple-500
    case ReportStatus.ASSIGNED:
      return "#3b82f6"; // Blue-500
    case ReportStatus.IN_PROGRESS:
      return "#f59e0b"; // Amber-500
    case ReportStatus.SUSPENDED:
      return "#64748b"; // Slate-500
    case ReportStatus.REJECTED:
      return "#ef4444"; // Red-500
    case ReportStatus.RESOLVED:
      return "#22c55e"; // Green-500
    default:
      return "#000000";
  }
}

function createMarkerIcon(color: string) {
  return L.divIcon({
    html: `<div style="
      position: relative;
      width: 32px;
      height: 40px;
    ">
      <svg viewBox="0 0 32 40" style="width: 100%; height: 100%;">
        <path 
          d="M16 0C7.16344 0 0 7.16344 0 16C0 28 16 40 16 40C16 40 32 28 32 16C32 7.16344 24.8366 0 16 0Z" 
          fill="${color}" 
          stroke="white" 
          stroke-width="1.5"
        />
        <circle cx="16" cy="15" r="4" fill="white" />
      </svg>
    </div>`,
    className: "custom-report-marker",
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -40],
  });
}

function parseReportDate(rawCreated: any): string {
  if (!rawCreated) return "";

  const numericToDate = (n: number): Date | null => {
    if (!Number.isFinite(n) || Number.isNaN(n)) return null;
    return n > 1e12 ? new Date(n) : new Date(n * 1000);
  };

  if (rawCreated instanceof Date) {
    return rawCreated.toLocaleString();
  }

  if (typeof rawCreated === "number") {
    const d = numericToDate(rawCreated);
    return d && !Number.isNaN(d.getTime())
      ? d.toLocaleString()
      : String(rawCreated);
  }

  const str = String(rawCreated).trim();
  if (!str) return "";

  if (/^\d+$/.test(str)) {
    const d = numericToDate(Number(str));
    if (d && !Number.isNaN(d.getTime())) return d.toLocaleString();
    return String(rawCreated);
  }

  const parsed = new Date(str);
  return !Number.isNaN(parsed.getTime())
    ? parsed.toLocaleString()
    : String(rawCreated);
}

function getPopupHtml(
  title: string,
  created: string,
  id: string | number,
): string {
  return `
    <div style="max-width:240px">
      <div style="font-weight:600">${title}</div>
      <div style="font-size:12px;color:#666;margin-top:4px">Created: ${created}</div>
      <a href="/report/${id}" style="color:#2563eb;display:inline-block;margin-top:8px;text-decoration:none;">View details</a>
    </div>
  `;
}

type Props = {
  reports: ReportModel[];
};

const ClusteredMarkers: React.FC<Props> = ({ reports }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // Create cluster group with options: disable clustering at high zoom
    const clusterGroup = (L as any).markerClusterGroup({
      disableClusteringAtZoom: 16,
      maxClusterRadius: 60,
      chunkedLoading: true,
      showCoverageOnHover: false,
      iconCreateFunction: (cluster: any) => {
        const count = cluster.getChildCount();
        return L.divIcon({
          html: `<div style="
            background: rgba(236, 72, 153, 0.6);
            border: 1.5px solid #ec4899;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            font-weight: bold;
            font-size: 14px;
          ">${count}</div>`,
          className: "custom-cluster-icon",
          iconSize: L.point(40, 40),
        });
      },
    });

    // Add markers from reports
    reports.forEach((r) => {
      const color = getColorForStatus(r.status);
      // create a marker with a pin icon
      const marker = L.marker([r.lat, r.lng], {
        icon: createMarkerIcon(color),
      });

      const title = r.title ?? `Report #${r.id}`;
      const rawCreated = r.createdAt ?? "";

      const created = parseReportDate(rawCreated);

      marker.bindPopup(getPopupHtml(title, created, r.id));
      clusterGroup.addLayer(marker);
    });

    map.addLayer(clusterGroup);

    return () => {
      try {
        map.removeLayer(clusterGroup);
      } catch {
        // ignore
      }
    };
  }, [map, reports]);

  return null;
};

export default ClusteredMarkers;
