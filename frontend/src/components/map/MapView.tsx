import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import ReportMarker from "./ReportMarker";

import type { LatLngExpression } from "leaflet";
import type { Report } from "src/services/models";
import CustomMarker from "./CustomMarker";

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
  center: [45.0677551, 7.6824892] as LatLngExpression, // Torino
  zoom: 12, // default zoom level
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

type Props = {
  reports: Report[];
  markerDraggable?: boolean;
  markerLocation?: boolean;
};

const MapView: React.FC<React.PropsWithChildren<Props>> = ({
  children,
  reports,
  markerDraggable = false,
  markerLocation = false,
}) => {
  const [geoJsonData, setGeoJsonData] = useState<GeoJSON.GeoJsonObject | null>(
    null,
  );
  const [geoJsonError, setGeoJsonError] = useState(false);
  const [showOutOfBoundsAlert, setShowOutOfBoundsAlert] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadGeoJson = async () => {
      try {
        const response = await fetch("/export.geojson");
        if (!response.ok) {
          throw new Error("Failed to load GeoJSON");
        }
        const data = await response.json();
        setGeoJsonData(data);
        setGeoJsonError(false);
      } catch (error) {
        console.error("Error loading GeoJSON:", error);
        setGeoJsonError(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadGeoJson();
  }, []);

  if (isLoading) return <MapPlaceholder />;

  return (
    <div className="h-full w-full">
      {showOutOfBoundsAlert && (
        // TODO: Replace with a better alert component
        <div
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded shadow-md"
          role="alert"
        >
          <strong className="font-bold">Warning!</strong>
          <span className="block sm:inline">
            The selected location is outside the allowed area.
          </span>
          <button
            type="button"
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setShowOutOfBoundsAlert(false)}
          >
            Close
          </button>
        </div>
      )}

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

        {geoJsonError && (
          <div className="p-6 text-center text-sm text-red-500">
            Failed to load map boundary data.
          </div>
        )}

        {geoJsonData && (
          <>
            <GeoJSON data={geoJsonData} />
            <CustomMarker
              draggable={markerDraggable}
              location={markerLocation}
              geoJsonData={geoJsonData}
              onOutOfBounds={() => {
                setShowOutOfBoundsAlert(true);
              }}
            />
          </>
        )}

        {reports.map((r) => (
          <ReportMarker key={r.id} report={r} />
        ))}
        {children}
      </MapContainer>
    </div>
  );
};

export default MapView;
