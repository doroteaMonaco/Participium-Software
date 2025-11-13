import React from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import ReportMarker from "./ReportMarker";

import type { LatLngExpression } from "leaflet";
import type { Report } from "src/services/models";

/*
Grouping Strategy of Reports:
- 0-10 green markers
- 11-50 yellow markers
- 51-200 orange markers
- 200+ red markers

Zoom levels
13 - City level 
15 - Street level: 
> 15 - Building level: no report grouping  
*/

const MAP_OPTIONS = {
  center: [45.0703, 7.6869] as LatLngExpression, // Torino
  zoom: 13, // default zoom level
  scrollWheelZoom: false,
};

const MapPlaceholder: React.FC = () => {
  return (
    <div className="p-6 text-center text-sm text-slate-500">
      Map of Turin.
      <noscript className="block mt-2">
        You need to enable JavaScript to see this map.
      </noscript>
    </div>
  );
};
const MapView: React.FC<React.PropsWithChildren<{ reports: Report[] }>> = ({
  children,
  reports,
}) => {
  const markers = reports.filter(
    (r) => typeof r.lat === "number" && typeof r.lng === "number"
  );

  const displayMarkers = markers.length ? markers : reports;

  return (
    <div className="h-full w-full">
      <MapContainer
        center={MAP_OPTIONS.center}
        zoom={MAP_OPTIONS.zoom}
        scrollWheelZoom={MAP_OPTIONS.scrollWheelZoom}
        placeholder={<MapPlaceholder />}
        className="h-full w-full rounded-lg"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {displayMarkers.map((r) => (
          <ReportMarker key={r.id} report={r} />
        ))}
        {children}
      </MapContainer>
    </div>
  );
};

export default MapView;
