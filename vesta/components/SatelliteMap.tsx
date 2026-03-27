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

export default function SatelliteMap({ imageBase64, bbox }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<unknown>(null);
  const [opacity, setOpacity] = useState(80);

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

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 18,
        opacity: 0.6,
      }).addTo(map);

      // Support both raw base64 and full data URLs
      const imageUrl = imageBase64.startsWith("data:")
        ? imageBase64
        : `data:image/png;base64,${imageBase64}`;
      const imageBounds: L.LatLngBoundsExpression = [
        [latMin, lonMin],
        [latMax, lonMax],
      ];

      L.imageOverlay(imageUrl, imageBounds, { opacity: opacity / 100 }).addTo(map);

      map.fitBounds(imageBounds);
      leafletMapRef.current = map;
    });

    return () => {
      cancelled = true;
      if (leafletMapRef.current) {
        (leafletMapRef.current as { remove: () => void }).remove();
        leafletMapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageBase64]);

  // Update overlay opacity when slider changes
  useEffect(() => {
    if (!leafletMapRef.current) return;
    import("leaflet").then((L) => {
      const map = leafletMapRef.current as L.Map;
      map.eachLayer((layer) => {
        if (layer instanceof L.ImageOverlay) {
          layer.setOpacity(opacity / 100);
        }
      });
    });
  }, [opacity]);

  return (
    <div className="flex flex-col gap-2">
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      <div
        ref={mapRef}
        style={{ height: "380px", width: "100%", borderRadius: 12, overflow: "hidden" }}
        className="border border-gray-200 shadow-sm"
      />

      {/* Opacity slider */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 shrink-0">Opacidad imagen</span>
        <input
          type="range"
          min={60}
          max={100}
          value={opacity}
          onChange={(e) => setOpacity(Number(e.target.value))}
          className="flex-1 accent-green-500"
        />
        <span className="text-xs text-gray-500 w-8">{opacity}%</span>
      </div>

      {/* Legend */}
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
    </div>
  );
}
