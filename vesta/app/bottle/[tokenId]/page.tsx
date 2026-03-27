"use client";


import { useEffect, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { SnowflakeIcon, GrapeIcon, MapIcon, ThermometerIcon, RainIcon, SunIcon } from "@/components/icons";
import {
  addDoc,
  collection,
  query,
  orderBy,
  where,
  limit,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { getWines, Wine } from "@/services/firebaseDb";
import WalletButton, { WalletState } from "@/components/WalletButton";

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

interface Review {
  stars: number;
  comment: string;
}

const ESTADO_STYLES = {
  bueno: {
    dot: "bg-green-500",
    text: "text-green-400",
    border: "border-green-700/50",
    bg: "bg-green-900/30",
    label: "Bueno",
  },
  regular: {
    dot: "bg-yellow-500",
    text: "text-yellow-400",
    border: "border-yellow-700/50",
    bg: "bg-yellow-900/30",
    label: "Regular",
  },
  malo: {
    dot: "bg-red-500",
    text: "text-red-400",
    border: "border-red-700/50",
    bg: "bg-red-900/30",
    label: "Malo",
  },
};

function StarRow({
  count,
  size = "text-lg",
}: {
  count: number;
  size?: string;
}) {
  return (
    <span className={`${size} leading-none`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < count ? "text-yellow-400" : "text-gray-600"}>
          {i < count ? "★" : "☆"}
        </span>
      ))}
    </span>
  );
}

// ─── VISTA BODEGA para partidas QR ────────────────────────────────────────────
function BottlePassportStatic({ tokenId }: { tokenId: string }) {
  const searchParams = useSearchParams();

  const bodega = searchParams.get("bodega") || "Bodega Certificada";
  const uid = searchParams.get("uid") || "";

  const [wines, setWines] = useState<Wine[]>([]);
  const [loadingWines, setLoadingWines] = useState(true);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgStars, setAvgStars] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const [hoverStar, setHoverStar] = useState(0);
  const [selectedStar, setSelectedStar] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);

  useEffect(() => {
    if (uid) {
      getWines(uid)
        .then(setWines)
        .finally(() => setLoadingWines(false));
    } else {
      setLoadingWines(false);
    }
    if (typeof window !== "undefined") {
      setAlreadyReviewed(!!localStorage.getItem(`vesta_review_${tokenId}`));
    }
    fetchReviews();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenId, uid]);

  async function fetchReviews() {
    try {
      const snap = await getDocs(
        query(
          collection(db, "reviews"),
          where("tokenId", "==", tokenId),
          orderBy("createdAt", "desc"),
          limit(50)
        )
      );
      const all = snap.docs.map((d) => d.data() as Review & { createdAt: unknown });
      setReviewCount(all.length);
      if (all.length > 0) {
        const avg = all.reduce((s, r) => s + r.stars, 0) / all.length;
        setAvgStars(Math.round(avg * 10) / 10);
      }
      setReviews(all.slice(0, 3));
    } catch {
      // silently fail
    }
  }

  async function handleSubmitReview() {
    if (!selectedStar || submitting) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, "reviews"), {
        tokenId,
        stars: selectedStar,
        comment: comment.slice(0, 200).trim(),
        createdAt: serverTimestamp(),
      });
      localStorage.setItem(`vesta_review_${tokenId}`, "1");
      setAlreadyReviewed(true);
      setSubmitted(true);
      fetchReviews();
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-10">

      {/* HERO */}
      <div className="bg-gradient-to-b from-green-950 to-gray-950 px-6 pt-12 pb-8 text-center">
        <div className="w-20 h-20 bg-green-900 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-4 shadow-lg">
          🏠
        </div>
        <h1 className="text-2xl font-bold leading-tight">{bodega}</h1>
        <p className="text-green-400 mt-1 text-sm">Valle de Uco · Mendoza</p>
        <div className="inline-flex items-center gap-1.5 bg-green-800/60 text-green-300 text-xs font-semibold px-3 py-1 rounded-full mt-3">
          ✓ Viñedo verificado satelitalmente por VESTA
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 space-y-5 mt-4">

        {/* SELLO */}
        <div className="bg-green-900/30 border border-green-700/40 rounded-2xl p-4 text-center">
          <p className="text-sm text-green-200 leading-snug">
            El origen, la salud vegetal y las condiciones climáticas de esta bodega
            fueron auditadas con imágenes satelitales Sentinel-2 e IA agronómica.
          </p>
          <div className="mt-3 flex justify-center gap-2 text-xs text-white/40 font-mono">
            <span>Satellite + IA + Blockchain</span>
          </div>
        </div>

        {/* CATÁLOGO DE VINOS */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Catálogo de vinos
          </p>
          {loadingWines ? (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : wines.length === 0 ? (
            <div className="bg-gray-900 rounded-2xl p-6 text-center">
              <span className="text-3xl">🍷</span>
              <p className="text-gray-500 text-sm mt-2">Sin vinos registrados aún</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {wines.map((wine) => (
                <div
                  key={wine.id}
                  className="bg-gray-900 border border-white/5 rounded-2xl overflow-hidden"
                >
                  <div className="aspect-[3/4] bg-black/40 flex items-center justify-center overflow-hidden relative">
                    {wine.certificateTokenId && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full z-10">
                        ✓
                      </div>
                    )}
                    {wine.imageUrl ? (
                      <img
                        src={wine.imageUrl}
                        alt={wine.name}
                        className="h-full w-full object-contain p-3"
                      />
                    ) : (
                      <span className="text-4xl">🍷</span>
                    )}
                  </div>
                  <div className="p-3 border-t border-white/5">
                    <p className="font-semibold text-sm text-white leading-tight">{wine.name}</p>
                    <p className="text-green-400 text-xs mt-0.5">{wine.variety} · {wine.year}</p>
                    {wine.certificateTokenId && (
                      <a
                        href={wine.certificateExplorerUrl ?? `/bottle/${wine.certificateTokenId}`}
                        target={wine.certificateExplorerUrl ? "_blank" : undefined}
                        rel={wine.certificateExplorerUrl ? "noopener noreferrer" : undefined}
                        className="block mt-1.5 text-[10px] text-green-500/70 hover:text-green-400 transition-colors"
                      >
                        Ver certificado →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* DATOS DE LA TEMPORADA */}
        <div className="bg-gray-900 rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Temporada 2025/2026
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

        {/* REVIEWS PROMEDIO */}
        <div className="bg-gray-900 rounded-2xl p-4 flex items-center gap-3">
          <StarRow count={Math.round(avgStars ?? 0)} size="text-xl" />
          {avgStars !== null ? (
            <span className="text-white font-semibold text-lg">{avgStars.toFixed(1)}</span>
          ) : (
            <span className="text-gray-500 text-sm">Sin reviews aún</span>
          )}
          {reviewCount > 0 && (
            <span className="text-gray-500 text-sm">· {reviewCount} {reviewCount === 1 ? "review" : "reviews"}</span>
          )}
        </div>

        {/* FORMULARIO REVIEW */}
        {submitted ? (
          <div className="bg-green-900/30 border border-green-700/50 rounded-2xl p-5 text-center">
            <p className="text-green-400 font-semibold">¡Gracias por tu review!</p>
          </div>
        ) : alreadyReviewed ? (
          <div className="bg-gray-900 rounded-2xl p-4 text-center">
            <p className="text-gray-500 text-sm">Ya dejaste tu review para esta bodega.</p>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-2xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Dejar una review
            </p>
            <div className="flex gap-1 mb-3">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onMouseEnter={() => setHoverStar(s)}
                  onMouseLeave={() => setHoverStar(0)}
                  onClick={() => setSelectedStar(s)}
                  className="text-3xl transition-transform hover:scale-110 leading-none"
                >
                  <span className={s <= (hoverStar || selectedStar) ? "text-yellow-400" : "text-gray-600"}>
                    {s <= (hoverStar || selectedStar) ? "★" : "☆"}
                  </span>
                </button>
              ))}
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 200))}
              placeholder="Contá tu experiencia con esta bodega... (opcional)"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-green-600 transition-colors"
              rows={3}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-600">{comment.length}/200</span>
              <button
                onClick={handleSubmitReview}
                disabled={!selectedStar || submitting}
                className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {submitting ? "Publicando..." : "Publicar review"}
              </button>
            </div>
          </div>
        )}

        {/* ÚLTIMAS REVIEWS */}
        {reviews.length > 0 && (
          <div className="bg-gray-900 rounded-2xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Últimas reviews
            </p>
            <div className="space-y-3">
              {reviews.map((r, i) => (
                <div key={i} className="border-b border-gray-800 last:border-0 pb-3 last:pb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <StarRow count={r.stars} size="text-sm" />
                    <span className="text-xs text-gray-500">Usuario verificado</span>
                  </div>
                  {r.comment && <p className="text-sm text-gray-300">{r.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div className="text-center pt-2">
          <p className="text-xs text-gray-600">
            Certificado por <span className="text-green-500 font-semibold">VESTA</span> · Satellite + IA + Blockchain
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
  const [collectStep, setCollectStep] = useState<"idle" | "minting" | "success" | "error">("idle");
  const [collectTxHash, setCollectTxHash] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletState | null>(null);

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

  const handleAddToCollection = async () => {
    if (!token) return;
    setCollectStep("minting");
    try {
      const res = await fetch("/api/certify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chain: "bnb",
          bodega: token.bodega || "Bodega VESTA",
          coordenadas: token.coordenadas,
          imageHash: token.imageHash,
          ndvi: token.ndvi,
          ndre: token.ndre,
          ndwi: token.ndwi,
          climateEvent: token.climateEvent ?? "",
          walletAddress: wallet?.address ?? "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al mintear");
      setCollectTxHash(data.txHash);
      setCollectStep("success");
    } catch {
      setCollectStep("error");
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-10">
      <div className="relative bg-gradient-to-b from-green-900 to-gray-950 px-6 pt-12 pb-10 text-center">
        {token.isLimitedEdition && (
          <div className="inline-flex items-center gap-1.5 bg-red-600/80 text-red-100 text-xs font-semibold px-3 py-1 rounded-full mb-4">
            <SnowflakeIcon className="w-3.5 h-3.5" /> Edición Limitada — Cosecha Histórica
          </div>
        )}
        <div className="w-24 h-24 bg-green-800 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-900/50">
          <GrapeIcon className="w-12 h-12 text-green-300" />
        </div>
        <h1 className="text-2xl font-bold leading-tight">{token.bodega}</h1>
        <p className="text-green-400 mt-1 text-sm">Malbec · Cosecha {year}</p>
        <p className="text-gray-500 text-xs mt-1">Token #{token.tokenId} · BSC Testnet</p>
      </div>

      <div className="max-w-md mx-auto px-4 space-y-4 mt-2">
        {token.isLimitedEdition && token.climateEvent && (
          <div className="bg-red-900/40 border border-red-700/50 rounded-2xl p-4 text-center">
            <p className="text-lg font-bold text-red-300 flex items-center justify-center gap-2">
              <SnowflakeIcon className="w-5 h-5" /> Cosecha Histórica
            </p>
            <p className="text-sm text-red-200 mt-1">
              Esta botella fue certificada durante un evento climático excepcional
            </p>
            <div className="mt-3 bg-red-900/40 rounded-lg px-3 py-2 text-xs text-red-300 font-mono">
              {token.climateEvent}
            </div>
            <p className="text-xs text-red-400 mt-2">
              Solo los viñedos monitoreados por satélite en ese momento tienen este sello.
            </p>
          </div>
        )}
        <div className="bg-gray-900 rounded-2xl p-4">
          <div className="bg-green-900/30 border border-green-800/40 rounded-xl h-36 flex items-center justify-center mb-3">
            <div className="text-center">
              <MapIcon className="w-10 h-10 text-green-400 mx-auto" />
              <p className="text-xs text-gray-400 mt-2">
                {token.coordenadas}
              </p>
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
              { icon: <ThermometerIcon className="w-6 h-6 text-gray-300 mx-auto" />, label: "Temp. media", value: "24°C / 11°C" },
              { icon: <RainIcon className="w-6 h-6 text-gray-300 mx-auto" />, label: "Precipit.", value: "11.9 mm" },
              { icon: <SunIcon className="w-6 h-6 text-gray-300 mx-auto" />, label: "Días de sol", value: "28 días" },
            ].map((item) => (
              <div key={item.label} className="bg-gray-800 rounded-xl p-3 text-center">
                <div className="mb-1">{item.icon}</div>
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
          {collectStep === "idle" && !wallet && (
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs text-gray-400">Conectá tu wallet para guardar este vino</p>
              <WalletButton wallet={wallet} onConnect={setWallet} />
            </div>
          )}
          {collectStep === "idle" && wallet && (
            <button onClick={handleAddToCollection} className="w-full bg-green-500 hover:bg-green-400 text-white font-semibold rounded-xl py-3 text-sm transition-colors">
              Agregar a mi colección · BNB Chain
            </button>
          )}
          {collectStep === "minting" && (
            <div className="w-full bg-yellow-400 text-gray-900 font-semibold rounded-xl py-3 text-sm text-center">
              Minteando NFT en BNB Chain...
            </div>
          )}
          {collectStep === "success" && (
            <div className="space-y-2">
              <div className="w-full bg-green-600 text-white font-semibold rounded-xl py-3 text-sm text-center">
                ✓ NFT minteado en BNB Chain
              </div>
              {collectTxHash && (
                <a href={`https://testnet.bscscan.com/tx/${collectTxHash}`} target="_blank" rel="noopener noreferrer" className="block text-center text-xs text-yellow-400 hover:underline">
                  Ver en BSCScan →
                </a>
              )}
            </div>
          )}
          {collectStep === "error" && (
            <button onClick={() => setCollectStep("idle")} className="w-full bg-red-500 text-white font-semibold rounded-xl py-3 text-sm">
              Error — Reintentar
            </button>
          )}
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
  // Blockchain token: solo dígitos (ej: /bottle/8)
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
