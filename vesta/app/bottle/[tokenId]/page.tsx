"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";

interface TokenData {
  tokenId: string;
  bodega: string;
  coordenadas: string;
  timestamp: number;
  imageHash: string;
  ndvi: number;
  ndre: number;
  ndwi: number;
  climateEvent: string;
  isLimitedEdition: boolean;
}

function getYear(timestamp: number) {
  return new Date(timestamp * 1000).getFullYear() || 2026;
}

function formatHash(hash: string) {
  if (!hash || hash.length < 12) return hash;
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

// ─── VISTA ESTÁTICA para partidas sin token blockchain ───────────────────────
function BottlePassportStatic({ tokenId }: { tokenId: string }) {
  const searchParams = useSearchParams();

  const vino = searchParams.get("vino") || "Vino Certificado";
  const cosecha = searchParams.get("cosecha") || "2026";
  const varietal = searchParams.get("varietal") || "Malbec";
  const bodega = searchParams.get("bodega") || "Bodega Certificada";
  const coords = searchParams.get("coords") || "-33.6650,-69.2350";
  const ndvi = parseFloat(searchParams.get("ndvi") || "0.65");
  const ndre = parseFloat(searchParams.get("ndre") || "0.42");
  const ndwi = parseFloat(searchParams.get("ndwi") || "0.18");
  const evento = searchParams.get("evento") || "";
  const txHash = searchParams.get("txHash") || "";
  const tokenIdBSC = searchParams.get("tokenId") || "";

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-10">
      {/* HERO */}
      <div className="relative bg-gradient-to-b from-green-900 to-gray-950 px-6 pt-12 pb-10 text-center">
        {evento && (
          <div className="inline-flex items-center gap-1.5 bg-red-600/80 text-red-100 text-xs font-semibold px-3 py-1 rounded-full mb-4">
            ❄️ Edición Limitada — Cosecha Histórica
          </div>
        )}
        <div className="w-24 h-24 bg-green-800 rounded-full flex items-center justify-center text-5xl mx-auto mb-4 shadow-lg shadow-green-900/50">
          🍇
        </div>
        <h1 className="text-2xl font-bold leading-tight">{bodega}</h1>
        <p className="text-green-400 mt-1 text-sm">
          {varietal || "Malbec"} · Cosecha {cosecha}
        </p>
        <p className="text-gray-500 text-xs mt-1">{vino} · Verificado por VESTA</p>
      </div>

      <div className="max-w-md mx-auto px-4 space-y-4 mt-2">

        {/* SELLO BODEGA CERTIFICADA */}
        <div className="bg-green-900/40 border border-green-700/50 rounded-2xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-base">✓</div>
            <p className="text-lg font-bold text-green-300">Bodega Certificada</p>
          </div>
          <p className="text-sm text-green-200">
            Esta partida proviene de un viñedo verificado satelitalmente por VESTA.
            El origen, la salud vegetal y las condiciones climáticas fueron auditadas con IA agronómica.
          </p>
          <div className="mt-3 bg-green-900/40 rounded-lg px-3 py-2 text-xs text-green-300 font-mono">
            Certificado VESTA · Satellite + IA + Blockchain
          </div>
        </div>

        {/* EVENTO CLIMÁTICO */}
        {evento && (
          <div className="bg-red-900/40 border border-red-700/50 rounded-2xl p-4 text-center">
            <p className="text-lg font-bold text-red-300">❄️ Cosecha Histórica</p>
            <p className="text-sm text-red-200 mt-1">
              Esta botella fue certificada durante un evento climático excepcional
            </p>
            <div className="mt-3 bg-red-900/40 rounded-lg px-3 py-2 text-xs text-red-300 font-mono">
              {evento}
            </div>
          </div>
        )}

        {/* MAPA / ORIGEN */}
        <div className="bg-gray-900 rounded-2xl p-4">
          <div className="bg-green-900/30 border border-green-800/40 rounded-xl h-36 flex items-center justify-center mb-3">
            <div className="text-center">
              <span className="text-4xl">🗺️</span>
              <p className="text-xs text-gray-400 mt-2">{coords}</p>
              <p className="text-xs text-gray-500 mt-1">Valle de Uco · Mendoza</p>
            </div>
          </div>
          <p className="text-sm text-gray-300 text-center leading-snug">
            Las uvas de esta botella crecieron aquí.
            <br />
            <span className="text-green-400">El satélite confirmó vegetación sana.</span>
          </p>
        </div>

        {/* DATOS CLIMÁTICOS */}
        <div className="bg-gray-900 rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Datos de la temporada
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: "🌡️", label: "Temp. media", value: "24°C / 11°C" },
              { icon: "🌧️", label: "Precipit.", value: "11.9 mm" },
              { icon: "☀️", label: "Días de sol", value: "28 días" },
            ].map((item) => (
              <div key={item.label} className="bg-gray-800 rounded-xl p-3 text-center">
                <div className="text-2xl mb-1">{item.icon}</div>
                <p className="text-xs text-white font-semibold">{item.value}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* SALUD DEL VIÑEDO */}
        <div className="bg-gray-900 rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Salud del viñedo al momento de la certificación
          </p>
          <div className="space-y-2">
            {[
              { label: "Vigor vegetativo", value: ndvi, color: "bg-green-500" },
              { label: "Salud de la planta", value: ndre, color: "bg-emerald-500" },
              { label: "Humedad foliar", value: ndwi, color: "bg-blue-500" },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">{item.label}</span>
                  <span className="text-white font-medium">
                    {(item.value * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full`}
                    style={{ width: `${Math.min(item.value * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CERTIFICADO BLOCKCHAIN DE LA BODEGA */}
        <div className="bg-gray-900 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-lg shrink-0">✓</div>
            <div>
              <p className="text-sm font-semibold text-green-400">Bodega verificada on-chain</p>
              <p className="text-xs text-gray-500">BNB Chain (BSC Testnet)</p>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-3 space-y-1.5 text-xs">
            {tokenIdBSC && (
              <div className="flex justify-between">
                <span className="text-gray-400">Token ID bodega</span>
                <span className="text-white font-mono">#{tokenIdBSC}</span>
              </div>
            )}
            {txHash && (
              <div className="flex justify-between">
                <span className="text-gray-400">Tx Hash</span>
                <span className="text-gray-300 font-mono">{formatHash(txHash)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-400">Red</span>
              <span className="text-gray-300">BSC Testnet</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Partida</span>
              <span className="text-gray-300 font-mono text-[10px] truncate max-w-[160px]">{tokenId}</span>
            </div>
          </div>
          {tokenIdBSC && (
            <a
              href={`https://testnet.bscscan.com/token/${process.env.NEXT_PUBLIC_CONTRACT_BSC}?a=${tokenIdBSC}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-xs text-yellow-400 hover:text-yellow-300 mt-3"
            >
              Ver contrato de la bodega en BSCScan →
            </a>
          )}
        </div>

        {/* CTA */}
        <div className="space-y-2 pt-2">
          <button className="w-full bg-green-500 hover:bg-green-400 text-white font-semibold rounded-xl py-3 text-sm transition-colors">
            Agregar a mi colección
          </button>
          <button className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-xl py-3 text-sm transition-colors">
            Compartir este vino
          </button>
        </div>

        {/* FOOTER */}
        <div className="text-center pt-4">
          <p className="text-xs text-gray-600">
            Certificado por{" "}
            <span className="text-green-500 font-semibold">VESTA</span> · Satellite + IA + Blockchain
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── VISTA BLOCKCHAIN para tokens reales ─────────────────────────────────────
function BottlePassportBlockchain({ tokenId }: { tokenId: string }) {
  const [token, setToken] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/collection?tokenId=${tokenId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setToken(data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [tokenId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Cargando pasaporte...</p>
        </div>
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-red-400 text-sm mb-2">No se pudo cargar el token #{tokenId}</p>
          <p className="text-gray-500 text-xs">{error}</p>
        </div>
      </div>
    );
  }

  const year = getYear(token.timestamp);
  const explorerUrl = `https://testnet.bscscan.com/token/${process.env.NEXT_PUBLIC_CONTRACT_BSC}?a=${tokenId}`;

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-10">
      <div className="relative bg-gradient-to-b from-green-900 to-gray-950 px-6 pt-12 pb-10 text-center">
        {token.isLimitedEdition && (
          <div className="inline-flex items-center gap-1.5 bg-red-600/80 text-red-100 text-xs font-semibold px-3 py-1 rounded-full mb-4">
            ❄️ Edición Limitada — Cosecha Histórica
          </div>
        )}
        <div className="w-24 h-24 bg-green-800 rounded-full flex items-center justify-center text-5xl mx-auto mb-4 shadow-lg shadow-green-900/50">
          🍇
        </div>
        <h1 className="text-2xl font-bold leading-tight">{token.bodega}</h1>
        <p className="text-green-400 mt-1 text-sm">Malbec · Cosecha {year}</p>
        <p className="text-gray-500 text-xs mt-1">Token #{token.tokenId} · BSC Testnet</p>
      </div>

      <div className="max-w-md mx-auto px-4 space-y-4 mt-2">
        {token.isLimitedEdition && token.climateEvent && (
          <div className="bg-red-900/40 border border-red-700/50 rounded-2xl p-4 text-center">
            <p className="text-lg font-bold text-red-300">❄️ Cosecha Histórica</p>
            <p className="text-sm text-red-200 mt-1">Esta botella fue certificada durante un evento climático excepcional</p>
            <div className="mt-3 bg-red-900/40 rounded-lg px-3 py-2 text-xs text-red-300 font-mono">{token.climateEvent}</div>
            <p className="text-xs text-red-400 mt-2">Solo los viñedos monitoreados por satélite en ese momento tienen este sello.</p>
          </div>
        )}
        <div className="bg-gray-900 rounded-2xl p-4">
          <div className="bg-green-900/30 border border-green-800/40 rounded-xl h-36 flex items-center justify-center mb-3">
            <div className="text-center">
              <span className="text-4xl">🗺️</span>
              <p className="text-xs text-gray-400 mt-2">{token.coordenadas}</p>
            </div>
          </div>
          <p className="text-sm text-gray-300 text-center leading-snug">
            Las uvas de esta botella crecieron aquí.<br />
            <span className="text-green-400">El satélite confirmó vegetación sana.</span>
          </p>
        </div>
        <div className="bg-gray-900 rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Datos de la temporada</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: "🌡️", label: "Temp. media", value: "24°C / 11°C" },
              { icon: "🌧️", label: "Precipit.", value: "11.9 mm" },
              { icon: "☀️", label: "Días de sol", value: "28 días" },
            ].map((item) => (
              <div key={item.label} className="bg-gray-800 rounded-xl p-3 text-center">
                <div className="text-2xl mb-1">{item.icon}</div>
                <p className="text-xs text-white font-semibold">{item.value}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-gray-900 rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Salud del viñedo</p>
          <div className="space-y-2">
            {[
              { label: "Vigor vegetativo", value: token.ndvi, color: "bg-green-500" },
              { label: "Salud de la planta", value: token.ndre, color: "bg-emerald-500" },
              { label: "Humedad foliar", value: token.ndwi, color: "bg-blue-500" },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">{item.label}</span>
                  <span className="text-white font-medium">{(item.value * 100).toFixed(0)}%</span>
                </div>
                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full`} style={{ width: `${Math.min(item.value * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-gray-900 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-lg shrink-0">✓</div>
            <div>
              <p className="text-sm font-semibold text-green-400">Verificado on-chain</p>
              <p className="text-xs text-gray-500">BNB Chain (BSC Testnet)</p>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-3 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Token ID</span>
              <span className="text-white font-mono">#{token.tokenId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Image hash</span>
              <span className="text-gray-300 font-mono">{formatHash(token.imageHash)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Certificado</span>
              <span className="text-gray-300">{token.timestamp ? new Date(token.timestamp * 1000).toLocaleDateString("es-AR") : "-"}</span>
            </div>
          </div>
          <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="block text-center text-xs text-yellow-400 hover:text-yellow-300 mt-3">
            Ver en BSCScan →
          </a>
        </div>
        <div className="space-y-2 pt-2">
          <button className="w-full bg-green-500 hover:bg-green-400 text-white font-semibold rounded-xl py-3 text-sm transition-colors">Agregar a mi colección</button>
          <button className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-xl py-3 text-sm transition-colors">Compartir este vino</button>
        </div>
        <div className="text-center pt-4">
          <p className="text-xs text-gray-600">Certificado por <span className="text-green-500 font-semibold">VESTA</span> · Satellite + IA + Blockchain</p>
        </div>
      </div>
    </div>
  );
}

// ─── ROUTER PRINCIPAL ─────────────────────────────────────────────────────────
function BottlePassportContent() {
  const params = useParams();
  const tokenId = params?.tokenId as string;
  const isBlockchainToken = /^\d+$/.test(tokenId);

  if (!isBlockchainToken) {
    return <BottlePassportStatic tokenId={tokenId} />;
  }
  return <BottlePassportBlockchain tokenId={tokenId} />;
}

export default function BottlePassportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <BottlePassportContent />
    </Suspense>
  );
}

