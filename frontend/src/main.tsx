import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

import "leaflet/dist/leaflet.css";
import { Icon } from "leaflet";
import markerRetina from "leaflet/dist/images/marker-icon-2x.png";
import marker from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Ensure default Leaflet marker images are set (runs once in browser)
if (typeof window !== "undefined") {
  try {
    // Remove internal getter if present so mergeOptions works reliably across builds
    // (safe-guard for different Leaflet versions / TS defs)
    if ((Icon.Default.prototype as any)._getIconUrl) {
      delete (Icon.Default.prototype as any)._getIconUrl;
    }
  } catch {
    // ignore in non-browser or unusual environments
  }

  Icon.Default.mergeOptions({
    iconRetinaUrl: markerRetina,
    iconUrl: marker,
    shadowUrl: markerShadow,
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
