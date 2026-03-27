"use client";

import { useState } from "react";
import { addWine } from "@/services/firebaseDb";
import { auth } from "@/lib/firebase";

export default function AddWineModal({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [variety, setVariety] = useState("");
  const [year, setYear] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setLoading(true);

    try {
      // Usamos el archivo default que copié a public
      const defaultImageUrl = "/default_wine_bottle.png"; 
      await addWine(auth.currentUser.uid, name, variety, year, defaultImageUrl);
      onSuccess();
      onClose();
      // Limpiar data
      setName("");
      setVariety("");
      setYear("");
    } catch (err) {
      console.error(err);
      alert("Error guardando vino");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" 
        onClick={onClose} 
      />

      {/* Modal Content */}
      <div className="relative bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/20 rounded-3xl w-full max-w-md p-8 shadow-[0_30px_100px_rgba(2,6,23,0.8)] overflow-hidden">
        
        {/* Glow Effects */}
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10">
          <h2 className="text-2xl font-bold text-white mb-1">Registrar Etiqueta</h2>
          <p className="text-emerald-100/50 text-sm mb-6">Agregar un nuevo vino a tu catálogo de trazabilidad VESTA.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-emerald-200 uppercase tracking-widest mb-1.5 opacity-80">
                Nombre Comercial
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
                className="w-full bg-black/40 border border-emerald-500/20 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all font-medium"
                placeholder="Ej: Gran Reserva Monteviejo"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-emerald-200 uppercase tracking-widest mb-1.5 opacity-80">
                  Cepa / Variety
                </label>
                <input
                  type="text"
                  required
                  value={variety}
                  onChange={e => setVariety(e.target.value)}
                  className="w-full bg-black/40 border border-emerald-500/20 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all font-medium"
                  placeholder="Malbec"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-emerald-200 uppercase tracking-widest mb-1.5 opacity-80">
                  Cosecha
                </label>
                <input
                  type="text"
                  required
                  value={year}
                  onChange={e => setYear(e.target.value)}
                  className="w-full bg-black/40 border border-emerald-500/20 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all font-medium"
                  placeholder="2024"
                />
              </div>
            </div>

            <div className="bg-emerald-950/30 border border-emerald-500/10 rounded-xl p-4 flex items-center gap-3 mt-2">
               <span className="text-xl">📸</span>
               <p className="text-xs text-emerald-300/80 leading-relaxed">
                 La plataforma VESTA generará temporalmente una botella de alta resolución por defecto para el pasaporte Blockchain.
               </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 text-sm font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-bold text-sm shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all flex items-center disabled:opacity-50"
              >
                {loading ? "Registrando..." : "Guardar Etiqueta"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
