"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function HomePage() {
  const router = useRouter();
  const [wineCode, setWineCode] = useState("");

  const handleMenuNavigate = (sectionId: string) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleBottleLookup = () => {
    const value = wineCode.trim();
    if (!value) return;
    const normalized = value.replace(/^bottle=/i, "");
    if (!normalized) return;
    router.push(`/bottle/${encodeURIComponent(normalized)}`);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.18),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(14,165,233,0.14),transparent_30%),linear-gradient(to_bottom,#052e16,#0a0f1d_45%,#020617)] text-white">
      {/* Header */}
      <header className="px-6 py-5 border-b border-white/10 backdrop-blur-sm bg-slate-950/30 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl shadow-lg shadow-emerald-900/40 flex items-center justify-center text-lg">
              🛰️
            </div>
            <span className="font-bold text-xl tracking-tight">VESTA</span>
            <span className="text-green-400 text-sm ml-1 hidden sm:inline">
              Vegetation Satellite Tracker Analytics
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleMenuNavigate("about-us")}
              className="px-4 py-2 rounded-full border border-emerald-300/20 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors text-sm text-emerald-100"
            >
              About Us
            </button>
            <button
              onClick={() => handleMenuNavigate("tracking-vino")}
              className="px-4 py-2 rounded-full border border-green-300/20 bg-green-500/10 hover:bg-green-500/20 transition-colors text-sm text-green-100"
            >
              Tracking de vino
            </button>
            <button
              onClick={() => router.push("/login")}
              className="ml-4 px-5 py-2 rounded-full border border-emerald-500 bg-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all text-sm font-semibold text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
            >
              Acceso Portal →
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        {/* Hero */}
        <div className="text-center mb-10 rounded-[2rem] border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.03] backdrop-blur-md px-5 py-12 shadow-[0_20px_70px_rgba(2,6,23,0.45)] relative overflow-hidden">
          
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/20 rounded-full blur-[100px] z-0 pointer-events-none" />

          <div className="relative z-10">
            <h1 className="text-4xl sm:text-6xl font-extrabold mb-6 leading-tight">
              Protegé tu cosecha
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-300 via-emerald-300 to-cyan-300">
                desde el satélite
              </span>
            </h1>
            <p className="text-slate-300 text-lg max-w-2xl mx-auto">
              Análisis agronómico inteligente y <b>alertas de helada 8 horas antes</b>. No vuelvas a perder un ciclo de producción por reaccionar tarde al clima.
            </p>

            {/* Real frost event badge */}
            <div className="inline-flex items-center gap-2 mt-8 bg-red-900/40 border border-red-700/50 text-red-300 px-5 py-2.5 rounded-full text-sm font-medium shadow-[0_0_20px_rgba(239,68,68,0.2)]">
              <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
              Impacto Evitado: 23 Mar 2026 — 3.1°C alertado 8hs previos en Monteviejo
            </div>

            <div className="mt-10 max-w-md mx-auto">
                <button
                  onClick={() => router.push("/login")}
                  className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-bold py-4 px-6 rounded-2xl transition-all text-lg shadow-[0_0_30px_rgba(16,185,129,0.4)] flex justify-center items-center gap-2"
                >
                  Acceder a la Plataforma B2B
                </button>
            </div>
            <p className="mt-4 text-sm text-emerald-100/60">Disponible sólo para productores y bodegas adheridas de Mendoza</p>
          </div>
        </div>

        {/* How it works */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 text-sm">
          {[
            {
              icon: "🛰️",
              title: "Imagen satelital real",
              desc: "Datos Sentinel-2 actualizados de tu parcela exacta. Olvídate de reportes genéricos.",
            },
            {
              icon: "🤖",
              title: "Análisis agronómico IA",
              desc: "Gemini evalúa vigor, madurez y riesgos específicos del Valle de Uco.",
            },
            {
              icon: "⚡",
              title: "Alerta Predictiva 8Hs",
              desc: "Calculo dT/dt que pronostica heladas y shocks térmicos con precisión récord.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="bg-gradient-to-b from-white/[0.09] to-white/[0.04] border border-white/10 rounded-2xl p-6 hover:bg-white/[0.12] transition-colors"
            >
              <div className="text-3xl mb-3">{item.icon}</div>
              <p className="font-semibold text-white text-lg">{item.title}</p>
              <p className="text-gray-400 mt-2 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        <section
          id="tracking-vino"
          className="mt-12 rounded-[2rem] p-[1px] bg-gradient-to-br from-green-300/35 via-emerald-300/15 to-transparent"
        >
          <div className="rounded-[2rem] bg-slate-950/70 backdrop-blur-md px-8 py-10">
            <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-green-500/15 text-green-200 border border-green-400/20 mb-2">
              Consumidores Finales
            </span>
            <h2 className="text-3xl font-bold text-white mt-2">¿Tenés una botella certificada?</h2>
            <p className="text-gray-300 mt-3 leading-relaxed max-w-3xl">
              Escaneá el QR de la botella o ingresá su código único. Accedé al pasaporte blockchain que evidencia el cuidado del terroir y la salud del viñedo desde el espacio.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 max-w-lg">
              <input
                type="text"
                value={wineCode}
                onChange={(e) => setWineCode(e.target.value)}
                placeholder="Código de la botella (Ej: 3)"
                className="flex-1 bg-slate-900/60 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-400 transition-all"
              />
              <button
                onClick={handleBottleLookup}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 font-semibold text-white shadow-lg shadow-emerald-900/30 whitespace-nowrap"
              >
                Auditar Origen →
              </button>
            </div>
          </div>
        </section>

        <section id="about-us" className="mt-6">
          <div className="rounded-[2rem] bg-gradient-to-br from-emerald-900/30 to-transparent border border-emerald-500/20 px-8 py-8 backdrop-blur-sm">
             <h2 className="text-2xl font-bold text-emerald-100 mb-3">Tecnología que protege el viñedo y valida su origen</h2>
             <p className="text-emerald-50/70 leading-relaxed text-sm max-w-4xl">
               VESTA nace como la solución definitiva a las ineficiencias del monitoreo reactivo de Mendoza (2023-2024). Al combinar imágenes satelitales Sentinel-2 con análisis de vanguardia (Geospatial AI) y persistencia objetiva criptográfica (EVM/Soroban), brindamos herramientas institucionales tanto al productor primario como a la bodega exportadora. El clima de Mendoza exige acciones precisas, y nosotros entregamos 8 horas de ventaja táctica. 
             </p>
          </div>
        </section>

      </main>
    </div>
  );
}
