"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  onBboxSelected: (bbox: [number, number, number, number]) => void;
  initialBbox?: [number, number, number, number] | null;
}

// Mendoza bounding box for validation
const MENDOZA_BOUNDS = {
  latMin: -35.5,
  latMax: -31.5,
  lonMin: -70.5,
  lonMax: -66.5,
};

function bboxAreaHectares(bbox: [number, number, number, number]): number {
  const [lonMin, latMin, lonMax, latMax] = bbox;
  const latDeg = Math.abs(latMax - latMin);
  const lonDeg = Math.abs(lonMax - lonMin);
  const latM = latDeg * 111320;
  const lonM = lonDeg * 111320 * Math.cos(((latMin + latMax) / 2) * (Math.PI / 180));
  return (latM * lonM) / 10000;
}

export default function MapSelector({ onBboxSelected, initialBbox }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<unknown>(null);
  const rectangleRef = useRef<unknown>(null);
  const [drawing, setDrawing] = useState(false);
  const [bbox, setBbox] = useState<[number, number, number, number] | null>(
    initialBbox ?? null
  );
  const [areaHa, setAreaHa] = useState<number | null>(null);
  const [coordsMode, setCoordsMode] = useState(false);
  const [manualCoords, setManualCoords] = useState({
    latMin: "",
    latMax: "",
    lonMin: "",
    lonMax: "",
  });
  const [coordsError, setCoordsError] = useState("");

  useEffect(() => {
    if (!mapRef.current) return;
    // Prevent double-init in React Strict Mode
    if (leafletMapRef.current) return;
    if ((mapRef.current as unknown as Record<string, unknown>)._leaflet_id) return;

    // Dynamic import to avoid SSR issues
    import("leaflet").then((L) => {
      // Fix default marker icons
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, {
        center: [-33.9, -69.0],
        zoom: 10,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 18,
      }).addTo(map);

      leafletMapRef.current = map;

      // If initial bbox, draw it
      if (initialBbox) {
        const [lonMin, latMin, lonMax, latMax] = initialBbox;
        const rect = L.rectangle(
          [
            [latMin, lonMin],
            [latMax, lonMax],
          ],
          { color: "#22c55e", weight: 2, fillOpacity: 0.2 }
        ).addTo(map);
        rectangleRef.current = rect;
        map.fitBounds([
          [latMin, lonMin],
          [latMax, lonMax],
        ]);
        const ha = bboxAreaHectares(initialBbox);
        setAreaHa(Math.round(ha));
      }

      // Mouse draw handlers
      let isDrawing = false;
      let startLatLng: L.LatLng | null = null;
      let tempRect: L.Rectangle | null = null;

      map.on("mousedown", (e: L.LeafletMouseEvent) => {
        if (!(e.originalEvent.target as HTMLElement).closest(".leaflet-container")) return;
        const drawMode = (map as unknown as Record<string, unknown>)._drawMode;
        if (!drawMode) return;

        isDrawing = true;
        startLatLng = e.latlng;
        map.dragging.disable();
      });

      map.on("mousemove", (e: L.LeafletMouseEvent) => {
        if (!isDrawing || !startLatLng) return;
        if (tempRect) map.removeLayer(tempRect);
        tempRect = L.rectangle([[startLatLng.lat, startLatLng.lng], [e.latlng.lat, e.latlng.lng]], {
          color: "#22c55e",
          weight: 2,
          fillOpacity: 0.15,
          dashArray: "5,5",
        }).addTo(map);
      });

      map.on("mouseup", (e: L.LeafletMouseEvent) => {
        if (!isDrawing || !startLatLng) return;
        isDrawing = false;
        map.dragging.enable();
        (map as unknown as Record<string, unknown>)._drawMode = false;

        if (tempRect) {
          map.removeLayer(tempRect);
          tempRect = null;
        }

        const lat1 = startLatLng.lat;
        const lon1 = startLatLng.lng;
        const lat2 = e.latlng.lat;
        const lon2 = e.latlng.lng;

        const newBbox: [number, number, number, number] = [
          Math.min(lon1, lon2),
          Math.min(lat1, lat2),
          Math.max(lon1, lon2),
          Math.max(lat1, lat2),
        ];

        if (rectangleRef.current) {
          map.removeLayer(rectangleRef.current as L.Rectangle);
        }

        const rect = L.rectangle(
          [
            [newBbox[1], newBbox[0]],
            [newBbox[3], newBbox[2]],
          ],
          { color: "#22c55e", weight: 2, fillOpacity: 0.2 }
        ).addTo(map);
        rectangleRef.current = rect;

        const ha = bboxAreaHectares(newBbox);
        setAreaHa(Math.round(ha));
        setBbox(newBbox);
        setDrawing(false);
        startLatLng = null;
      });
    });

    return () => {
      if (leafletMapRef.current) {
        (leafletMapRef.current as { remove: () => void }).remove();
        leafletMapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startDrawing = () => {
    if (!leafletMapRef.current) return;
    const map = leafletMapRef.current as Record<string, unknown>;
    map._drawMode = true;
    setDrawing(true);
  };

  const loadDemo = () => {
    const demoBbox: [number, number, number, number] = [-69.26, -33.69, -69.21, -33.64];
    setBbox(demoBbox);
    const ha = bboxAreaHectares(demoBbox);
    setAreaHa(Math.round(ha));

    import("leaflet").then((L) => {
      const map = leafletMapRef.current as L.Map;
      if (!map) return;

      if (rectangleRef.current) map.removeLayer(rectangleRef.current as L.Rectangle);

      const rect = L.rectangle(
        [
          [demoBbox[1], demoBbox[0]],
          [demoBbox[3], demoBbox[2]],
        ],
        { color: "#22c55e", weight: 2, fillOpacity: 0.2 }
      ).addTo(map);
      rectangleRef.current = rect;
      map.fitBounds([
        [demoBbox[1], demoBbox[0]],
        [demoBbox[3], demoBbox[2]],
      ]);
    });
  };

  const handleManualCoords = () => {
    setCoordsError("");
    const latMin = parseFloat(manualCoords.latMin);
    const latMax = parseFloat(manualCoords.latMax);
    const lonMin = parseFloat(manualCoords.lonMin);
    const lonMax = parseFloat(manualCoords.lonMax);

    if ([latMin, latMax, lonMin, lonMax].some(isNaN)) {
      setCoordsError("Todos los campos son requeridos");
      return;
    }
    if (
      latMin < MENDOZA_BOUNDS.latMin ||
      latMax > MENDOZA_BOUNDS.latMax ||
      lonMin < MENDOZA_BOUNDS.lonMin ||
      lonMax > MENDOZA_BOUNDS.lonMax
    ) {
      setCoordsError("Las coordenadas deben estar dentro de Mendoza");
      return;
    }
    if (latMin >= latMax || lonMin >= lonMax) {
      setCoordsError("Los valores min deben ser menores a los max");
      return;
    }

    const newBbox: [number, number, number, number] = [lonMin, latMin, lonMax, latMax];
    const ha = bboxAreaHectares(newBbox);

    if (ha < 1) {
      setCoordsError("El área mínima es 1 hectárea");
      return;
    }
    if (ha > 5000) {
      setCoordsError("Seleccioná una zona más pequeña (máx. 5.000 ha)");
      return;
    }

    setBbox(newBbox);
    setAreaHa(Math.round(ha));
    setCoordsMode(false);

    import("leaflet").then((L) => {
      const map = leafletMapRef.current as L.Map;
      if (!map) return;
      if (rectangleRef.current) map.removeLayer(rectangleRef.current as L.Rectangle);
      const rect = L.rectangle(
        [
          [latMin, lonMin],
          [latMax, lonMax],
        ],
        { color: "#22c55e", weight: 2, fillOpacity: 0.2 }
      ).addTo(map);
      rectangleRef.current = rect;
      map.fitBounds([
        [latMin, lonMin],
        [latMax, lonMax],
      ]);
    });
  };

  const handleConfirm = () => {
    if (!bbox) return;
    const ha = areaHa ?? bboxAreaHectares(bbox);
    if (ha < 1) {
      alert("El área mínima es 1 hectárea. Dibujá una zona más grande.");
      return;
    }
    if (ha > 5000) {
      alert("Seleccioná una zona más pequeña para el análisis (máx. 5.000 ha).");
      return;
    }
    onBboxSelected(bbox);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Map container */}
      <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-sm">
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        />
        <div
          ref={mapRef}
          style={{ height: "420px", width: "100%", background: "#e8f4e8" }}
        />
        {drawing && (
          <div className="absolute inset-0 bg-green-500/5 pointer-events-none flex items-center justify-center">
            <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-lg shadow text-sm text-green-700 font-medium">
              Hacé click y arrastrá para marcar tu parcela
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-2 items-center">
        <button
          onClick={startDrawing}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            drawing
              ? "bg-green-600 text-white"
              : "bg-green-500 hover:bg-green-600 text-white"
          }`}
        >
          {drawing ? "Dibujando..." : "Dibujar parcela"}
        </button>
        <button
          onClick={() => setCoordsMode(!coordsMode)}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
        >
          Ingresar coordenadas
        </button>
        <button
          onClick={loadDemo}
          className="px-3 py-2 rounded-lg text-xs font-medium bg-gray-50 hover:bg-gray-100 text-gray-500 border border-gray-200 transition-colors"
        >
          Ejemplo: Monteviejo
        </button>
      </div>

      {/* Manual coords panel */}
      {coordsMode && (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-3">
            Coordenadas manuales (Mendoza: lat -35.5 a -31.5, lon -70.5 a -66.5)
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["latMin", "Lat mínima (sur)"],
                ["latMax", "Lat máxima (norte)"],
                ["lonMin", "Lon mínima (oeste)"],
                ["lonMax", "Lon máxima (este)"],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                <input
                  type="number"
                  step="0.0001"
                  value={manualCoords[key]}
                  onChange={(e) =>
                    setManualCoords((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  placeholder="-33.00"
                />
              </div>
            ))}
          </div>
          {coordsError && (
            <p className="text-xs text-red-500 mt-2">{coordsError}</p>
          )}
          <button
            onClick={handleManualCoords}
            className="mt-3 w-full bg-green-500 hover:bg-green-600 text-white rounded-lg py-2 text-sm font-medium transition-colors"
          >
            Aplicar coordenadas
          </button>
        </div>
      )}

      {/* Preview & confirm */}
      {bbox && (
        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-green-800">
                Parcela seleccionada
              </p>
              <p className="text-xs text-green-600 mt-0.5">
                {areaHa !== null ? `≈ ${areaHa.toLocaleString()} hectáreas` : ""}
                {" · "}
                {bbox[1].toFixed(4)}°, {bbox[0].toFixed(4)} →{" "}
                {bbox[3].toFixed(4)}°, {bbox[2].toFixed(4)}
              </p>
            </div>
            <button
              onClick={handleConfirm}
              className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
            >
              Analizar esta parcela →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
