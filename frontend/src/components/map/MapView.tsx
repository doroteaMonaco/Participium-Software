import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
// Cluster group for grouping nearby markers
import ClusteredMarkers from "./ClusteredMarkers";

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
  scrollWheelZoom: true,
  minZoom: 10,
  maxZoom: 19,
};

// Component to expose map instance to parent
const MapInstanceProvider: React.FC<{ setMapInstance: (map: any) => void }> = ({
  setMapInstance,
}) => {
  const map = useMap();

  useEffect(() => {
    setMapInstance(map);
  }, [map, setMapInstance]);

  return null;
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
  const mapInstanceRef = useRef<any>(null);

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(MAP_OPTIONS.center, MAP_OPTIONS.zoom, {
        duration: 1.5,
      });
    }
  };

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
    <div className="h-full w-full relative">
      {showOutOfBoundsAlert && (
        // TODO: Replace with a better alert component
        <div
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded shadow-md flex items-center gap-4"
          role="alert"
        >
          <div>
            <strong className="font-bold">Warning!</strong>
            <span className="ml-2">
              The selected location is outside the allowed area.
            </span>
          </div>
          <button
            type="button"
            className="text-yellow-700 hover:text-yellow-900 font-semibold ml-auto"
            onClick={() => setShowOutOfBoundsAlert(false)}
          >
            Close
          </button>
        </div>
      )}

      {/* Legend */}
      <div className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-lg p-3 border border-slate-200">
        <div className="text-xs font-bold text-slate-700 mb-2">
          Report Status
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-indigo-500 border border-indigo-600"></div>
            <span className="text-xs text-slate-600">Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500 border border-blue-600"></div>
            <span className="text-xs text-slate-600">Assigned</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500 border border-amber-600"></div>
            <span className="text-xs text-slate-600">In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500 border border-green-600"></div>
            <span className="text-xs text-slate-600">Resolved</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-slate-500 border border-slate-600"></div>
            <span className="text-xs text-slate-600">Suspended</span>
          </div>
        </div>
      </div>

      {/* Recenter Button */}
      <button
        onClick={handleRecenter}
        className="absolute bottom-24 right-4 z-[1000] bg-white hover:bg-slate-50 rounded-lg shadow-lg p-3 border border-slate-200 transition-colors"
        title="Recenter map"
        aria-label="Recenter map"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-5 h-5 text-slate-700"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
          />
        </svg>
      </button>

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

        <ClusteredMarkers reports={reports} />
        <MapInstanceProvider
          setMapInstance={(map) => (mapInstanceRef.current = map)}
        />
        {children}
      </MapContainer>
    </div>
  );
};

export default MapView;
