import { useMemo, useRef, useState } from "react";
import { Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import type { Marker as LeafMarker } from "leaflet";
import ReportForm from "src/components/report/ReportFrom";

function CustomMarker({
  draggable = false,
  location = false,
}: {
  draggable?: boolean;
  location?: boolean;
}) {
  const map = useMap();
  const [showMarker, setShowMarker] = useState(false);
  const [position, setPosition] = useState(() =>
    showMarker ? map.getCenter() : null,
  );
  const [showReport, setShowReport] = useState(false);

  const handleLocate = () => {
    map.locate();
  };

  const mapEvents = useMapEvents({
    locationfound(e) {
      setPosition(e.latlng);
      const zoomLevel = 16;
      mapEvents.setView(e.latlng, zoomLevel, { animate: true });
    },
    move() {
      if (!showMarker) return;
      setPosition(mapEvents.getCenter());
    },
    click(e) {
      setShowMarker(true);
      setPosition(e.latlng);
    },
  });

  const markerRef = useRef<LeafMarker>(null);
  const eventHandlers = useMemo(
    () => ({
      dragend() {
        if (!draggable) return;
        const marker = markerRef.current;
        if (marker != null) {
          setPosition(marker.getLatLng());
        }
      },
    }),
    [draggable],
  );

  const handleReportSuccess = () => {
    setShowReport(false);
    setShowMarker(false);
    setPosition(null);
    // Optionally reload reports here
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

      {position && (
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
