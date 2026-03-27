"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { getParcels, getWines, Parcel, Wine } from "@/services/firebaseDb";
import AddWineModal from "../../../components/AddWineModal";

export default function EscritorioPage() {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [wines, setWines] = useState<Wine[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  const loadData = async () => {
    const user = auth.currentUser;
    if (!user) {
       setLoading(false);
       return;
    }
    setLoading(true);
    try {
      const p = await getParcels(user.uid);
      const w = await getWines(user.uid);
      setParcels(p);
      setWines(w);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      loadData();
    });
    return () => unsubscribe();
  }, []);

  const handleAnalyzeParcel = (bbox: [number, number, number, number]) => {
    const [lonMin, latMin, lonMax, latMax] = bbox;
    router.push(`/dashboard?bbox=${lonMin},${latMin},${lonMax},${latMax}`);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.18),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(14,165,233,0.14),transparent_30%),linear-gradient(to_bottom,#052e16,#0a0f1d_45%,#020617)] text-white">
      <header className="px-6 py-5 border-b border-white/10 backdrop-blur-sm bg-slate-950/30 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl shadow-lg shadow-emerald-900/40 flex items-center justify-center text-lg">
              🛰️
            </div>
            <span className="font-bold text-xl tracking-tight">VESTA</span>
            <span className="hidden sm:inline text-emerald-400 text-sm ml-1">
              Mi Escritorio
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-emerald-100/60 hidden sm:inline">{auth.currentUser?.email}</span>
            <button 
              onClick={() => { auth.signOut(); }}
              className="text-sm px-4 py-2 rounded-full border border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/20 hover:text-white transition-colors"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10 space-y-12">
        
        {/* PARCELAS SECTION */}
        <section>
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Mis Parcelas</h2>
              <p className="text-emerald-100/60 text-sm">Tu tierra, analizada desde el espacio.</p>
            </div>
            <button 
              onClick={() => router.push("/mapa")}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-sm font-semibold text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
            >
              + Nueva Parcela
            </button>
          </div>

          {loading ? (
             <div className="h-32 flex items-center justify-center">
                <p className="text-emerald-500/50 animate-pulse">Sincronizando con satélites...</p>
             </div>
          ) : parcels.length === 0 ? (
             <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-10 text-center backdrop-blur-sm">
                <span className="text-4xl">🗺️</span>
                <p className="text-emerald-100/70 mt-4 mb-4">Aún no has trazado el polígono de tu cosecha.</p>
                <button onClick={() => router.push("/mapa")} className="text-emerald-400 font-medium hover:text-emerald-300">Ir al mapa satelital →</button>
             </div>
          ) : (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {parcels.map(p => (
                  <div key={p.id} className="bg-gradient-to-b from-white/[0.08] to-white/[0.03] border border-white/10 rounded-2xl p-5 hover:bg-white/[0.12] transition-colors group">
                    <div className="flex justify-between items-start mb-4">
                       <h3 className="font-semibold text-lg text-emerald-50">{p.name}</h3>
                       <span className="text-xs font-mono bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded">Sentinel-L2A</span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono break-all mb-4 opacity-50">
                       bbox: {p.bbox.map(n => n.toFixed(3)).join(',')}
                    </p>
                    <button 
                      onClick={() => handleAnalyzeParcel(p.bbox)}
                      className="w-full py-2 rounded-lg bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-all text-sm"
                    >
                      Diagnóstico IA →
                    </button>
                  </div>
                ))}
             </div>
          )}
        </section>

        {/* VINOS SECTION */}
        <section>
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Mi Catálogo de Vinos</h2>
              <p className="text-emerald-100/60 text-sm">Registro preparado para auditoría on-chain HCS.</p>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2.5 rounded-xl border border-emerald-500/50 bg-emerald-900/30 hover:bg-emerald-800/40 text-sm font-semibold text-emerald-300 transition-all"
            >
              + Cargar Vino
            </button>
          </div>

          {loading ? (
             <div className="h-32" />
          ) : wines.length === 0 ? (
             <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-10 text-center backdrop-blur-sm">
                <span className="text-4xl text-slate-600">🍷</span>
                <p className="text-emerald-100/70 mt-4 mb-4">No has registrado las etiquetas comercializables del lote.</p>
             </div>
          ) : (
             <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                {wines.map(w => (
                  <div key={w.id} className="relative bg-gradient-to-b from-slate-800/80 to-slate-950/90 border border-white/10 rounded-2xl overflow-hidden shadow-2xl group text-center">
                    <div className="aspect-[3/4] w-full overflow-hidden bg-black/40 p-4 flex items-center justify-center">
                      {/* Generando botella con estilos elegantes */}
                      <img 
                        src={w.imageUrl} 
                        alt="Botella de Vino VESTA" 
                        className="h-full object-contain filter drop-shadow-[0_0_10px_rgba(16,185,129,0.1)] group-hover:scale-105 transition-transform duration-500" 
                      />
                    </div>
                    <div className="p-4 border-t border-white/5">
                       <h3 className="font-bold text-white leading-tight">{w.name}</h3>
                       <p className="text-emerald-400 text-sm font-medium mt-1">{w.variety} • {w.year}</p>
                    </div>
                  </div>
                ))}
             </div>
          )}
        </section>

      </main>

      <AddWineModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => loadData()}
      />
    </div>
  );
}
