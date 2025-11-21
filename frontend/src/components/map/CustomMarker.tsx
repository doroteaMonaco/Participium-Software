import { useEffect, useMemo, useRef, useState } from "react";
import { Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import { LatLng, type Marker as LeafMarker } from "leaflet";
import * as turf from "@turf/turf";

import ReportForm from "src/components/report/ReportForm";

type Props = {
  geoJsonData: GeoJSON.GeoJsonObject;
  draggable?: boolean;
  location?: boolean;
  onOutOfBounds?: () => void;
};

function CustomMarker({
  geoJsonData,
  draggable = false,
  location = false,
  onOutOfBounds,
}: Props) {
  const map = useMap();
  const [showMarker, setShowMarker] = useState(false);
  const [position, setPosition] = useState<LatLng | null>(null);
  const [showReport, setShowReport] = useState(false);

  // Keep previous valid position to revert if drag moves outside
  const prevPositionRef = useRef<LatLng | null>(null);
  // avoid calling onOutOfBounds repeatedly
  const outOfBoundsCalledRef = useRef(false);

  const isPointInsideBoundary = (pos: LatLng): boolean => {
    const point = turf.point([pos.lng, pos.lat]);

    if ((geoJsonData as any).type === "FeatureCollection") {
      return (geoJsonData as GeoJSON.FeatureCollection).features.some(
        (feature) => {
          try {
            return turf.booleanPointInPolygon(point, feature as any);
          } catch (error) {
            console.error("Error checking feature:", error);
            return false;
          }
        },
      );
    }

    try {
      return turf.booleanPointInPolygon(point, geoJsonData as any);
    } catch (error) {
      console.error("Error checking point in polygon:", error);
      return false;
    }
  };

  // returns true when the position is OUTSIDE the boundary
  const boundaryExceeded = (pos: LatLng) => {
    const inside = isPointInsideBoundary(pos);
    if (!inside) {
      // call onOutOfBounds at most once until a valid position is encountered
      if (onOutOfBounds && !outOfBoundsCalledRef.current) {
        onOutOfBounds();
        outOfBoundsCalledRef.current = true;
      }
      return true;
    }
    outOfBoundsCalledRef.current = false;
    return false;
  };

  // When position changes, update prevPositionRef (only when inside)
  useEffect(() => {
    if (!position) return;

    if (boundaryExceeded(position)) {
      // outside: revert to previous valid pos or hide marker
      if (prevPositionRef.current) {
        setPosition(prevPositionRef.current);
      } else {
        setShowMarker(false);
        setPosition(null);
      }
    } else {
      // inside: update previous valid position
      prevPositionRef.current = position;
    }
  }, [position]);

  const handleLocate = () => map.locate();

  const mapEvents = useMapEvents({
    locationfound(e) {
      const pos = e.latlng;
      if (!pos) return;
      if (boundaryExceeded(pos)) return;
      setShowMarker(true);
      setPosition(pos);
      const zoomLevel = 16;
      mapEvents.setView(e.latlng, zoomLevel, { animate: true });
    },
    move() {
      if (!showMarker) return;
      const pos = mapEvents.getCenter();
      setPosition(pos);
    },
    click(e) {
      const pos = e.latlng;
      setPosition(pos);
      setShowMarker(true);
    },
  });

  const markerRef = useRef<LeafMarker | null>(null);
  const eventHandlers = useMemo(
    () => ({
      dragend() {
        if (!draggable) return;
        const marker = markerRef.current;
        if (!marker) return;

        const pos = marker.getLatLng();
        if (boundaryExceeded(pos)) {
          if (prevPositionRef.current) {
            // revert to previous valid position
            marker.setLatLng(prevPositionRef.current);
            setPosition(prevPositionRef.current);
          } else {
            // no previous valid position: hide marker
            setShowMarker(false);
            setPosition(null);
          }
          return;
        }
        setPosition(pos);
      },
    }),
    [draggable],
  );

  const handleReportSuccess = (createdReport?: any) => {
    setShowReport(false);
    setShowMarker(false);
    setPosition(null);
    try {
      const ev = new CustomEvent("reports:changed", { detail: createdReport });
      window.dispatchEvent(ev);
    } catch {}
  };

  return (
    <>
      {location && (
        <div className="leaflet-top leaflet-right m-4">
          <div className="z-40 pointer-events-auto">
            <button
              type="button"
              onClick={handleLocate}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow hover:bg-slate-50 transition"
            >
              Locate me
            </button>
          </div>
        </div>
      )}

      {position && showMarker && (
        <Marker
          draggable={draggable}
          eventHandlers={draggable ? eventHandlers : undefined}
          position={position}
          ref={markerRef}
        >
          <Popup>
            <div className="space-y-2 py-1">
              <p className="text-sm text-slate-600 font-medium">
                Create a report at this location?
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowReport(true);
                }}
                className="w-full rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-semibold hover:bg-indigo-700 transition"
              >
                Create Report
              </button>
            </div>
          </Popup>
        </Marker>
      )}

      {showReport && position && (
        <ReportForm
          lat={position.lat}
          lng={position.lng}
          onClose={() => setShowReport(false)}
          onSuccess={handleReportSuccess}
        />
      )}
    </>
  );
}

export default CustomMarker;
