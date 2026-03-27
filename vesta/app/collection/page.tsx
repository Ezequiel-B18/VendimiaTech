"use client";

import { useState } from "react";
import Link from "next/link";
import { SproutIcon, MapIcon, WineIcon, TrophyIcon, DiamondIcon, GrapeIcon, SnowflakeIcon, GlobeIcon, VestaLogo } from "@/components/icons";
import React from "react";

interface NFTToken {
  tokenId: string;
  bodega: string;
  coordenadas: string;
  timestamp: number;
  ndvi: number;
  climateEvent: string;
  isLimitedEdition: boolean;
}

const BADGES = [
  {
    id: "iniciado",
    name: "Iniciado del Vino",
    icon: <SproutIcon className="w-7 h-7" />,
    threshold: 1,
    type: "bodegas",
    description: "Tu primer terroir certificado",
    color: "from-green-600 to-green-400",
  },
  {
    id: "explorador",
    name: "Explorador del Valle de Uco",
    icon: <MapIcon className="w-7 h-7" />,
    threshold: 5,
    type: "bodegas",
    description: "5 bodegas distintas en tu colección",
    color: "from-blue-600 to-blue-400",
  },
  {
    id: "sommelier",
    name: "Sommelier Digital",
    icon: <WineIcon className="w-7 h-7" />,
    threshold: 10,
    type: "bodegas",
    description: "10 bodegas distintas — nivel experto",
    color: "from-purple-600 to-purple-400",
  },
  {
    id: "fiel",
    name: "Fiel a la Bodega",
    icon: <TrophyIcon className="w-7 h-7" />,
    threshold: 3,
    type: "same_bodega",
    description: "3 cosechas de la misma bodega",
    color: "from-yellow-600 to-yellow-400",
  },
  {
    id: "elite",
    name: "Coleccionista Élite",
    icon: <DiamondIcon className="w-7 h-7" />,
    threshold: 1,
    type: "top10",
    description: "Top 10 del ranking global",
    color: "from-pink-600 to-pink-400",
  },
];

// Demo tokens for display when no wallet is connected
const DEMO_TOKENS: NFTToken[] = [
  {
    tokenId: "1",
    bodega: "Bodega Monteviejo",
    coordenadas: "-33.6644,-69.2368",
    timestamp: 1742688000,
    ndvi: 0.65,
    climateEvent: "helada_23mar2026",
    isLimitedEdition: true,
  },
  {
    tokenId: "2",
    bodega: "Bodega Achaval Ferrer",
    coordenadas: "-33.05,-68.9",
    timestamp: 1740000000,
    ndvi: 0.58,
    climateEvent: "",
    isLimitedEdition: false,
  },
  {
    tokenId: "3",
    bodega: "Zuccardi Valle de Uco",
    coordenadas: "-33.5,-69.1",
    timestamp: 1738000000,
    ndvi: 0.71,
    climateEvent: "",
    isLimitedEdition: false,
  },
];

// Mock ranking
const RANKING = [
  { address: "0x1a2b...3c4d", tokens: 12, bodegas: 8 },
  { address: "0x5e6f...7g8h", tokens: 9, bodegas: 7 },
  { address: "0x9i0j...1k2l", tokens: 7, bodegas: 5 },
  { address: "0x3m4n...5o6p", tokens: 6, bodegas: 5 },
  { address: "Vos", tokens: 3, bodegas: 3, isUser: true },
];

function calcBadges(tokens: NFTToken[]) {
  const uniqueBodegas = new Set(tokens.map((t) => t.bodega)).size;
  const bodegaCounts = tokens.reduce<Record<string, number>>((acc, t) => {
    acc[t.bodega] = (acc[t.bodega] ?? 0) + 1;
    return acc;
  }, {});
  const maxSameBodega = Math.max(0, ...Object.values(bodegaCounts));

  return BADGES.map((badge) => {
    let progress = 0;
    let total = badge.threshold;

    if (badge.type === "bodegas") {
      progress = uniqueBodegas;
      total = badge.threshold;
    } else if (badge.type === "same_bodega") {
      progress = maxSameBodega;
      total = badge.threshold;
    } else if (badge.type === "top10") {
      // simplified: always show as locked for demo
      progress = 0;
      total = 1;
    }

    return { ...badge, progress, total, unlocked: progress >= total };
  });
}

export default function CollectionPage() {
  const [address, setAddress] = useState("");
  const [tokens, setTokens] = useState<NFTToken[]>(DEMO_TOKENS);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(true);

  const badges = calcBadges(tokens);
  const unlockedCount = badges.filter((b) => b.unlocked).length;
  const nextBadge = badges.find((b) => !b.unlocked);

  const fetchCollection = async () => {
    if (!address) return;
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/collection?address=${address}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTokens(data.tokens ?? []);
      setDemoMode(false);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-200 transition-colors">←</Link>
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <VestaLogo className="w-5 h-6 text-emerald-400" />
            <span className="font-bold text-white">VESTA</span>
          </Link>
        </div>
        <span className="text-xs text-gray-500">VESTA</span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Wallet input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Ingresá tu dirección de wallet 0x..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          <button
            onClick={fetchCollection}
            disabled={!address || loading}
            className="bg-green-500 hover:bg-green-400 disabled:bg-green-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shrink-0"
          >
            {loading ? "..." : "Ver"}
          </button>
        </div>
        {fetchError && <p className="text-xs text-red-400">{fetchError}</p>}
        {demoMode && (
          <p className="text-xs text-gray-600 -mt-4">
            Mostrando colección de ejemplo. Ingresá tu wallet para ver la tuya.
          </p>
        )}

        {/* Badge progress */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Tus badges</h2>
            <span className="text-xs text-gray-500">
              {unlockedCount}/{BADGES.length} desbloqueados
            </span>
          </div>

          {nextBadge && (
            <div className="bg-gray-900 rounded-xl p-3 mb-4 flex items-center gap-3">
              <span className="opacity-40">{nextBadge.icon}</span>
              <div className="flex-1">
                <p className="text-xs text-gray-400">
                  Próximo badge:{" "}
                  <span className="text-white font-medium">{nextBadge.name}</span>
                </p>
                <div className="h-1.5 bg-gray-700 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        (nextBadge.progress / nextBadge.total) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-[10px] text-gray-600 mt-1">
                  {nextBadge.progress}/{nextBadge.total}{" "}
                  {nextBadge.type === "bodegas" ? "bodegas" : "cosechas"}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className={`rounded-xl p-4 text-center border transition-all ${
                  badge.unlocked
                    ? "bg-gradient-to-b border-transparent " + badge.color
                    : "bg-gray-900 border-white/5 opacity-50"
                }`}
              >
                <div className="flex justify-center mb-2">{badge.icon}</div>
                <p className="text-xs font-semibold leading-tight">{badge.name}</p>
                <p className="text-[10px] text-white/60 mt-1">{badge.description}</p>
                {badge.unlocked && (
                  <div className="mt-2 text-[10px] font-bold bg-white/20 rounded-full px-2 py-0.5 inline-block">
                    ✓ DESBLOQUEADO
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* NFT Grid */}
        <div>
          <h2 className="font-semibold text-lg mb-4">
            Tu colección{" "}
            <span className="text-gray-500 text-sm font-normal">
              ({tokens.length} NFTs)
            </span>
          </h2>

          {tokens.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              <GrapeIcon className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-sm">No tenés NFTs todavía.</p>
              <p className="text-xs mt-1">
                Analizá tu primera parcela y certificala on-chain.
              </p>
              <Link
                href="/"
                className="inline-block mt-4 bg-green-500 text-white px-4 py-2 rounded-lg text-sm"
              >
                Analizar mi viñedo
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tokens
                .slice()
                .sort((a, b) => b.timestamp - a.timestamp)
                .map((token) => (
                  <Link
                    key={token.tokenId}
                    href={`/bottle/${token.tokenId}`}
                    className="bg-gray-900 border border-white/5 rounded-xl p-4 hover:border-green-500/40 transition-colors group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 bg-green-900 rounded-lg flex items-center justify-center">
                        <GrapeIcon className="w-5 h-5 text-green-400" />
                      </div>
                      {token.isLimitedEdition && (
                        <span className="text-[10px] bg-red-900/60 text-red-300 border border-red-700/40 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                          <SnowflakeIcon className="w-3 h-3" /> EDICIÓN LIMITADA
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-sm group-hover:text-green-400 transition-colors">
                      {token.bodega}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {token.timestamp
                        ? new Date(token.timestamp * 1000).toLocaleDateString("es-AR")
                        : "—"}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-gray-600">
                        Vigor: {(token.ndvi * 100).toFixed(0)}%
                      </span>
                      <span className="text-[10px] text-gray-600 font-mono">
                        #{token.tokenId}
                      </span>
                    </div>
                  </Link>
                ))}
            </div>
          )}
        </div>

        {/* Ranking */}
        <div>
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            Ranking global <GlobeIcon className="w-4 h-4 text-gray-500" />
          </h2>
          <div className="bg-gray-900 rounded-xl overflow-hidden">
            {RANKING.map((entry, i) => (
              <div
                key={entry.address}
                className={`flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0 ${
                  entry.isUser ? "bg-green-900/20" : ""
                }`}
              >
                <span
                  className={`text-sm font-bold w-6 text-center ${
                    i === 0
                      ? "text-yellow-400"
                      : i === 1
                      ? "text-gray-300"
                      : i === 2
                      ? "text-orange-400"
                      : "text-gray-600"
                  }`}
                >
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {entry.isUser ? (
                      <span className="text-green-400">Vos ✓</span>
                    ) : (
                      <span className="font-mono text-gray-400">{entry.address}</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-600">
                    {entry.bodegas} bodegas · {entry.tokens} NFTs
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
