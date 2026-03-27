"use client";

import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef, Suspense } from "react";
import QRCode from "qrcode";
import AlertBanner from "@/components/AlertBanner";
import StatusCard from "@/components/StatusCard";
import WeatherChart from "@/components/WeatherChart";
import WalletButton, { WalletState } from "@/components/WalletButton";
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
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [selectedChain, setSelectedChain] = useState<"bnb" | "rsk">("bnb");
  const [signingMode, setSigningMode] = useState<"server" | "wallet">("server");

  // Partida de vinos
  const [nombreVino, setNombreVino] = useState("");
  const [fechaCosecha, setFechaCosecha] = useState("");
  const [varietal, setVarietal] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [partidaUrl, setPartidaUrl] = useState<string | null>(null);
  const qrImgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!bbox) return;

    const run = async () => {
      try {
        setStep("satellite");

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

  const handleGenerarQR = async () => {
    const id = certResult?.tokenId ?? `partida-${Date.now()}`;

    const params = new URLSearchParams({
      vino: nombreVino,
      cosecha: fechaCosecha,
      varietal: varietal,
      bodega: "Parcela VESTA",
      coords: bbox
        ? `${((bbox[1] + bbox[3]) / 2).toFixed(4)},${((bbox[0] + bbox[2]) / 2).toFixed(4)}`
        : "-33.6650,-69.2350",
      ndvi: String(analysis?.indices.ndvi ?? 0.65),
      ndre: String(analysis?.indices.ndre ?? 0.42),
      ndwi: String(analysis?.indices.ndwi ?? 0.18),
      evento: weather?.frostRisk ? "helada_detectada" : "",
      txHash: certResult?.txHash ?? "",
      tokenId: certResult?.tokenId ?? "",
    });

    const url = `https://vendimiatech-gamma.vercel.app/bottle/${id}?${params.toString()}`;
    setPartidaUrl(url);
    const dataUrl = await QRCode.toDataURL(url, { width: 200, margin: 2 });
    setQrDataUrl(dataUrl);
  };

  const handleCopiarLink = () => {
    if (partidaUrl) navigator.clipboard.writeText(partidaUrl);
  };

  const handleDescargarQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `qr-partida-${nombreVino || "vino"}.png`;
    a.click();
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
            {analysis?.timestamp ? new Date(analysis.timestamp).toLocaleString("es-AR") : ""}
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
          {analysis && <SatelliteMap imageBase64={analysis.imageBase64} bbox={bbox} />}
        </div>

        {/* CENTER: Status + QR + Certify */}
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Estado del viñedo
          </h2>
          {analysis && (
            <StatusCard analysis={analysis.geminiAnalysis} indices={analysis.indices} />
          )}

          {/* ─── CREAR PARTIDA DE VINOS ─── */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Crear partida de vinos
            </p>

            <div className="space-y-2 mb-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Nombre del vino</label>
                <input
                  type="text"
                  placeholder="ej: Malbec Reserva"
                  value={nombreVino}
                  onChange={(e) => setNombreVino(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-green-400"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Año de cosecha</label>
                <input
                  type="number"
                  placeholder="ej: 2026"
                  min="1990"
                  max="2099"
                  value={fechaCosecha}
                  onChange={(e) => setFechaCosecha(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-green-400"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Varietal (opcional)</label>
                <input
                  type="text"
                  placeholder="ej: Malbec 100%"
                  value={varietal}
                  onChange={(e) => setVarietal(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-green-400"
                />
              </div>
            </div>

            <button
              onClick={handleGenerarQR}
              disabled={!nombreVino}
              className="w-full bg-green-500 hover:bg-green-400 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors disabled:opacity-40"
            >
              Generar QR de partida
            </button>

            {qrDataUrl && partidaUrl && (
              <div className="mt-4 space-y-3">
                <div className="flex justify-center">
                  <img ref={qrImgRef} src={qrDataUrl} alt="QR partida" className="rounded-lg border border-gray-100" />
                </div>
                <div className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-400 mb-1">Link del pasaporte</p>
                  <p className="text-xs font-mono text-gray-700 break-all">{partidaUrl}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopiarLink}
                    className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg py-2 text-xs font-medium transition-colors"
                  >
                    Copiar link
                  </button>
                  <button
                    onClick={handleDescargarQR}
                    className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg py-2 text-xs font-medium transition-colors"
                  >
                    Descargar QR
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ─── CERTIFICAR ON-CHAIN ─── */}
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
                <a href={certResult.explorerUrl} target="_blank" rel="noopener noreferrer"
                  className="block text-center text-xs text-green-400 hover:underline">
                  Ver en explorer →
                </a>
                <a href={`/bottle/${certResult.tokenId}`}
                  className="block text-center text-xs text-blue-400 hover:underline">
                  Ver pasaporte de la botella →
                </a>
              </div>
            )}

            {certStep === "error" && (
              <div className="space-y-2">
                <p className="text-xs text-red-400">{certError}</p>
                <button onClick={() => setCertStep("idle")} className="text-xs text-gray-500 hover:text-gray-300">
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

          {weather && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Alertas activas
              </p>
              <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
                weather.frostRisk ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-400"
              }`}>
                <span>🌡️</span>
                <span>{weather.frostRisk ? "Riesgo de helada detectado" : "Sin riesgo de helada"}</span>
              </div>
              <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
                weather.fungalRisk ? "bg-orange-50 text-orange-700" : "bg-gray-50 text-gray-400"
              }`}>
                <span>🍄</span>
                <span>{weather.fungalRisk ? "Riesgo fúngico (lluvia reciente)" : "Sin riesgo fúngico"}</span>
              </div>
              {weather.tempDrops.length > 0 && (
                <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-yellow-50 text-yellow-700">
                  <span>⚡</span>
                  <span>Shock térmico el {weather.tempDrops[0]}</span>
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
