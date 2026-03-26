"use client";

import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import AlertBanner from "@/components/AlertBanner";
import StatusCard from "@/components/StatusCard";
import WeatherChart from "@/components/WeatherChart";
import type { GeminiAnalysis } from "@/lib/gemini";
import type { WeatherResult } from "@/lib/weather";

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
  indices: { ndvi: number; ndre: number; ndwi: number };
  geminiAnalysis: GeminiAnalysis;
  timestamp: string;
  bbox: number[];
}

type Step = "idle" | "satellite" | "weather" | "done" | "error";

interface CertifyResult {
  txHash: string;
  tokenId: string;
  explorerUrl: string;
}

type CertifyStep = "idle" | "minting" | "success" | "error";

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const bboxParam = searchParams.get("bbox");
  const bbox = bboxParam
    ? (bboxParam.split(",").map(Number) as [number, number, number, number])
    : null;

  const [step, setStep] = useState<Step>("idle");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [weather, setWeather] = useState<WeatherResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [certStep, setCertStep] = useState<CertifyStep>("idle");
  const [certResult, setCertResult] = useState<CertifyResult | null>(null);
  const [certError, setCertError] = useState<string | null>(null);

  useEffect(() => {
    if (!bbox) return;

    const run = async () => {
      try {
        setStep("satellite");

        // 1. Satellite analysis
        const analyzeRes = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bbox }),
        });
        if (!analyzeRes.ok) {
          const err = await analyzeRes.json();
          throw new Error(err.error || "Error en análisis satelital");
        }
        const analysisData: AnalysisResult = await analyzeRes.json();
        setAnalysis(analysisData);

        setStep("weather");

        // 2. Weather (center of bbox)
        const lat = (bbox[1] + bbox[3]) / 2;
        const lon = (bbox[0] + bbox[2]) / 2;
        const weatherRes = await fetch("/api/weather", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat, lon }),
        });
        if (!weatherRes.ok) {
          const err = await weatherRes.json();
          throw new Error(err.error || "Error en datos climáticos");
        }
        const weatherData: WeatherResult = await weatherRes.json();
        setWeather(weatherData);

        setStep("done");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
        setStep("error");
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bboxParam]);

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
      if (!res.ok) throw new Error(data.error ?? "Error al mintear");
      setCertResult(data);
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
            onClick={() => router.push("/")}
            className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm"
          >
            Volver al mapa
          </button>
        </div>
      </div>
    );
  }

  // Loading states
  if (step !== "done" && step !== "error") {
    const steps = [
      { key: "satellite", label: "Descargando imagen Sentinel-2..." },
      { key: "weather", label: "Obteniendo datos climáticos..." },
    ];
    const currentIdx = steps.findIndex((s) => s.key === step);

    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-green-900/40 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="animate-spin h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <p className="text-white font-semibold mb-2">Analizando tu parcela</p>
          <div className="space-y-2 mt-4">
            {steps.map((s, i) => (
              <div
                key={s.key}
                className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg ${
                  i < currentIdx
                    ? "text-green-400 bg-green-900/20"
                    : i === currentIdx
                    ? "text-white bg-white/10"
                    : "text-gray-600"
                }`}
              >
                {i < currentIdx ? "✓" : i === currentIdx ? "⟳" : "○"}
                <span>{s.label}</span>
              </div>
            ))}
          </div>
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
            onClick={() => router.push("/")}
            className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm"
          >
            Volver al mapa
          </button>
        </div>
      </div>
    );
  }

  const frostAlert = weather?.frostAlert;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Frost alert banner — full width, top */}
      {frostAlert && (
        <AlertBanner
          minTemp={frostAlert.minTemp}
          hoursUntil={frostAlert.hoursUntil}
          date={frostAlert.date}
        />
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ←
          </button>
          <div className="w-7 h-7 bg-green-500 rounded-md flex items-center justify-center text-sm">
            🛰️
          </div>
          <span className="font-bold text-gray-900">VESTA</span>
        </div>
        <div className="text-xs text-gray-400">
          {analysis?.timestamp
            ? new Date(analysis.timestamp).toLocaleString("es-AR")
            : ""}
        </div>
      </header>

      {/* Three-column layout */}
      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[40%_35%_25%] gap-5">
        {/* LEFT: Satellite map */}
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Imagen satelital
          </h2>
          {analysis && (
            <SatelliteMap
              imageBase64={analysis.imageBase64}
              bbox={bbox}
            />
          )}
        </div>

        {/* CENTER: Status + recommendations */}
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Estado del viñedo
          </h2>
          {analysis && (
            <StatusCard
              analysis={analysis.geminiAnalysis}
              indices={analysis.indices}
            />
          )}

          {/* Certify on BNB */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center text-xs font-bold text-yellow-900">B</div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Certificar en BNB Chain
              </p>
            </div>

            <div className="space-y-1 mb-3">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Hash imagen</span>
                <span className="text-gray-600 font-mono truncate max-w-[160px]">
                  {analysis?.imageHash?.slice(0, 16)}...
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Red</span>
                <span className="text-gray-600">BSC Testnet</span>
              </div>
            </div>

            {certStep === "idle" && (
              <button
                onClick={handleCertify}
                disabled={!analysis}
                className="w-full bg-yellow-400 hover:bg-yellow-300 text-yellow-900 font-semibold rounded-lg py-2.5 text-sm transition-colors disabled:opacity-40"
              >
                Mintear NFT certificado →
              </button>
            )}

            {certStep === "minting" && (
              <div className="flex items-center justify-center gap-2 py-2.5 text-sm text-gray-500">
                <svg className="animate-spin h-4 w-4 text-yellow-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Minteando en BSC Testnet...
              </div>
            )}

            {certStep === "success" && certResult && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                  <span>✓</span> NFT minteado — Token #{certResult.tokenId}
                </div>
                <div className="bg-green-50 rounded-lg p-2.5 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Tx Hash</span>
                    <span className="font-mono text-gray-600 truncate max-w-[150px]">
                      {certResult.txHash.slice(0, 18)}...
                    </span>
                  </div>
                </div>
                <a
                  href={certResult.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center text-xs text-yellow-600 hover:underline"
                >
                  Ver en BSCScan →
                </a>
              </div>
            )}

            {certStep === "error" && (
              <div className="space-y-2">
                <p className="text-xs text-red-500">{certError}</p>
                <button
                  onClick={() => setCertStep("idle")}
                  className="text-xs text-gray-400 hover:text-gray-600"
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
            Clima (21 días)
          </h2>
          {weather && (
            <WeatherChart
              daily={weather.daily}
              frostAlert={weather.frostAlert}
              waterBalance={weather.summary.waterBalance}
              totalPrecip={weather.summary.totalPrecip}
            />
          )}

          {/* Weather risks */}
          {weather && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Alertas activas
              </p>
              <div
                className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
                  weather.frostRisk
                    ? "bg-red-50 text-red-700"
                    : "bg-gray-50 text-gray-400"
                }`}
              >
                <span>🌡️</span>
                <span>
                  {weather.frostRisk ? "Riesgo de helada detectado" : "Sin riesgo de helada"}
                </span>
              </div>
              <div
                className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
                  weather.fungalRisk
                    ? "bg-orange-50 text-orange-700"
                    : "bg-gray-50 text-gray-400"
                }`}
              >
                <span>🍄</span>
                <span>
                  {weather.fungalRisk
                    ? "Riesgo fúngico (lluvia reciente)"
                    : "Sin riesgo fúngico"}
                </span>
              </div>
              {weather.tempDrops.length > 0 && (
                <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-yellow-50 text-yellow-700">
                  <span>⚡</span>
                  <span>
                    Shock térmico el{" "}
                    {weather.tempDrops[0]}
                  </span>
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
