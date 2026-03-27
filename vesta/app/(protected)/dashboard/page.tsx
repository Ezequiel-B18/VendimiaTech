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
  chain: "bnb" | "rsk";
  txHash: string;
  tokenId: string;
  explorerUrl: string;
}

type CertifyStep = "idle" | "minting" | "success" | "error";
type TemporalStep = "idle" | "loading" | "done" | "error";
type NotifyStep = "idle" | "saved" | "sending" | "sent" | "error";

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
  const [alertEmail, setAlertEmail] = useState<string>("");
  const [alertsEnabled, setAlertsEnabled] = useState<boolean>(false);
  const [notifyStep, setNotifyStep] = useState<NotifyStep>("idle");
  const [notifyError, setNotifyError] = useState<string | null>(null);

  const hasActiveAlerts = !!(
    weather && (
      weather.frostRisk ||
      weather.fungalRisk ||
      weather.intenseRainRisk ||
      weather.hailRisk ||
      weather.tempDrops.length > 0
    )
  );

  const alertSignature = weather
    ? JSON.stringify({
        frost: weather.frostRisk
          ? `${weather.frostAlert?.date ?? "na"}-${weather.frostAlert?.minTemp ?? "na"}`
          : "none",
        fungal: weather.fungalRisk,
        rain: weather.intenseRainDays,
        hail: weather.hailRisk
          ? `${weather.hailAlert?.date ?? "na"}-${weather.hailAlert?.precipitation ?? "na"}-${weather.hailAlert?.windSpeed ?? "na"}`
          : "none",
        drops: weather.tempDrops,
      })
    : "";

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedEmail = window.localStorage.getItem("vesta_alert_email") ?? "";
    const savedEnabled = window.localStorage.getItem("vesta_alert_enabled") === "1";
    setAlertEmail(savedEmail);
    setAlertsEnabled(savedEnabled);
  }, []);

  const sendAlertEmail = async () => {
    if (!weather || !alertEmail) return;

    setNotifyStep("sending");
    setNotifyError(null);

    try {
      const res = await fetch("/api/alert/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: alertEmail,
          bbox,
          frostRisk: weather.frostRisk,
          frostAlert: weather.frostAlert,
          fungalRisk: weather.fungalRisk,
          intenseRainRisk: weather.intenseRainRisk,
          intenseRainDays: weather.intenseRainDays,
          hailRisk: weather.hailRisk,
          hailAlert: weather.hailAlert,
          tempDrops: weather.tempDrops,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo enviar el email");

      if (typeof window !== "undefined") {
        const dedupeKey = `vesta_alert_signature:${bboxParam ?? "plot"}:${alertEmail}`;
        window.localStorage.setItem(dedupeKey, alertSignature);
      }

      setNotifyStep("sent");
    } catch (err) {
      setNotifyStep("error");
      setNotifyError(err instanceof Error ? err.message : "Error desconocido");
    }
  };

  useEffect(() => {
    if (!alertsEnabled || !alertEmail || !isValidEmail(alertEmail)) return;
    if (!hasActiveAlerts || !alertSignature) return;
    if (typeof window === "undefined") return;

    const dedupeKey = `vesta_alert_signature:${bboxParam ?? "plot"}:${alertEmail}`;
    const lastSent = window.localStorage.getItem(dedupeKey);

    if (lastSent === alertSignature) return;
    void sendAlertEmail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertsEnabled, alertEmail, alertSignature, bboxParam, hasActiveAlerts]);

  const handleSaveEmailAlerts = () => {
    if (!isValidEmail(alertEmail)) {
      setNotifyStep("error");
      setNotifyError("Ingresá un email válido para recibir alertas.");
      return;
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem("vesta_alert_email", alertEmail);
      window.localStorage.setItem("vesta_alert_enabled", "1");
    }

    setAlertsEnabled(true);
    setNotifyError(null);
    setNotifyStep("saved");
  };

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
          chain: "rsk",
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
          chain: "rsk",
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

  // Compute health percentage for stat cards
  const healthPct = analysis?.indices?.totalVegetationPercent ?? null;
  const tonightTemp = weather?.frostAlert?.minTemp ?? (weather?.daily?.find(d => d.date >= new Date().toISOString().split("T")[0])?.tempMin ?? null);
  const estadoLabel =
    analysis?.geminiAnalysis?.estado_general === "bueno" ? "Viñedo sano" :
    analysis?.geminiAnalysis?.estado_general === "regular" ? "Atención requerida" :
    analysis?.geminiAnalysis?.estado_general === "malo" ? "Problema detectado" : "—";
  const estadoBg =
    analysis?.geminiAnalysis?.estado_general === "bueno" ? "bg-green-500" :
    analysis?.geminiAnalysis?.estado_general === "regular" ? "bg-yellow-500" : "bg-red-500";

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
            <span className="text-xs text-gray-500 hidden sm:block">Guardado anteriormente</span>
          )}
          {step === "done" && (
            <button
              onClick={() => runAnalysis(true)}
              className="text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg transition-colors"
            >
              🔄 Actualizar
            </button>
          )}
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">

        {/* ── 3 STAT CARDS ── */}
        <div className="grid grid-cols-3 gap-3">
          {/* Estado general */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col items-center text-center gap-2">
            <div className={`w-12 h-12 rounded-full ${estadoBg} flex items-center justify-center`}>
              <span className="text-white text-xl">
                {analysis?.geminiAnalysis?.estado_general === "bueno" ? "✓" :
                 analysis?.geminiAnalysis?.estado_general === "regular" ? "!" : "✗"}
              </span>
            </div>
            <p className="text-xs text-gray-500 leading-tight">Estado del lote</p>
            <p className="font-bold text-gray-800 text-sm leading-tight">{estadoLabel}</p>
          </div>

          {/* Temperatura esta noche */}
          <div className={`rounded-2xl border p-4 flex flex-col items-center text-center gap-2 ${
            weather?.frostRisk ? "bg-red-50 border-red-200" : "bg-white border-gray-200"
          }`}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              weather?.frostRisk ? "bg-red-500" : "bg-blue-100"
            }`}>
              <span className="text-2xl">🌡️</span>
            </div>
            <p className={`text-xs leading-tight ${weather?.frostRisk ? "text-red-600" : "text-gray-500"}`}>Esta noche</p>
            <p className={`font-bold text-sm leading-tight ${weather?.frostRisk ? "text-red-700" : "text-gray-800"}`}>
              {tonightTemp !== null ? `${tonightTemp}°C` : "—"}
              {weather?.frostRisk && <span className="block text-xs font-normal">⚠️ Helada posible</span>}
            </p>
          </div>

          {/* Riesgo de hongos */}
          <div className={`rounded-2xl border p-4 flex flex-col items-center text-center gap-2 ${
            weather?.fungalRisk ? "bg-orange-50 border-orange-200" : "bg-white border-gray-200"
          }`}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              weather?.fungalRisk ? "bg-orange-400" : "bg-gray-100"
            }`}>
              <span className="text-2xl">🍄</span>
            </div>
            <p className={`text-xs leading-tight ${weather?.fungalRisk ? "text-orange-600" : "text-gray-500"}`}>Hongos</p>
            <p className={`font-bold text-sm leading-tight ${weather?.fungalRisk ? "text-orange-700" : "text-gray-800"}`}>
              {weather?.fungalRisk ? "Riesgo alto" : weather ? "Sin riesgo" : "—"}
            </p>
          </div>
        </div>

        {/* ── MAPA SATELITAL ── */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <p className="font-semibold text-gray-800">Tu lote desde el satélite</p>
            {healthPct !== null && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                healthPct >= 70 ? "bg-green-100 text-green-700" :
                healthPct >= 40 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
              }`}>
                {healthPct}% sano
              </span>
            )}
          </div>

          {analysis && (
            <SatelliteMap imageBase64={analysis.imageBase64} bbox={bbox} />
          )}

          {/* Barra de salud */}
          {analysis?.indices?.distribution && (
            <div className="px-4 pb-4 pt-3">
              <div className="h-4 rounded-full overflow-hidden flex mb-2">
                <div className="bg-green-600" style={{ width: `${analysis.indices.distribution.green_intense}%` }} />
                <div className="bg-green-400" style={{ width: `${(analysis.indices.distribution.green_mid ?? 0) + (analysis.indices.distribution.green_light ?? 0)}%` }} />
                <div className="bg-yellow-400" style={{ width: `${analysis.indices.distribution.yellow}%` }} />
                <div className="bg-blue-400" style={{ width: `${analysis.indices.distribution.blue}%` }} />
                <div className="bg-red-400" style={{ width: `${analysis.indices.distribution.red}%` }} />
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                <span><span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" />Sano</span>
                <span><span className="inline-block w-2 h-2 rounded-full bg-yellow-400 mr-1" />Atención</span>
                <span><span className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-1" />Húmedo</span>
                <span><span className="inline-block w-2 h-2 rounded-full bg-red-400 mr-1" />Sin plantas</span>
              </div>
            </div>
          )}
        </div>

        {/* ── QUÉ HACER ESTA SEMANA ── */}
        {analysis?.geminiAnalysis && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="font-semibold text-gray-800 mb-3">Qué hacer esta semana</p>
            <div className="space-y-2.5">
              {(analysis.geminiAnalysis.recomendaciones_generales ?? []).slice(0, 3).map((rec, i) => (
                <div key={i} className="flex items-start gap-3 text-sm text-gray-700">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold mt-0.5">
                    {i + 1}
                  </span>
                  <span>{rec}</span>
                </div>
              ))}
              {analysis.geminiAnalysis.urgencia && analysis.geminiAnalysis.urgencia !== "sin_urgencia" && (
                <div className={`mt-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                  analysis.geminiAnalysis.urgencia === "inmediata" ? "bg-red-50 text-red-700 border border-red-200" :
                  analysis.geminiAnalysis.urgencia === "esta_semana" ? "bg-yellow-50 text-yellow-700 border border-yellow-200" :
                  "bg-blue-50 text-blue-700 border border-blue-200"
                }`}>
                  {analysis.geminiAnalysis.urgencia === "inmediata" ? "⚠️ Urgente — atender hoy" :
                   analysis.geminiAnalysis.urgencia === "esta_semana" ? "📅 Esta semana" : "📋 Este mes"}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── MÁS DETALLES DEL ANÁLISIS ── */}
        {analysis?.geminiAnalysis && (
          <details className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <summary className="px-4 py-4 cursor-pointer font-semibold text-gray-700 text-sm flex items-center justify-between select-none hover:bg-gray-50">
              <span>Ver análisis completo</span>
              <span className="text-gray-400 text-xs">Abrir</span>
            </summary>
            <div className="px-4 pb-4">
              <StatusCard analysis={analysis.geminiAnalysis} indices={analysis.indices} />
            </div>
          </details>
        )}

        {/* ── ALERTAS ── */}
        {weather && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="font-semibold text-gray-800 mb-3">Alertas para tu lote</p>
            <div className="space-y-2">
              <div className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm ${
                weather.frostRisk ? "bg-red-50 text-red-700 border border-red-200 font-medium" : "bg-gray-50 text-gray-400"
              }`}>
                <span className="text-xl shrink-0">🌡️</span>
                <span>{weather.frostRisk ? `Helada posible esta noche — temperatura mínima ${weather.frostAlert?.minTemp ?? ""}°C` : "Sin riesgo de helada"}</span>
              </div>
              <div className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm ${
                weather.fungalRisk ? "bg-orange-50 text-orange-700 border border-orange-200 font-medium" : "bg-gray-50 text-gray-400"
              }`}>
                <span className="text-xl shrink-0">🍄</span>
                <span>{weather.fungalRisk ? "Cuidado con hongos — llovió hace poco" : "Sin riesgo de hongos"}</span>
              </div>
              {weather.hailRisk && weather.hailAlert && (
                <div className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm bg-purple-50 text-purple-700 border border-purple-200 font-medium">
                  <span className="text-xl shrink-0">⛈️</span>
                  <span>Riesgo de granizo el {weather.hailAlert.date}</span>
                </div>
              )}
              {weather.intenseRainRisk && (
                <div className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
                  <span className="text-xl shrink-0">🌧️</span>
                  <span>Lluvia intensa prevista el {weather.intenseRainDays[0]}</span>
                </div>
              )}
              {weather.tempDrops.length > 0 && (
                <div className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm bg-yellow-50 text-yellow-700 border border-yellow-200 font-medium">
                  <span className="text-xl shrink-0">⚡</span>
                  <span>Bajón brusco de temperatura el {weather.tempDrops[0]}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── GRÁFICO DE CLIMA ── */}
        {weather && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="font-semibold text-gray-800 mb-3">Temperatura los próximos días</p>
            <WeatherChart
              daily={weather.daily}
              frostAlert={weather.frostAlert}
              waterBalance={weather.summary.waterBalance}
              totalPrecip={weather.summary.totalPrecip}
            />
          </div>
        )}

        {/* ── ALERTAS POR EMAIL ── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <p className="font-semibold text-gray-800">Recibí alertas en tu celular</p>
          <p className="text-sm text-gray-500">
            Avisamos por email cuando hay riesgo de helada, hongos o granizo — hasta 8 horas antes.
          </p>
          <input
            type="email"
            value={alertEmail}
            onChange={(e) => {
              setAlertEmail(e.target.value);
              if (notifyStep === "error") { setNotifyStep("idle"); setNotifyError(null); }
            }}
            placeholder="tu@email.com"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSaveEmailAlerts}
              className="flex-1 bg-green-600 hover:bg-green-500 text-white rounded-xl py-3 text-sm font-semibold transition-colors"
            >
              {alertsEnabled ? "Actualizar email" : "Activar alertas"}
            </button>
            {hasActiveAlerts && (
              <button
                onClick={() => void sendAlertEmail()}
                disabled={!isValidEmail(alertEmail) || notifyStep === "sending"}
                className="px-4 py-3 text-sm rounded-xl border border-gray-300 text-gray-700 disabled:text-gray-400 disabled:border-gray-200 transition-colors"
              >
                {notifyStep === "sending" ? "Enviando..." : "Enviar ahora"}
              </button>
            )}
          </div>
          {alertsEnabled && <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">✓ Alertas activadas para: {alertEmail}</p>}
          {notifyStep === "sent" && <p className="text-xs text-green-700">Email de alerta enviado correctamente.</p>}
          {notifyStep === "error" && notifyError && <p className="text-xs text-red-600">{notifyError}</p>}
        </div>

        {/* ── GUARDAR ESTADO HOY ── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="font-semibold text-gray-800 mb-1">Guardar el estado de hoy</p>
          <p className="text-sm text-gray-500 mb-4">
            Dejá registrado el estado de tu lote con fecha y hora. Sirve como respaldo ante el seguro agrícola.
          </p>

          {certStep === "idle" && (
            <button
              onClick={handleCertify}
              disabled={!analysis}
              className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-xl py-3 text-sm transition-colors"
            >
              Guardar estado del lote
            </button>
          )}

          {certStep === "minting" && (
            <div className="flex items-center justify-center gap-2 py-3 text-sm text-gray-500">
              <svg className="animate-spin h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Guardando...
            </div>
          )}

          {certStep === "success" && certResult && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-600 text-sm font-semibold">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Estado guardado correctamente
              </div>
              <details className="text-xs text-gray-400">
                <summary className="cursor-pointer hover:text-gray-600 select-none">Ver comprobante</summary>
                <div className="mt-2 space-y-1 pl-2 border-l-2 border-gray-100">
                  <div className="flex justify-between"><span>Registro #</span><span className="font-mono">{certResult.tokenId}</span></div>
                  <div className="flex justify-between gap-2"><span className="shrink-0">Hash</span><span className="font-mono truncate">{certResult.txHash.slice(0, 20)}…</span></div>
                  <a href={certResult.explorerUrl} target="_blank" rel="noopener noreferrer" className="block text-green-500 hover:underline pt-1">Ver verificación →</a>
                </div>
              </details>
            </div>
          )}

          {certStep === "error" && (
            <div className="space-y-2">
              <p className="text-xs text-red-500">{certError}</p>
              <button onClick={() => setCertStep("idle")} className="text-xs text-gray-500 hover:text-gray-700 underline">Reintentar</button>
            </div>
          )}
        </div>

        {/* ── COMPARACIÓN TEMPORAL (colapsada) ── */}
        <details className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <summary className="px-4 py-4 cursor-pointer font-semibold text-gray-700 text-sm flex items-center justify-between select-none hover:bg-gray-50">
            <span>Comparar con una fecha anterior</span>
            <span className="text-gray-400 text-xs">Abrir</span>
          </summary>
          <div className="px-4 pb-4 space-y-3">
            <p className="text-xs text-gray-400">Elegí una fecha pasada para ver si tu lote mejoró o empeoró.</p>
            <div className="flex gap-2">
              <input
                type="date"
                value={comparisonDate}
                onChange={(e) => setComparisonDate(e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                max={new Date().toISOString().split("T")[0]}
              />
              <button
                onClick={handleTemporalAnalysis}
                disabled={!comparisonDate || temporalStep === "loading"}
                className="bg-indigo-500 hover:bg-indigo-400 disabled:bg-gray-300 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap"
              >
                {temporalStep === "loading" ? "Comparando..." : "Ver cambios"}
              </button>
            </div>

            {temporalStep === "done" && temporalResult && evolutionConfig && (
              <div className={`rounded-xl border ${evolutionConfig.border} ${evolutionConfig.bg} p-4`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={evolutionConfig.color}>{evolutionConfig.icon}</span>
                  <p className={`text-sm font-bold ${evolutionConfig.color}`}>{evolutionConfig.label}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="text-center">
                    <p className="text-[10px] text-gray-500 mb-1">Antes ({temporalResult.comparison.dateRange.from})</p>
                    <img src={`data:image/png;base64,${temporalResult.comparison.imageBase64}`} alt="Imagen anterior" className="rounded-lg border border-gray-200 w-full aspect-square object-cover" />
                    <p className="text-xs text-gray-500 mt-1">Vigor: {(temporalResult.comparison.indices.ndvi * 100).toFixed(0)}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-gray-500 mb-1">Ahora</p>
                    <img src={`data:image/png;base64,${temporalResult.current.imageBase64}`} alt="Imagen actual" className="rounded-lg border border-gray-200 w-full aspect-square object-cover" />
                    <p className="text-xs text-gray-500 mt-1">Vigor: {(temporalResult.current.indices.ndvi * 100).toFixed(0)}%</p>
                  </div>
                </div>
                <div className="space-y-1.5 text-sm">
                  <p className="text-gray-700"><strong>Cambio:</strong> {temporalResult.evolution.porcentaje_cambio_ndvi > 0 ? "+" : ""}{temporalResult.evolution.porcentaje_cambio_ndvi}% en vigor</p>
                  <p className="text-gray-700"><strong>Tendencia:</strong> {temporalResult.evolution.tendencia}</p>
                  <p className="text-gray-700"><strong>Causa probable:</strong> {temporalResult.evolution.posible_causa}</p>
                  {temporalResult.evolution.recomendaciones.length > 0 && (
                    <ul className="text-xs text-gray-600 mt-2 space-y-0.5">
                      {temporalResult.evolution.recomendaciones.map((r, i) => <li key={i}>→ {r}</li>)}
                    </ul>
                  )}
                </div>
              </div>
            )}
            {temporalStep === "error" && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{temporalError}</p>
            )}
          </div>
        </details>

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
