"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { addParcel } from "@/services/firebaseDb";
import { auth } from "@/lib/firebase";

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

export default function MapaPage() {
  const router = useRouter();
  const [selectedBbox, setSelectedBbox] = useState<[number, number, number, number] | null>(null);
  const [loading, setLoading] = useState(false);
  const [zoneSearch, setZoneSearch] = useState("");
  const [filteredZones, setFilteredZones] = useState<typeof ZONES>([]);
  const [parcelName, setParcelName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleBboxSelected = (bbox: [number, number, number, number]) => {
    setSelectedBbox(bbox);
  };

  const handleAnalyze = () => {
    if (!selectedBbox) return;
    setLoading(true);
    const [lonMin, latMin, lonMax, latMax] = selectedBbox;
    router.push(`/dashboard?bbox=${lonMin},${latMin},${lonMax},${latMax}`);
  };

  const handleSaveParcel = async () => {
    if (!selectedBbox || !auth.currentUser || !parcelName.trim()) return;
    setSaving(true);
    try {
      await addParcel(auth.currentUser.uid, parcelName, selectedBbox);
      router.push("/escritorio");
    } catch (err) {
      console.error(err);
      alert("Error guardando parcela");
    } finally {
      setSaving(false);
    }
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.18),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(14,165,233,0.14),transparent_30%),linear-gradient(to_bottom,#052e16,#0a0f1d_45%,#020617)] text-white">
      <header className="px-6 py-5 border-b border-white/10 backdrop-blur-sm bg-slate-950/30 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/escritorio")}
              className="text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm border border-white/5 shadow-sm mr-2"
              aria-label="Volver al escritorio"
            >
              ← <span className="hidden sm:inline">Volver</span>
            </button>
            <div className="w-9 h-9 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl shadow-lg shadow-emerald-900/40 flex items-center justify-center text-lg">
              🛰️
            </div>
            <span className="font-bold text-xl tracking-tight">VESTA</span>
            <span className="hidden sm:inline text-green-400 text-sm ml-1">
              Portal Productor
            </span>
          </div>
          <div>
            <button 
              onClick={() => {
                import("@/lib/firebase").then(({ auth }) => auth.signOut());
              }}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Selección de Parcela</h1>
        <p className="text-gray-400 mb-8">Definí el sector para iniciar el análisis satelital y agronómico.</p>

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
        <div className="bg-gradient-to-b from-white/[0.08] to-white/[0.04] border border-white/10 rounded-2xl p-4 backdrop-blur shadow-[0_20px_50px_rgba(2,6,23,0.5)]">
          <MapSelector
            onBboxSelected={handleBboxSelected}
            initialBbox={selectedBbox}
          />

          {selectedBbox && (
            <div className="mt-6 border-t border-white/10 pt-6 space-y-3">
              {/* Analyze now */}
              <button
                onClick={handleAnalyze}
                disabled={loading || saving}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900 text-white font-bold py-3.5 px-6 rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.25)]"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Iniciando análisis...
                  </>
                ) : (
                  <>🛰️ Analizar parcela</>
                )}
              </button>

              {/* Save as named parcel */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-2">Guardar como lote permanente</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={parcelName}
                    onChange={(e) => setParcelName(e.target.value)}
                    placeholder="Nombre del lote · ej: Lote 4 Norte"
                    className="flex-1 bg-white/10 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                  />
                  <button
                    onClick={handleSaveParcel}
                    disabled={saving || loading || !parcelName.trim()}
                    className="bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800/60 disabled:text-gray-600 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap"
                  >
                    {saving ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
