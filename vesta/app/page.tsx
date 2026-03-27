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
  const [wineCode, setWineCode] = useState("");

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.18),transparent_35%),linear-gradient(to_bottom,#052e16,#0a0f1d_45%,#020617)] text-white">
      {/* Header */}
      <header className="px-6 py-5 border-b border-white/10 backdrop-blur-sm bg-slate-950/25">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl shadow-lg shadow-emerald-900/40 flex items-center justify-center text-lg">
              🛰️
            </div>
            <span className="font-bold text-xl tracking-tight">VESTA</span>
            <span className="text-green-400 text-sm ml-1">
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
              onClick={() => handleMenuNavigate("business-model")}
              className="px-4 py-2 rounded-full border border-sky-300/20 bg-sky-500/10 hover:bg-sky-500/20 transition-colors text-sm text-sky-100"
            >
              Modelo de negocio
            </button>
            <button
              onClick={() => handleMenuNavigate("faqs")}
              className="px-4 py-2 rounded-full border border-amber-300/20 bg-amber-500/10 hover:bg-amber-500/20 transition-colors text-sm text-amber-100"
            >
              FAQs
            </button>
          </div>
        </div>
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

          <p className="mt-4 text-base sm:text-lg font-medium text-amber-300 max-w-3xl mx-auto">
            El satélite que cuida la cosecha es el mismo que cuenta su historia en la botella.
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

        <section
          id="tracking-vino"
          className="mt-12 rounded-[2rem] p-[1px] bg-gradient-to-br from-green-300/35 via-emerald-300/15 to-transparent"
        >
          <div className="rounded-[2rem] bg-slate-950/70 backdrop-blur-md px-6 py-7">
            <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-green-500/15 text-green-200 border border-green-400/20">
              Tracking de vino
            </span>
            <h2 className="text-2xl font-bold text-white mt-3">Ingresá tu código y abrí el pasaporte digital</h2>
            <p className="text-gray-300 mt-3 leading-relaxed">
              Escaneá el QR de la botella, ingresá su código y accedé al origen verificado, condiciones climáticas y
              trazabilidad del lote en una sola vista.
            </p>
            <div className="mt-4 flex gap-2 max-w-md">
              <input
                type="text"
                value={wineCode}
                onChange={(e) => setWineCode(e.target.value)}
                placeholder="Ej: 1842"
                className="flex-1 bg-slate-900/60 border border-white/20 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              <button
                onClick={handleBottleLookup}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-sm font-semibold text-white"
              >
                Ver vino
              </button>
            </div>
          </div>
        </section>

        <section
          id="about-us"
          className="mt-6 rounded-[2rem] p-[1px] bg-gradient-to-br from-emerald-300/35 via-sky-300/15 to-transparent"
        >
          <div className="rounded-[2rem] bg-slate-950/70 backdrop-blur-md px-6 py-7">
            <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-200 border border-emerald-400/20">
              About Us
            </span>
            <h2 className="text-2xl font-bold text-white mt-3">Tecnología que protege el viñedo y valida su origen</h2>
            <p className="text-gray-300 mt-3 leading-relaxed">
            VESTA combina imágenes satelitales, análisis agronómico con IA y verificación en blockchain para proteger
            la producción vitivinícola de Mendoza y contar la historia real de cada botella.
            </p>
          </div>
        </section>

        <section
          id="business-model"
          className="mt-6 rounded-[2rem] p-[1px] bg-gradient-to-br from-sky-300/35 via-indigo-300/15 to-transparent"
        >
          <div className="rounded-[2rem] bg-slate-950/70 backdrop-blur-md px-6 py-7">
            <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-200 border border-sky-400/20">
              Modelo de negocio
            </span>
            <h2 className="text-2xl font-bold text-white mt-3">Suscripción productiva + certificación exportable</h2>
            <p className="text-gray-300 mt-3 leading-relaxed">
              VESTA opera con dos líneas de ingresos. Para productores medianos (20-80 ha), la propuesta es alerta
              temprana de helada y seguimiento por parcela con ticket mensual objetivo de USD 99-150. Para bodegas
              exportadoras (100-500 ha), la propuesta es certificación verificable y trazabilidad con ticket objetivo
              de USD 299/mes, reemplazando auditorías anuales de USD 5.000-15.000.
            </p>
            <p className="text-gray-300 mt-3 leading-relaxed">
              El enfoque inicial es Mendoza: 896 bodegas y 14.593 viñedos, con dos ciclos recientes de emergencia
              agropecuaria. El crecimiento año 2-3 contempla acuerdos con aseguradoras y organismos públicos para
              acelerar adopción de microseguros y certificación objetiva de eventos climáticos.
            </p>
          </div>
        </section>

        <section
          id="faqs"
          className="mt-6 mb-12 rounded-[2rem] p-[1px] bg-gradient-to-br from-amber-300/35 via-orange-300/15 to-transparent"
        >
          <div className="rounded-[2rem] bg-slate-950/70 backdrop-blur-md px-6 py-7">
            <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-200 border border-amber-400/20">
              FAQs
            </span>
            <h2 className="text-2xl font-bold text-white mt-3">Preguntas frecuentes</h2>
            <div className="mt-4 space-y-3 text-gray-300">
              <details className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <summary className="cursor-pointer font-semibold text-white">¿Qué es VESTA exactamente?</summary>
                <p className="mt-2">
                  VESTA es un sistema que usa satélites, inteligencia artificial y blockchain para proteger la
                  cosecha del productor y contar la historia real de cada botella de vino. Avisa antes de que llegue
                  la helada, certifica el estado del viñedo de forma objetiva y permite que cualquier persona en el
                  mundo verifique el origen de lo que está tomando escaneando un QR.
                </p>
              </details>
              <details className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <summary className="cursor-pointer font-semibold text-white">¿Necesito instalar algo o comprar equipamiento?</summary>
                <p className="mt-2">
                  No. VESTA usa satélites que ya están en órbita cubriendo toda Mendoza. Solo necesitás acceso desde
                  tu celular o computadora. Sin sensores, sin hardware, sin instalaciones.
                </p>
              </details>
              <details className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <summary className="cursor-pointer font-semibold text-white">¿Cómo avisa VESTA antes de una helada?</summary>
                <p className="mt-2">
                  Cruza el pronóstico climático con el historial exacto de tu parcela, no de Mendoza en general, sino
                  de tus coordenadas específicas. Si detecta riesgo, te llega una alerta con 8 a 12 horas de
                  anticipación. Tiempo real para actuar.
                </p>
              </details>
              <details className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <summary className="cursor-pointer font-semibold text-white">¿Qué es blockchain y por qué lo usa VESTA?</summary>
                <p className="mt-2">
                  Es un registro digital que nadie puede modificar ni falsificar. VESTA lo usa para certificar que los
                  datos del viñedo son reales y permanentes. Un importador en Alemania o un consumidor en Tokio pueden
                  verificarlo solos, sin intermediarios ni papeles.
                </p>
              </details>
              <details className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <summary className="cursor-pointer font-semibold text-white">¿Qué veo cuando escaneo el QR de una botella?</summary>
                <p className="mt-2">
                  El mapa satelital real del viñedo donde crecieron esas uvas, los datos climáticos de esa temporada y
                  la confirmación de que todo fue registrado y no puede alterarse. Sin app, se abre directo desde la
                  cámara del celular.
                </p>
              </details>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
