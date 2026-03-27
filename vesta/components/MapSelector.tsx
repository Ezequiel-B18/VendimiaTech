"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  onBboxSelected: (bbox: [number, number, number, number]) => void;
  initialBbox?: [number, number, number, number] | null;
}

const MENDOZA_BOUNDS = {
  latMin: -35.5, latMax: -31.5,
  lonMin: -70.5, lonMax: -66.5,
};
const MENDOZA_CENTER: [number, number] = [-33.9, -69.0];

function bboxAreaHectares(bbox: [number, number, number, number]): number {
  const [lonMin, latMin, lonMax, latMax] = bbox;
  const latM = Math.abs(latMax - latMin) * 111320;
  const lonM = Math.abs(lonMax - lonMin) * 111320 * Math.cos(((latMin + latMax) / 2) * (Math.PI / 180));
  return (latM * lonM) / 10000;
}

function pointsToBbox(points: { lat: number; lng: number }[]): [number, number, number, number] {
  const lats = points.map((p) => p.lat);
  const lons = points.map((p) => p.lng);
  return [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)];
}

export default function MapSelector({ onBboxSelected, initialBbox }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<unknown>(null);
  const existingShapeRef = useRef<unknown>(null);

  // Polygon drawing refs (accessible inside leaflet closure)
  const polyPointsRef = useRef<{ lat: number; lng: number }[]>([]);
  const polyMarkersRef = useRef<unknown[]>([]);
  const polyLineRef = useRef<unknown>(null);
  const polyShapeRef = useRef<unknown>(null);
  const closePolyFnRef = useRef<(() => void) | null>(null);

  const [drawing, setDrawing] = useState(false);
  const [polyCount, setPolyCount] = useState(0);
  const [bbox, setBbox] = useState<[number, number, number, number] | null>(initialBbox ?? null);
  const [areaHa, setAreaHa] = useState<number | null>(null);
  const [coordsMode, setCoordsMode] = useState(false);
  const [manualCoords, setManualCoords] = useState({ latMin: "", latMax: "", lonMin: "", lonMax: "" });
  const [coordsError, setCoordsError] = useState("");

  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;
    const container = mapRef.current as HTMLDivElement & { _leaflet_id?: number };
    if (container._leaflet_id) return;
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !mapRef.current || leafletMapRef.current) return;
      const c = mapRef.current as HTMLDivElement & { _leaflet_id?: number };
      if (c._leaflet_id) { c._leaflet_id = undefined; }

      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(c, { center: MENDOZA_CENTER, zoom: 10, doubleClickZoom: false });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors", maxZoom: 18,
      }).addTo(map);
      leafletMapRef.current = map;

      // ── Geolocation ────────────────────────────────────────────
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude: lat, longitude: lng } = pos.coords;
            const inMendoza =
              lat >= MENDOZA_BOUNDS.latMin && lat <= MENDOZA_BOUNDS.latMax &&
              lng >= MENDOZA_BOUNDS.lonMin && lng <= MENDOZA_BOUNDS.lonMax;
            map.setView([inMendoza ? lat : MENDOZA_CENTER[0], inMendoza ? lng : MENDOZA_CENTER[1]], inMendoza ? 13 : 10);
          },
          () => { /* keep Mendoza default */ },
          { timeout: 5000 }
        );
      }

      // ── Draw initial bbox if provided ──────────────────────────
      if (initialBbox) {
        const [lonMin, latMin, lonMax, latMax] = initialBbox;
        const shape = L.polygon([[latMin, lonMin], [latMin, lonMax], [latMax, lonMax], [latMax, lonMin]],
          { color: "#22c55e", weight: 2, fillOpacity: 0.2 }).addTo(map);
        existingShapeRef.current = shape;
        map.fitBounds([[latMin, lonMin], [latMax, lonMax]]);
        setAreaHa(Math.round(bboxAreaHectares(initialBbox)));
      }

      // ── Helper: clear in-progress polygon drawing ──────────────
      const clearDrawing = () => {
        polyMarkersRef.current.forEach((m) => map.removeLayer(m as L.Marker));
        polyMarkersRef.current = [];
        if (polyLineRef.current) { map.removeLayer(polyLineRef.current as L.Polyline); polyLineRef.current = null; }
        if (polyShapeRef.current) { map.removeLayer(polyShapeRef.current as L.Polygon); polyShapeRef.current = null; }
        polyPointsRef.current = [];
      };

      // ── Close polygon, extract bbox ────────────────────────────
      const closePoly = () => {
        const pts = polyPointsRef.current;
        if (pts.length < 3) return;

        clearDrawing();
        if (existingShapeRef.current) map.removeLayer(existingShapeRef.current as L.Polygon);

        const latlngs = pts.map((p) => [p.lat, p.lng] as [number, number]);
        const shape = L.polygon(latlngs, { color: "#22c55e", weight: 2, fillOpacity: 0.2 }).addTo(map);
        existingShapeRef.current = shape;

        const newBbox = pointsToBbox(pts);
        const ha = bboxAreaHectares(newBbox);
        setBbox(newBbox);
        setAreaHa(Math.round(ha));
        setDrawing(false);
        setPolyCount(0);
        (map as unknown as Record<string, unknown>)._drawMode = false;
      };

      closePolyFnRef.current = closePoly;

      // ── Map click: add polygon vertex ──────────────────────────
      map.on("click", (e: L.LeafletMouseEvent) => {
        if (!(map as unknown as Record<string, unknown>)._drawMode) return;

        const pts = polyPointsRef.current;

        // If clicking near the first point and have ≥3 → close
        if (pts.length >= 3) {
          const first = pts[0];
          const firstPx = map.latLngToContainerPoint([first.lat, first.lng]);
          const clickPx = map.latLngToContainerPoint(e.latlng);
          const dist = Math.hypot(firstPx.x - clickPx.x, firstPx.y - clickPx.y);
          if (dist < 18) { closePoly(); return; }
        }

        pts.push({ lat: e.latlng.lat, lng: e.latlng.lng });

        // Small dot marker
        const dotIcon = L.divIcon({
          className: "",
          html: pts.length === 1
            ? `<div style="width:14px;height:14px;border-radius:50%;background:#22c55e;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4);cursor:pointer"></div>`
            : `<div style="width:10px;height:10px;border-radius:50%;background:#22c55e;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.3)"></div>`,
          iconSize: pts.length === 1 ? [14, 14] : [10, 10],
          iconAnchor: pts.length === 1 ? [7, 7] : [5, 5],
        });
        const marker = L.marker([e.latlng.lat, e.latlng.lng], { icon: dotIcon, interactive: false }).addTo(map);
        polyMarkersRef.current.push(marker);

        // Update polyline
        if (polyLineRef.current) map.removeLayer(polyLineRef.current as L.Polyline);
        const latlngs = pts.map((p) => [p.lat, p.lng] as [number, number]);
        polyLineRef.current = L.polyline(latlngs, { color: "#22c55e", weight: 2, dashArray: "6,4" }).addTo(map);

        // Preview polygon when ≥3
        if (pts.length >= 3) {
          if (polyShapeRef.current) map.removeLayer(polyShapeRef.current as L.Polygon);
          polyShapeRef.current = L.polygon(latlngs, { color: "#22c55e", weight: 0, fillOpacity: 0.15 }).addTo(map);
        }

        setPolyCount(pts.length);
      });

      // ── Double click: close polygon ────────────────────────────
      map.on("dblclick", () => {
        if (!(map as unknown as Record<string, unknown>)._drawMode) return;
        closePoly();
      });
    });

    return () => {
      cancelled = true;
      if (leafletMapRef.current) {
        (leafletMapRef.current as { remove: () => void }).remove();
        leafletMapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startDrawing = () => {
    if (!leafletMapRef.current) return;
    // Clear previous
    polyMarkersRef.current.forEach((m) => (leafletMapRef.current as L.Map).removeLayer(m as L.Marker));
    polyMarkersRef.current = [];
    if (polyLineRef.current) { (leafletMapRef.current as L.Map).removeLayer(polyLineRef.current as L.Polyline); polyLineRef.current = null; }
    if (polyShapeRef.current) { (leafletMapRef.current as L.Map).removeLayer(polyShapeRef.current as L.Polygon); polyShapeRef.current = null; }
    polyPointsRef.current = [];
    setPolyCount(0);
    (leafletMapRef.current as unknown as Record<string, unknown>)._drawMode = true;
    setDrawing(true);
  };

  const cancelDrawing = () => {
    polyMarkersRef.current.forEach((m) => (leafletMapRef.current as L.Map).removeLayer(m as L.Marker));
    polyMarkersRef.current = [];
    if (polyLineRef.current) { (leafletMapRef.current as L.Map).removeLayer(polyLineRef.current as L.Polyline); polyLineRef.current = null; }
    if (polyShapeRef.current) { (leafletMapRef.current as L.Map).removeLayer(polyShapeRef.current as L.Polygon); polyShapeRef.current = null; }
    polyPointsRef.current = [];
    setPolyCount(0);
    (leafletMapRef.current as unknown as Record<string, unknown>)._drawMode = false;
    setDrawing(false);
  };

  const loadDemo = () => {
    const demoBbox: [number, number, number, number] = [-69.26, -33.69, -69.21, -33.64];
    setBbox(demoBbox);
    setAreaHa(Math.round(bboxAreaHectares(demoBbox)));

    import("leaflet").then((L) => {
      const map = leafletMapRef.current as L.Map;
      if (!map) return;
      if (existingShapeRef.current) map.removeLayer(existingShapeRef.current as L.Polygon);
      const [lonMin, latMin, lonMax, latMax] = demoBbox;
      const shape = L.polygon([[latMin, lonMin], [latMin, lonMax], [latMax, lonMax], [latMax, lonMin]],
        { color: "#22c55e", weight: 2, fillOpacity: 0.2 }).addTo(map);
      existingShapeRef.current = shape;
      map.fitBounds([[latMin, lonMin], [latMax, lonMax]]);
    });
  };

  const handleManualCoords = () => {
    setCoordsError("");
    const latMin = parseFloat(manualCoords.latMin);
    const latMax = parseFloat(manualCoords.latMax);
    const lonMin = parseFloat(manualCoords.lonMin);
    const lonMax = parseFloat(manualCoords.lonMax);

    if ([latMin, latMax, lonMin, lonMax].some(isNaN)) { setCoordsError("Todos los campos son requeridos"); return; }
    if (latMin < MENDOZA_BOUNDS.latMin || latMax > MENDOZA_BOUNDS.latMax ||
        lonMin < MENDOZA_BOUNDS.lonMin || lonMax > MENDOZA_BOUNDS.lonMax) {
      setCoordsError("Las coordenadas deben estar dentro de Mendoza"); return;
    }
    if (latMin >= latMax || lonMin >= lonMax) { setCoordsError("Los valores min deben ser menores a los max"); return; }

    const newBbox: [number, number, number, number] = [lonMin, latMin, lonMax, latMax];
    const ha = bboxAreaHectares(newBbox);
    if (ha < 1) { setCoordsError("El área mínima es 1 hectárea"); return; }
    if (ha > 5000) { setCoordsError("Seleccioná una zona más pequeña (máx. 5.000 ha)"); return; }

    setBbox(newBbox);
    setAreaHa(Math.round(ha));
    setCoordsMode(false);

    import("leaflet").then((L) => {
      const map = leafletMapRef.current as L.Map;
      if (!map) return;
      if (existingShapeRef.current) map.removeLayer(existingShapeRef.current as L.Polygon);
      const shape = L.polygon([[latMin, lonMin], [latMin, lonMax], [latMax, lonMax], [latMax, lonMin]],
        { color: "#22c55e", weight: 2, fillOpacity: 0.2 }).addTo(map);
      existingShapeRef.current = shape;
      map.fitBounds([[latMin, lonMin], [latMax, lonMax]]);
    });
  };

  const handleConfirm = () => {
    if (!bbox) return;
    const ha = areaHa ?? bboxAreaHectares(bbox);
    if (ha < 1) { alert("El área mínima es 1 hectárea. Dibujá una zona más grande."); return; }
    if (ha > 5000) { alert("Seleccioná una zona más pequeña para el análisis (máx. 5.000 ha)."); return; }
    onBboxSelected(bbox);
  };

  return (
    <div className="flex flex-col gap-3">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

      {/* Map */}
      <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-sm">
        <div ref={mapRef} style={{ height: "420px", width: "100%", background: "#e8f4e8" }} />

        {drawing && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
            <div className="bg-gray-900/90 backdrop-blur text-white text-xs font-medium px-3 py-1.5 rounded-full shadow flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              {polyCount === 0 && "Hacé click para agregar el primer punto"}
              {polyCount === 1 && "Seguí haciendo click para agregar puntos"}
              {polyCount === 2 && "Un punto más para ver la parcela"}
              {polyCount >= 3 && `${polyCount} puntos · Doble click o tocá el primer punto para cerrar`}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-2 items-center">
        {!drawing ? (
          <button
            onClick={startDrawing}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-green-500 hover:bg-green-600 text-white transition-colors flex items-center gap-2"
          >
            <span>✏️</span> Dibujar parcela
          </button>
        ) : (
          <>
            {polyCount >= 3 && (
              <button
                onClick={() => closePolyFnRef.current?.()}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-700 text-white transition-colors"
              >
                ✓ Cerrar parcela
              </button>
            )}
            <button
              onClick={cancelDrawing}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
            >
              Cancelar
            </button>
          </>
        )}
        <button
          onClick={() => setCoordsMode(!coordsMode)}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
        >
          Coordenadas
        </button>
        <button
          onClick={loadDemo}
          className="px-3 py-2 rounded-lg text-xs font-medium bg-gray-50 hover:bg-gray-100 text-gray-500 border border-gray-200 transition-colors"
        >
          Ejemplo: Monteviejo
        </button>
      </div>

      {/* Manual coords */}
      {coordsMode && (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-3">
            Coordenadas manuales <span className="text-gray-400 font-normal">(lat -35.5 a -31.5 · lon -70.5 a -66.5)</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            {([["latMin", "Lat mínima (sur)"], ["latMax", "Lat máxima (norte)"], ["lonMin", "Lon mínima (oeste)"], ["lonMax", "Lon máxima (este)"]] as const).map(([key, label]) => (
              <div key={key}>
                <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                <input
                  type="number" step="0.0001"
                  value={manualCoords[key]}
                  onChange={(e) => setManualCoords((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  placeholder="-33.00"
                />
              </div>
            ))}
          </div>
          {coordsError && <p className="text-xs text-red-500 mt-2">{coordsError}</p>}
          <button
            onClick={handleManualCoords}
            className="mt-3 w-full bg-green-500 hover:bg-green-600 text-white rounded-lg py-2 text-sm font-medium transition-colors"
          >
            Aplicar coordenadas
          </button>
        </div>
      )}

      {/* Parcel preview + confirm */}
      {bbox && !drawing && (
        <div className="bg-green-50 rounded-xl p-4 border border-green-200 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-green-800 flex items-center gap-1.5">
              <span>✓</span> Parcela lista
            </p>
            <p className="text-xs text-green-600 mt-0.5">
              {areaHa !== null ? `≈ ${areaHa.toLocaleString()} ha` : ""}
              {" · "}{bbox[1].toFixed(4)}°S, {Math.abs(bbox[0]).toFixed(4)}°O
            </p>
          </div>
          <button
            onClick={handleConfirm}
            className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm whitespace-nowrap"
          >
            Usar esta parcela →
          </button>
        </div>
      )}
    </div>
  );
}
