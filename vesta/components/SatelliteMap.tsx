"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  imageBase64: string;
  bbox: [number, number, number, number]; // [lonMin, latMin, lonMax, latMax]
}

const LEGEND = [
  { color: "#0D6E19", label: "Vegetación sana" },
  { color: "#CCBF19", label: "Atención / vigor bajo" },
  { color: "#BF2626", label: "Sin vegetación" },
  { color: "#3366D9", label: "Humedad alta" },
];

type ViewMode = "analysis" | "map";

export default function SatelliteMap({ imageBase64, bbox }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<unknown>(null);
  const overlayRef = useRef<unknown>(null);
  const [opacity, setOpacity] = useState(80);
  const [viewMode, setViewMode] = useState<ViewMode>("analysis");

  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;

    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !mapRef.current || leafletMapRef.current) return;

      const [lonMin, latMin, lonMax, latMax] = bbox;
      const center: [number, number] = [
        (latMin + latMax) / 2,
        (lonMin + lonMax) / 2,
      ];

      const map = L.map(mapRef.current!, { center, zoom: 13 });

      // Base OSM tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 18,
        opacity: 0.6,
      }).addTo(map);

      // Sentinel-2 overlay
      const imageUrl = imageBase64.startsWith("data:")
        ? imageBase64
        : `data:image/png;base64,${imageBase64}`;
      const imageBounds: L.LatLngBoundsExpression = [
        [latMin, lonMin],
        [latMax, lonMax],
      ];

      const overlay = L.imageOverlay(imageUrl, imageBounds, {
        opacity: opacity / 100,
      }).addTo(map);

      map.fitBounds(imageBounds);
      leafletMapRef.current = map;
      overlayRef.current = overlay;
    });

    return () => {
      cancelled = true;
      if (leafletMapRef.current) {
        (leafletMapRef.current as { remove: () => void }).remove();
        leafletMapRef.current = null;
        overlayRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageBase64]);

  // Update overlay opacity when slider changes
  useEffect(() => {
    if (!overlayRef.current) return;
    import("leaflet").then(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const overlay = overlayRef.current as any;
      if (overlay) {
        overlay.setOpacity(opacity / 100);
      }
    });
  }, [opacity]);

  // Toggle overlay visibility based on view mode
  useEffect(() => {
    if (!leafletMapRef.current || !overlayRef.current) return;
    import("leaflet").then((L) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map = leafletMapRef.current as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const overlay = overlayRef.current as any;

      if (viewMode === "analysis") {
        if (!map.hasLayer(overlay)) {
          overlay.addTo(map);
          overlay.setOpacity(opacity / 100);
        }
        // Dim base tiles
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.eachLayer((layer: any) => {
          if (layer instanceof L.TileLayer) {
            layer.setOpacity(0.6);
          }
        });
      } else {
        // "map" mode — hide overlay, full opacity base tiles
        if (map.hasLayer(overlay)) {
          map.removeLayer(overlay);
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.eachLayer((layer: any) => {
          if (layer instanceof L.TileLayer) {
            layer.setOpacity(1);
          }
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  return (
    <div className="flex flex-col gap-2">
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />

      {/* View mode toggle */}
      <div className="flex rounded-lg overflow-hidden border border-gray-200 self-start">
        <button
          onClick={() => setViewMode("analysis")}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            viewMode === "analysis"
              ? "bg-green-500 text-white"
              : "bg-white text-gray-500 hover:bg-gray-50"
          }`}
        >
          🛰️ Análisis
        </button>
        <button
          onClick={() => setViewMode("map")}
          className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-gray-200 ${
            viewMode === "map"
              ? "bg-blue-500 text-white"
              : "bg-white text-gray-500 hover:bg-gray-50"
          }`}
        >
          🗺️ Mapa
        </button>
      </div>

      <div
        ref={mapRef}
        style={{ height: "380px", width: "100%", borderRadius: 12, overflow: "hidden" }}
        className="border border-gray-200 shadow-sm"
      />

      {/* Opacity slider — only show in analysis mode */}
      {viewMode === "analysis" && (
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 shrink-0">Opacidad imagen</span>
          <input
            type="range"
            min={0}
            max={100}
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            className="flex-1 accent-green-500"
          />
          <span className="text-xs text-gray-500 w-8">{opacity}%</span>
        </div>
      )}

      {/* Legend — only show in analysis mode */}
      {viewMode === "analysis" && (
        <div className="flex flex-wrap gap-3 mt-1">
          {LEGEND.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-sm shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-gray-500">{item.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Map mode helper text */}
      {viewMode === "map" && (
        <p className="text-xs text-gray-400 italic">
          Vista de mapa para orientación geográfica. Cambiá a &quot;Análisis&quot; para ver los datos satelitales.
        </p>
      )}
    </div>
  );
}
