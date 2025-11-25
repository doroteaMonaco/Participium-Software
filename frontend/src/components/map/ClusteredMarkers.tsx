import React, { useEffect } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { useMap } from "react-leaflet";
import { Report, ReportStatus } from "src/services/models";

function getColorForStatus(status?: ReportStatus): string {
  switch (status) {
    case ReportStatus.PENDING:
      return "indigo";
    case ReportStatus.ASSIGNED:
      return "blue";
    case ReportStatus.IN_PROGRESS:
      return "amber";
    case ReportStatus.SUSPENDED:
      return "slate";
    case ReportStatus.REJECTED:
      return "red";
    case ReportStatus.RESOLVED:
      return "green";
    default:
      return "black";
  }
}

type Props = {
  reports: Report[];
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
    });

    // Add markers from reports
    reports.forEach((r) => {
      const color = getColorForStatus(r.status);
      // create a circle marker similar to ReportMarker
      const marker = L.circleMarker([r.lat, r.lng], {
        radius: 10,
        color,
        fillColor: color,
        fillOpacity: 0.6,
        weight: 1.5,
      });

      const title = r.title ?? `Report #${r.id}`;
      const rawCreated: any =
        (r as any).createdAt ?? (r as any).created_at ?? "";

      let created = "";
      if (rawCreated) {
        let d: Date | null = null;

        // Handle Date objects
        if (rawCreated instanceof Date) d = rawCreated;

        // Handle numeric timestamps (seconds or milliseconds) or numeric strings
        if (
          !d &&
          (typeof rawCreated === "number" || /^\d+$/.test(String(rawCreated)))
        ) {
          const n = Number(rawCreated);
          // if seconds (10 digits), convert to ms
          d = n > 1e12 ? new Date(n) : new Date(n * (n < 1e12 ? 1000 : 1));
        }

        // Handle ISO strings and other date strings
        if (!d && typeof rawCreated === "string") {
          d = new Date(rawCreated);
        }

        // If still invalid, try toString on object
        if (!d && rawCreated && typeof rawCreated.toString === "function") {
          d = new Date(rawCreated.toString());
        }

        if (d && !isNaN(d.getTime())) {
          created = d.toLocaleString();
        } else {
          created = String(rawCreated);
        }
      }

      const popupHtml = `
        <div style="max-width:240px">
          <div style="font-weight:600">${title}</div>
          <div style="font-size:12px;color:#666;margin-top:4px">Created: ${created}</div>
          <a href=\"/report/${r.id}\" style=\"color:#2563eb;display:inline-block;margin-top:8px;text-decoration:none;\">View details</a>
        </div>
      `;

      marker.bindPopup(popupHtml);
      clusterGroup.addLayer(marker);
    });

    map.addLayer(clusterGroup);

    return () => {
      try {
        map.removeLayer(clusterGroup);
      } catch (e) {
        // ignore
      }
    };
  }, [map, reports]);

  return null;
};

export default ClusteredMarkers;
