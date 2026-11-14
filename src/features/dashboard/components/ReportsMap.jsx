import { useNavigate } from "react-router";

import {
  MapContainer,
  TileLayer,
  Marker,
  LayersControl,
} from "react-leaflet";
import "leaflet/dist/leaflet.css"; // required, or the map renders broken
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

import ReportPopup from "./ReportPopup";

// Vite fix: otherwise the default marker pin image shows up broken
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const DEFAULT_CENTER = [11.61, 124.42];

export default function ReportsMap({ reports }) {
  // skip reports with no usable coordinates
  const withLocation = reports.filter(
    (r) =>
      Array.isArray(r.location) &&
      r.location.length === 2 &&
      !isNaN(Number(r.location[0])) &&
      !isNaN(Number(r.location[1])),
  );

  const navigate = useNavigate();

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={12}
      style={{ minHeight: "100vh", width: "100%" }}
    >
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Street">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
        </LayersControl.BaseLayer>

        <LayersControl.BaseLayer name="Satellite">
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles &copy; Esri"
            maxNativeZoom={17}
            maxZoom={19}
          />
        </LayersControl.BaseLayer>

        {/* No `checked` prop => off by default */}
        <LayersControl.Overlay name="Labels">
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            attribution="Labels &copy; Esri"
            zIndex={10} // keeps labels above whichever base layer is active
            maxZoom={19}
          />
        </LayersControl.Overlay>
      </LayersControl>

      {withLocation.map((r) => (
        <Marker key={r.id} position={[r.location[1], r.location[0]]}>
          <ReportPopup
            report={r}
            onOpen={() => navigate(`/dashboard/reports/${r.id}`)}
          />
        </Marker>
      ))}
    </MapContainer>
  );
}