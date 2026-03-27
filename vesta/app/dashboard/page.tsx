"use client";

import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import AlertBanner from "@/components/AlertBanner";
import StatusCard from "@/components/StatusCard";
import WeatherChart from "@/components/WeatherChart";
import WalletButton, { WalletState } from "@/components/WalletButton";
import type { GeminiAnalysis, GeminiTemporalAnalysis } from "@/lib/gemini";
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

  const [step, setStep] = useState<Step>("idle");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [weather, setWeather] = useState<WeatherResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [certStep, setCertStep] = useState<CertifyStep>("idle");
  const [certResult, setCertResult] = useState<CertifyResult | null>(null);
  const [certError, setCertError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [selectedChain, setSelectedChain] = useState<"bnb" | "rsk">("bnb");
  const [signingMode, setSigningMode] = useState<"server" | "wallet">("server");

  // Temporal analysis state
  const [temporalStep, setTemporalStep] = useState<TemporalStep>("idle");
  const [temporalResult, setTemporalResult] = useState<TemporalResult | null>(null);
  const [temporalError, setTemporalError] = useState<string | null>(null);
  const [comparisonDate, setComparisonDate] = useState<string>("");

  useEffect(() => {
    if (!bbox) return;

    const run = async () => {
      try {
        setStep("analyzing");

        // Single API call — satellite + weather + Gemini (combined)
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

        setStep("done");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
        setStep("error");
      }
    };

    run();
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
    if (signingMode === "wallet" && !wallet) {
      setCertError("Conectá tu wallet primero.");
      return;
    }
    setCertStep("minting");
    setCertError(null);
    try {
      const lat = bbox ? (bbox[1] + bbox[3]) / 2 : 0;
      const lon = bbox ? (bbox[0] + bbox[2]) / 2 : 0;
      const mintParams = {
        bodega: "Parcela VESTA",
        coordenadas: `${lat.toFixed(4)},${lon.toFixed(4)}`,
        imageHash: analysis.imageHash,
        ndvi: analysis.indices.ndvi,
        ndre: analysis.indices.ndre,
        ndwi: analysis.indices.ndwi,
        climateEvent: weather?.frostRisk ? "helada_detectada" : "",
      };

      if (signingMode === "wallet" && wallet) {
        const { mintWithWallet } = await import("@/lib/blockchain/clientSign");
        const data = await mintWithWallet(wallet.provider, selectedChain, mintParams);
        setCertResult(data);
      } else {
        const res = await fetch("/api/certify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chain: selectedChain,
            ...mintParams,
            walletAddress: wallet?.address ?? "",
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Error al mintear");
        setCertResult(data);
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
            onClick={() => router.push("/")}
            className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm"
          >
            Volver al mapa
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (step === "analyzing") {
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
          <p className="text-gray-400 text-sm">Descargando imagen satelital, datos climáticos y ejecutando análisis IA...</p>
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

  // Temporal analysis evolution config
  const evolutionConfig = temporalResult?.evolution ? {
    mejora: { icon: "📈", color: "text-green-600", bg: "bg-green-50", border: "border-green-200", label: "Mejora detectada" },
    estable: { icon: "➡️", color: "text-gray-600", bg: "bg-gray-50", border: "border-gray-200", label: "Sin cambios significativos" },
    deterioro: { icon: "📉", color: "text-red-600", bg: "bg-red-50", border: "border-red-200", label: "Deterioro detectado" },
  }[temporalResult.evolution.cambio_general] : null;

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
      <header className="bg-gray-950 border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            ←
          </button>
          <div className="w-7 h-7 bg-green-500 rounded-md flex items-center justify-center text-sm">
            🛰️
          </div>
          <span className="font-bold text-white">VESTA</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-600 hidden sm:block">
            {analysis?.timestamp
              ? new Date(analysis.timestamp).toLocaleString("es-AR")
              : ""}
          </span>
          <WalletButton wallet={wallet} onConnect={setWallet} />
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

          {/* Pixel distribution */}
          {analysis?.indices?.distribution && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Distribución de cobertura
              </p>
              <div className="space-y-2">
                {[
                  { key: "green_intense", label: "Vegetación sana", color: "bg-green-600", value: analysis.indices.distribution.green_intense },
                  { key: "green_mid", label: "Vegetación media", color: "bg-green-400", value: analysis.indices.distribution.green_mid },
                  { key: "green_light", label: "Vegetación baja", color: "bg-green-300", value: analysis.indices.distribution.green_light },
                  { key: "yellow", label: "Vigor bajo", color: "bg-yellow-400", value: analysis.indices.distribution.yellow },
                  { key: "blue", label: "Humedad alta", color: "bg-blue-500", value: analysis.indices.distribution.blue },
                  { key: "red", label: "Sin vegetación", color: "bg-red-500", value: analysis.indices.distribution.red },
                ].map((item) => (
                  <div key={item.key} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-sm ${item.color} shrink-0`} />
                    <span className="text-xs text-gray-600 flex-1">{item.label}</span>
                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.color} rounded-full transition-all`}
                        style={{ width: `${Math.min(item.value, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-8 text-right">{item.value}%</span>
                  </div>
                ))}
              </div>
              {analysis.indices.totalVegetationPercent !== undefined && (
                <p className="text-xs text-gray-400 mt-3 pt-2 border-t border-gray-100">
                  Total vegetación: <strong className="text-green-600">{analysis.indices.totalVegetationPercent}%</strong>
                </p>
              )}
            </div>
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

          {/* Temporal comparison trigger */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              📅 Comparar con fecha anterior
            </p>
            <div className="flex gap-2 mb-2">
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
                className="bg-indigo-500 hover:bg-indigo-400 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {temporalStep === "loading" ? "Analizando..." : "Comparar"}
              </button>
            </div>
            <p className="text-xs text-gray-400">
              Seleccioná una fecha para comparar la evolución del viñedo con la imagen actual.
            </p>
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

          {/* Certify — chain selector */}
          <div className="bg-gray-900 rounded-xl border border-white/10 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Certificar on-chain
            </p>

            {/* Chain selector */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {(["bnb", "rsk"] as const).map((chain) => {
                const cfg = {
                  bnb: { label: "BNB Chain", icon: "🟡", sub: "BSC Testnet" },
                  rsk: { label: "Rootstock", icon: "🟠", sub: "RSK Testnet" },
                };
                return (
                  <button
                    key={chain}
                    onClick={() => { setSelectedChain(chain); setCertStep("idle"); }}
                    className={`rounded-lg p-2.5 text-left border transition-all ${
                      selectedChain === chain
                        ? "border-green-500 bg-green-900/20 text-white"
                        : "border-white/10 bg-white/5 text-gray-400 hover:border-white/20"
                    }`}
                  >
                    <div className="text-lg mb-0.5">{cfg[chain].icon}</div>
                    <p className="text-xs font-semibold">{cfg[chain].label}</p>
                    <p className="text-[10px] text-gray-500">{cfg[chain].sub}</p>
                  </button>
                );
              })}
            </div>

            {/* Signing mode selector */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {(["server", "wallet"] as const).map((mode) => {
                const cfg = {
                  server: { label: "⚡ Rápido", sub: "Servidor firma", detail: "Sin wallet · Demo" },
                  wallet: { label: "🔒 Mi Wallet", sub: "Vos firmás", detail: "MetaMask / Beexo" },
                };
                return (
                  <button
                    key={mode}
                    onClick={() => { setSigningMode(mode); setCertStep("idle"); }}
                    className={`rounded-lg p-2.5 text-left border transition-all ${
                      signingMode === mode
                        ? "border-blue-500 bg-blue-900/20 text-white"
                        : "border-white/10 bg-white/5 text-gray-400 hover:border-white/20"
                    }`}
                  >
                    <p className="text-xs font-semibold">{cfg[mode].label}</p>
                    <p className="text-[10px] text-gray-400">{cfg[mode].sub}</p>
                    <p className="text-[10px] text-gray-600">{cfg[mode].detail}</p>
                  </button>
                );
              })}
            </div>

            {/* Wallet required warning */}
            {signingMode === "wallet" && !wallet && (
              <div className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-700/30 rounded-lg px-3 py-2 mb-3">
                <span>⚠️</span>
                <span>Conectá tu wallet con el botón del header</span>
              </div>
            )}
            {signingMode === "wallet" && wallet && (
              <div className="flex items-center gap-2 text-xs text-green-400 bg-green-900/20 border border-green-700/30 rounded-lg px-3 py-2 mb-3">
                <span>✓</span>
                <span>{wallet.address.slice(0, 8)}… conectada vía {wallet.via === "beexo" ? "Beexo" : "MetaMask"}</span>
              </div>
            )}

            {/* Hash preview */}
            <div className="flex justify-between text-xs mb-3">
              <span className="text-gray-500">Hash imagen</span>
              <span className="text-gray-400 font-mono truncate max-w-[140px]">
                {analysis?.imageHash?.slice(0, 14)}...
              </span>
            </div>

            {certStep === "idle" && (
              <button
                onClick={handleCertify}
                disabled={!analysis}
                className="w-full bg-green-500 hover:bg-green-400 disabled:bg-green-900 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
              >
                Mintear NFT en {selectedChain === "bnb" ? "BNB Chain" : "Rootstock"} →
              </button>
            )}

            {certStep === "minting" && (
              <div className="flex items-center justify-center gap-2 py-2.5 text-sm text-gray-400">
                <svg className="animate-spin h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {signingMode === "wallet"
                  ? "Esperando firma en tu wallet..."
                  : `Minteando en ${selectedChain === "bnb" ? "BSC Testnet" : "RSK Testnet"}...`}
              </div>
            )}

            {certStep === "success" && certResult && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                  <span>✓</span> Token #{certResult.tokenId} minteado
                </div>
                <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-2.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Tx Hash</span>
                    <span className="font-mono text-gray-300 truncate max-w-[150px]">
                      {certResult.txHash.slice(0, 18)}...
                    </span>
                  </div>
                </div>
                <a
                  href={certResult.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center text-xs text-green-400 hover:underline"
                >
                  Ver en explorer →
                </a>
                <a
                  href={`/bottle/${certResult.tokenId}`}
                  className="block text-center text-xs text-blue-400 hover:underline"
                >
                  Ver pasaporte de la botella →
                </a>
              </div>
            )}

            {certStep === "error" && (
              <div className="space-y-2">
                <p className="text-xs text-red-400">{certError}</p>
                <button
                  onClick={() => setCertStep("idle")}
                  className="text-xs text-gray-500 hover:text-gray-300"
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
