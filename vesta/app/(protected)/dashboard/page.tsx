"use client";

import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import AlertBanner from "@/components/AlertBanner";
import StatusCard from "@/components/StatusCard";
import WeatherChart from "@/components/WeatherChart";
import type { GeminiAnalysis, GeminiTemporalAnalysis } from "@/lib/gemini";
import { auth } from "@/lib/firebase";
import { saveCertificate, saveAnalysis, getAnalysis } from "@/services/firebaseDb";
import type { WeatherResult } from "@/lib/weather";
import type { PixelDistribution } from "@/lib/sentinel";

const SatelliteMap = dynamic(() => import("@/components/SatelliteMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[380px] bg-gray-100 rounded-xl animate-pulse flex items-center justify-center">
      <span className="text-gray-400 text-sm">Cargando mapa satelital...</span>
    </div>
  ),
});

interface AnalysisResult {
  imageBase64: string;
  imageHash: string;
  indices: {
    ndvi: number;
    ndre: number;
    ndwi: number;
    distribution?: PixelDistribution;
    totalVegetationPercent?: number;
  };
  geminiAnalysis: GeminiAnalysis;
  weather: WeatherResult;
  timestamp: string;
  bbox: number[];
}

interface TemporalResult {
  current: {
    imageBase64: string;
    imageHash: string;
    indices: { ndvi: number; ndre: number; ndwi: number };
  };
  comparison: {
    imageBase64: string;
    imageHash: string;
    indices: { ndvi: number; ndre: number; ndwi: number };
    dateRange: { from: string; to: string };
  };
  evolution: GeminiTemporalAnalysis;
}

type Step = "idle" | "analyzing" | "done" | "error";

interface CertifyResult {
  txHash: string;
  tokenId: string;
  explorerUrl: string;
}

type CertifyStep = "idle" | "minting" | "success" | "error";
type TemporalStep = "idle" | "loading" | "done" | "error";

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const bboxParam = searchParams.get("bbox");
  const bbox = bboxParam
    ? (bboxParam.split(",").map(Number) as [number, number, number, number])
    : null;
  const nombreLote = searchParams.get("nombre") || "Mi lote";

  const [step, setStep] = useState<Step>("idle");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [weather, setWeather] = useState<WeatherResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [certStep, setCertStep] = useState<CertifyStep>("idle");
  const [certResult, setCertResult] = useState<CertifyResult | null>(null);
  const [certError, setCertError] = useState<string | null>(null);

  // Temporal analysis state
  const [temporalStep, setTemporalStep] = useState<TemporalStep>("idle");
  const [temporalResult, setTemporalResult] = useState<TemporalResult | null>(null);
  const [temporalError, setTemporalError] = useState<string | null>(null);
  const [comparisonDate, setComparisonDate] = useState<string>("");

  const runAnalysis = async (forceRefresh = false) => {
    if (!bbox) return;
    setStep("analyzing");
    setError(null);
    setFromCache(false);

    // Si no es forzado, intentar cargar desde Firebase primero
    if (!forceRefresh) {
      const uid = auth.currentUser?.uid;
      if (uid) {
        const cached = await getAnalysis(uid, bbox) as AnalysisResult | null;
        if (cached) {
          setAnalysis(cached);
          setWeather(cached.weather);
          setFromCache(true);
          setStep("done");
          return;
        }
      }
    }

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bbox }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error en análisis");
      }
      const data: AnalysisResult = await res.json();
      setAnalysis(data);
      setWeather(data.weather);

      // Guardar en Firebase para la próxima vez
      const uid = auth.currentUser?.uid;
      if (uid) {
        await saveAnalysis(uid, bbox, data);
      }

      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setStep("error");
    }
  };

  useEffect(() => {
    if (!bbox) return;
    runAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bboxParam]);

  const handleTemporalAnalysis = async () => {
    if (!bbox || !comparisonDate) return;
    setTemporalStep("loading");
    setTemporalError(null);
    try {
      // Use comparison date as a 15-day window ending at that date
      const dateTo = comparisonDate;
      const from = new Date(comparisonDate);
      from.setDate(from.getDate() - 15);
      const dateFrom = from.toISOString().split("T")[0];

      const res = await fetch("/api/analyze/temporal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bbox,
          comparisonDateFrom: dateFrom,
          comparisonDateTo: dateTo,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error en análisis temporal");
      }
      const data: TemporalResult = await res.json();
      setTemporalResult(data);
      setTemporalStep("done");
    } catch (err) {
      setTemporalError(err instanceof Error ? err.message : "Error desconocido");
      setTemporalStep("error");
    }
  };

  const handleCertify = async () => {
    if (!analysis) return;
    setCertStep("minting");
    setCertError(null);
    try {
      const lat = bbox ? (bbox[1] + bbox[3]) / 2 : 0;
      const lon = bbox ? (bbox[0] + bbox[2]) / 2 : 0;
      const res = await fetch("/api/certify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chain: "bnb",
          bodega: "Parcela VESTA",
          coordenadas: `${lat.toFixed(4)},${lon.toFixed(4)}`,
          imageHash: analysis.imageHash,
          ndvi: analysis.indices.ndvi,
          ndre: analysis.indices.ndre,
          ndwi: analysis.indices.ndwi,
          climateEvent: weather?.frostRisk ? "helada_detectada" : "",
          walletAddress: "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al certificar");
      setCertResult(data);

      // Guardar en Firebase si hay usuario logueado
      const uid = auth.currentUser?.uid;
      if (uid) {
        await saveCertificate(uid, {
          tokenId: data.tokenId,
          txHash: data.txHash,
          explorerUrl: data.explorerUrl,
          ndvi: analysis.indices.ndvi,
          ndre: analysis.indices.ndre,
          ndwi: analysis.indices.ndwi,
          bbox: bbox ?? [],
          coordenadas: `${((bbox?.[1] ?? 0) + (bbox?.[3] ?? 0)) / 2},${((bbox?.[0] ?? 0) + (bbox?.[2] ?? 0)) / 2}`,
          climateEvent: weather?.frostRisk ? "helada_detectada" : "",
          chain: "bnb",
        });
      }

      setCertStep("success");
    } catch (err) {
      setCertError(err instanceof Error ? err.message : "Error desconocido");
      setCertStep("error");
    }
  };

  if (!bbox) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">No hay coordenadas seleccionadas.</p>
          <button
            onClick={() => router.push("/escritorio")}
            className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm"
          >
            Volver al escritorio
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (step === "analyzing") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center max-w-sm px-6">
          <div className="w-16 h-16 bg-green-900/40 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="animate-spin h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <p className="text-white font-semibold text-lg mb-2">Mirando tu lote desde el satélite</p>
          <p className="text-gray-400 text-sm">Esto puede tardar unos segundos. El satélite está procesando la imagen de tu parcela.</p>
        </div>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-red-500 font-semibold text-lg mb-2">Error en el análisis</p>
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <button
            onClick={() => router.push("/escritorio")}
            className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm"
          >
            Volver al escritorio
          </button>
        </div>
      </div>
    );
  }

  const frostAlert = weather?.frostAlert;

  // Temporal analysis evolution config
  const evolutionConfig = temporalResult?.evolution ? {
    mejora: { icon: "📈", color: "text-green-600", bg: "bg-green-50", border: "border-green-200", label: "Mejora detectada" },
    estable: { icon: "➡️", color: "text-gray-600", bg: "bg-gray-50", border: "border-gray-200", label: "Sin cambios significativos" },
    deterioro: { icon: "📉", color: "text-red-600", bg: "bg-red-50", border: "border-red-200", label: "Deterioro detectado" },
  }[temporalResult.evolution.cambio_general] : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {frostAlert && (
        <AlertBanner
          minTemp={frostAlert.minTemp}
          hoursUntil={frostAlert.hoursUntil}
          date={frostAlert.date}
        />
      )}

      {/* Header */}
      <header className="bg-gray-950 border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/escritorio")}
            className="text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-sm border border-white/5"
          >
            ← Mis lotes
          </button>
          <div>
            <p className="font-bold text-white leading-tight">{nombreLote}</p>
            <p className="text-xs text-gray-500">
              {analysis?.timestamp
                ? new Date(analysis.timestamp).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })
                : "Analizando..."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {fromCache && (
            <span className="text-xs text-gray-600 hidden sm:block">
              Guardado anteriormente
            </span>
          )}
          {step === "done" && (
            <button
              onClick={() => runAnalysis(true)}
              className="text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg transition-colors"
            >
              🔄 Nuevo análisis
            </button>
          )}
        </div>
      </header>

      {/* Three-column layout */}
      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[40%_35%_25%] gap-5">

        {/* LEFT: Satellite map */}
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Tu lote desde el satélite
          </h2>
          {analysis && (
            <SatelliteMap
              imageBase64={analysis.imageBase64}
              bbox={bbox}
            />
          )}

          {/* Resumen de salud en lenguaje simple */}
          {analysis?.indices?.distribution && analysis.indices.totalVegetationPercent !== undefined && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">
                ¿Cómo está tu lote?
              </p>
              {/* Barra visual de salud */}
              <div className="h-5 rounded-full overflow-hidden flex mb-3">
                <div className="bg-green-600 transition-all" style={{ width: `${analysis.indices.distribution.green_intense}%` }} title="Muy sano" />
                <div className="bg-green-400 transition-all" style={{ width: `${analysis.indices.distribution.green_mid + analysis.indices.distribution.green_light}%` }} title="Sano" />
                <div className="bg-yellow-400 transition-all" style={{ width: `${analysis.indices.distribution.yellow}%` }} title="Atención" />
                <div className="bg-blue-400 transition-all" style={{ width: `${analysis.indices.distribution.blue}%` }} title="Húmedo" />
                <div className="bg-red-400 transition-all" style={{ width: `${analysis.indices.distribution.red}%` }} title="Sin plantas" />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" />
                  <span className="text-gray-600">
                    <strong className="text-gray-800">{analysis.indices.totalVegetationPercent}%</strong> con plantas sanas
                  </span>
                </div>
                {analysis.indices.distribution.yellow > 5 && (
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 shrink-0" />
                    <span className="text-gray-600">
                      <strong className="text-gray-800">{analysis.indices.distribution.yellow}%</strong> necesita atención
                    </span>
                  </div>
                )}
                {analysis.indices.distribution.blue > 5 && (
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-400 shrink-0" />
                    <span className="text-gray-600">
                      <strong className="text-gray-800">{analysis.indices.distribution.blue}%</strong> con mucha humedad
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* CENTER: Status + Certify */}
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Estado de hoy
          </h2>
          {analysis && (
            <StatusCard analysis={analysis.geminiAnalysis} indices={analysis.indices} />
          )}

          {/* ─── CERTIFICAR ON-CHAIN ─── */}
          {/* Temporal comparison trigger */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm font-semibold text-gray-700 mb-1">
              ¿Cómo estaba antes?
            </p>
            <p className="text-xs text-gray-400 mb-3">
              Elegí una fecha pasada para ver si tu lote mejoró o empeoró.
            </p>
            <div className="flex gap-2">
              <input
                type="date"
                value={comparisonDate}
                onChange={(e) => setComparisonDate(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                max={new Date().toISOString().split("T")[0]}
              />
              <button
                onClick={handleTemporalAnalysis}
                disabled={!comparisonDate || temporalStep === "loading"}
                className="bg-indigo-500 hover:bg-indigo-400 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
              >
                {temporalStep === "loading" ? "Comparando..." : "Ver cambios"}
              </button>
            </div>
          </div>

          {/* Temporal result */}
          {temporalStep === "done" && temporalResult && evolutionConfig && (
            <div className={`rounded-xl border ${evolutionConfig.border} ${evolutionConfig.bg} p-4`}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{evolutionConfig.icon}</span>
                <p className={`text-sm font-bold ${evolutionConfig.color}`}>{evolutionConfig.label}</p>
              </div>

              {/* Before/after mini images */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="text-center">
                  <p className="text-[10px] text-gray-500 mb-1">
                    Anterior ({temporalResult.comparison.dateRange.from} – {temporalResult.comparison.dateRange.to})
                  </p>
                  <img
                    src={`data:image/png;base64,${temporalResult.comparison.imageBase64}`}
                    alt="Imagen anterior"
                    className="rounded-lg border border-gray-200 w-full aspect-square object-cover"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Vigor: {(temporalResult.comparison.indices.ndvi * 100).toFixed(0)}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-gray-500 mb-1">Actual</p>
                  <img
                    src={`data:image/png;base64,${temporalResult.current.imageBase64}`}
                    alt="Imagen actual"
                    className="rounded-lg border border-gray-200 w-full aspect-square object-cover"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Vigor: {(temporalResult.current.indices.ndvi * 100).toFixed(0)}%
                  </p>
                </div>
              </div>

              {/* Evolution details */}
              <div className="space-y-2 text-sm">
                <p className="text-gray-700">
                  <strong>Cambio estimado:</strong> {temporalResult.evolution.porcentaje_cambio_ndvi > 0 ? "+" : ""}
                  {temporalResult.evolution.porcentaje_cambio_ndvi}% en vigor
                </p>
                <p className="text-gray-700">
                  <strong>Tendencia:</strong> {temporalResult.evolution.tendencia}
                </p>
                <p className="text-gray-700">
                  <strong>Causa probable:</strong> {temporalResult.evolution.posible_causa}
                </p>

                {temporalResult.evolution.zonas_mejoradas.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-green-700">Zonas mejoradas:</p>
                    <ul className="text-xs text-gray-600 ml-3">
                      {temporalResult.evolution.zonas_mejoradas.map((z, i) => (
                        <li key={i}>· {z}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {temporalResult.evolution.zonas_deterioradas.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-red-700">Zonas deterioradas:</p>
                    <ul className="text-xs text-gray-600 ml-3">
                      {temporalResult.evolution.zonas_deterioradas.map((z, i) => (
                        <li key={i}>· {z}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {temporalResult.evolution.recomendaciones.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-700">Recomendaciones:</p>
                    <ul className="text-xs text-gray-600 ml-3">
                      {temporalResult.evolution.recomendaciones.map((r, i) => (
                        <li key={i}>→ {r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {temporalStep === "error" && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-600">{temporalError}</p>
              <button
                onClick={() => setTemporalStep("idle")}
                className="text-xs text-gray-500 hover:text-gray-700 mt-2"
              >
                Reintentar
              </button>
            </div>
          )}

          {/* Guardar certificado */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm font-semibold text-gray-700 mb-1">
              Guardar el estado de hoy
            </p>
            <p className="text-xs text-gray-400 mb-3">
              Dejá registrado cómo está tu lote hoy. Útil para demostrar el origen de tu cosecha.
            </p>

            {certStep === "idle" && (
              <button
                onClick={handleCertify}
                disabled={!analysis}
                className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
              >
                Guardar certificado
              </button>
            )}

            {certStep === "minting" && (
              <div className="flex items-center justify-center gap-2 py-2.5 text-sm text-gray-500">
                <svg className="animate-spin h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Guardando certificado...
              </div>
            )}

            {certStep === "success" && certResult && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-600 text-sm font-semibold">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Certificado guardado
                </div>
                <a
                  href={`/bottle/${certResult.tokenId}`}
                  className="block w-full text-center bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-medium rounded-lg py-2 text-sm transition-colors"
                >
                  Ver pasaporte del vino →
                </a>
                <details className="text-xs text-gray-400">
                  <summary className="cursor-pointer hover:text-gray-600 select-none">
                    Detalles técnicos
                  </summary>
                  <div className="mt-2 space-y-1 pl-2 border-l-2 border-gray-100">
                    <div className="flex justify-between">
                      <span>Certificado #</span>
                      <span className="font-mono">{certResult.tokenId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Red</span>
                      <span className="font-mono">BNB Chain</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="shrink-0">Hash</span>
                      <span className="font-mono truncate">{certResult.txHash.slice(0, 20)}…</span>
                    </div>
                    <a
                      href={certResult.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-green-500 hover:underline pt-1"
                    >
                      Ver verificación →
                    </a>
                  </div>
                </details>
              </div>
            )}

            {certStep === "error" && (
              <div className="space-y-2">
                <p className="text-xs text-red-500">{certError}</p>
                <button
                  onClick={() => setCertStep("idle")}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  Reintentar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Weather */}
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            El tiempo
          </h2>
          {weather && (
            <WeatherChart
              daily={weather.daily}
              frostAlert={weather.frostAlert}
              waterBalance={weather.summary.waterBalance}
              totalPrecip={weather.summary.totalPrecip}
            />
          )}

          {weather && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
              <p className="text-sm font-semibold text-gray-700 mb-1">
                Alertas para tu lote
              </p>
              <div className={`flex items-center gap-3 text-sm px-3 py-2.5 rounded-xl ${
                weather.frostRisk ? "bg-red-50 text-red-700 border border-red-200" : "bg-gray-50 text-gray-400"
              }`}>
                <span className="text-xl">🌡️</span>
                <span>{weather.frostRisk ? "Riesgo de helada esta noche" : "Sin riesgo de helada"}</span>
              </div>
              <div className={`flex items-center gap-3 text-sm px-3 py-2.5 rounded-xl ${
                weather.fungalRisk ? "bg-orange-50 text-orange-700 border border-orange-200" : "bg-gray-50 text-gray-400"
              }`}>
                <span className="text-xl">🍄</span>
                <span>{weather.fungalRisk ? "Cuidado con hongos — llovió hace poco" : "Sin riesgo de hongos"}</span>
              </div>
              {weather.tempDrops.length > 0 && (
                <div className="flex items-center gap-3 text-sm px-3 py-2.5 rounded-xl bg-yellow-50 text-yellow-700 border border-yellow-200">
                  <span className="text-xl">⚡</span>
                  <span>Bajón brusco de temperatura el {weather.tempDrops[0]}</span>
                </div>
              )}
              {!weather.frostRisk && !weather.fungalRisk && weather.tempDrops.length === 0 && (
                <div className="flex items-center gap-3 text-sm px-3 py-2.5 rounded-xl bg-green-50 text-green-700 border border-green-200">
                  <span className="text-xl">✅</span>
                  <span>Todo tranquilo por ahora</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-white text-sm">Cargando...</div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
