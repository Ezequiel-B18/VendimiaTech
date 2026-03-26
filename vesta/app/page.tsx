"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Load map only on client (Leaflet doesn't work on SSR)
const MapSelector = dynamic(() => import("@/components/MapSelector"), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] bg-gray-100 rounded-xl animate-pulse flex items-center justify-center">
      <span className="text-gray-400 text-sm">Cargando mapa...</span>
    </div>
  ),
});

const ZONES = [
  { label: "Valle de Uco", bbox: [-69.8, -34.2, -69.0, -33.4] as [number, number, number, number] },
  { label: "Luján de Cuyo", bbox: [-69.2, -33.2, -68.7, -32.8] as [number, number, number, number] },
  { label: "Maipú", bbox: [-68.9, -33.0, -68.4, -32.7] as [number, number, number, number] },
  { label: "San Rafael", bbox: [-68.6, -34.9, -68.2, -34.5] as [number, number, number, number] },
  { label: "Tunuyán", bbox: [-69.2, -33.7, -68.8, -33.4] as [number, number, number, number] },
];

export default function HomePage() {
  const router = useRouter();
  const [selectedBbox, setSelectedBbox] = useState<[number, number, number, number] | null>(null);
  const [loading, setLoading] = useState(false);
  const [zoneSearch, setZoneSearch] = useState("");
  const [filteredZones, setFilteredZones] = useState<typeof ZONES>([]);

  const handleBboxSelected = (bbox: [number, number, number, number]) => {
    setSelectedBbox(bbox);
  };

  const handleAnalyze = () => {
    if (!selectedBbox) return;
    setLoading(true);
    const [lonMin, latMin, lonMax, latMax] = selectedBbox;
    router.push(
      `/dashboard?bbox=${lonMin},${latMin},${lonMax},${latMax}`
    );
  };

  const handleZoneSearch = (value: string) => {
    setZoneSearch(value);
    if (value.length > 0) {
      setFilteredZones(
        ZONES.filter((z) =>
          z.label.toLowerCase().includes(value.toLowerCase())
        )
      );
    } else {
      setFilteredZones([]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-950 to-gray-950 text-white">
      {/* Header */}
      <header className="px-6 py-5 flex items-center gap-3 border-b border-white/10">
        <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-lg">
          🛰️
        </div>
        <span className="font-bold text-xl tracking-tight">VESTA</span>
        <span className="text-green-400 text-sm ml-1">
          Vegetation Satellite Tracker Analytics
        </span>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 leading-tight">
            Conocé el estado de tu viñedo
            <br />
            <span className="text-green-400">desde el satélite</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Análisis satelital Sentinel-2 + IA agronómica + alertas de helada 8hs antes.
            Seleccioná tu parcela en el mapa y analizala en segundos.
          </p>

          {/* Real frost event badge */}
          <div className="inline-flex items-center gap-2 mt-5 bg-red-900/40 border border-red-700/50 text-red-300 px-4 py-2 rounded-full text-sm">
            <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
            El 23 Mar 2026: temperatura 3.1°C sobre Bodega Monteviejo — VESTA lo habría alertado 8hs antes
          </div>
        </div>

        {/* Zone search */}
        <div className="relative mb-4">
          <input
            type="text"
            value={zoneSearch}
            onChange={(e) => handleZoneSearch(e.target.value)}
            placeholder="Buscar zona vitivinícola (Valle de Uco, Luján de Cuyo...)"
            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
          />
          {filteredZones.length > 0 && (
            <div className="absolute top-full mt-1 left-0 right-0 bg-gray-900 border border-white/20 rounded-xl overflow-hidden z-10 shadow-xl">
              {filteredZones.map((zone) => (
                <button
                  key={zone.label}
                  onClick={() => {
                    setZoneSearch(zone.label);
                    setFilteredZones([]);
                    setSelectedBbox(zone.bbox);
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-white/10 text-sm text-gray-300 transition-colors"
                >
                  📍 {zone.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Map */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur">
          <MapSelector
            onBboxSelected={handleBboxSelected}
            initialBbox={selectedBbox}
          />

          {selectedBbox && (
            <div className="mt-4">
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="w-full bg-green-500 hover:bg-green-400 disabled:bg-green-800 text-white font-semibold py-3 px-6 rounded-xl transition-colors text-base shadow-lg shadow-green-900/30"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Iniciando análisis...
                  </span>
                ) : (
                  "Analizar esta parcela →"
                )}
              </button>
            </div>
          )}
        </div>

        {/* How it works */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-10 text-sm">
          {[
            {
              icon: "🛰️",
              title: "Imagen satelital real",
              desc: "Datos Sentinel-2 actualizados de tu parcela exacta",
            },
            {
              icon: "🤖",
              title: "Análisis agronómico IA",
              desc: "Gemini evalúa vigor, madurez y riesgos específicos del Valle de Uco",
            },
            {
              icon: "⚡",
              title: "Alerta 8hs antes",
              desc: "Predecimos heladas y shocks térmicos antes de que ocurran",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="bg-white/5 border border-white/10 rounded-xl p-4"
            >
              <div className="text-2xl mb-2">{item.icon}</div>
              <p className="font-semibold text-white">{item.title}</p>
              <p className="text-gray-400 mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
