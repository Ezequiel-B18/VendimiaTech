"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { auth } from "@/lib/firebase";
import { getParcels, getWines, getCertificates, linkWineToCertificate, Parcel, Wine, Certificate, updateWineImageUrl } from "@/services/firebaseDb";
import AddWineModal from "../../../components/AddWineModal";

async function uploadToCloudinary(file: File): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) throw new Error("Cloudinary no configurado");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Error subiendo imagen a Cloudinary");
  const data = await res.json();
  return data.secure_url as string;
}

interface PartidaQR {
  wine: Wine;
  qrDataUrl: string;
  url: string;
}

export default function EscritorioPage() {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [wines, setWines] = useState<Wine[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [partidaQR, setPartidaQR] = useState<PartidaQR | null>(null);
  const [generatingQR, setGeneratingQR] = useState<string | null>(null);
  const [uploadingImageFor, setUploadingImageFor] = useState<string | null>(null);
  const [linkingWineId, setLinkingWineId] = useState<string | null>(null);
  const qrPanelRef = useRef<HTMLDivElement>(null);
  const filePickerRef = useRef<HTMLInputElement>(null);
  const pendingUploadWineId = useRef<string | null>(null);
  const router = useRouter();

  const loadData = async () => {
    const user = auth.currentUser;
    if (!user) {
       setLoading(false);
       return;
    }
    setLoading(true);
    try {
      const [p, w, c] = await Promise.all([
        getParcels(user.uid),
        getWines(user.uid),
        getCertificates(user.uid),
      ]);
      setParcels(p);
      setWines(w);
      setCertificates(c);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(() => {
      loadData();
    });
    return () => unsubscribe();
  }, []);

  const handleAnalyzeParcel = (p: Parcel) => {
    const [lonMin, latMin, lonMax, latMax] = p.bbox;
    router.push(`/dashboard?bbox=${lonMin},${latMin},${lonMax},${latMax}&nombre=${encodeURIComponent(p.name)}`);
  };

  const handleGenerarQR = async (wine: Wine) => {
    setGeneratingQR(wine.id);
    const uid = auth.currentUser?.uid || "";
    const id = `bodega-${uid}`;
    const params = new URLSearchParams({
      bodega: auth.currentUser?.displayName || auth.currentUser?.email?.split("@")[0] || "Bodega VESTA",
      uid,
      vino: wine.name,
      cosecha: String(wine.year),
      varietal: wine.variety,
    });
    const url = `https://vendimiatech-gamma.vercel.app/bottle/${id}?${params.toString()}`;
    const qrDataUrl = await QRCode.toDataURL(url, { width: 220, margin: 2 });
    setPartidaQR({ wine, qrDataUrl, url });
    setGeneratingQR(null);
    setTimeout(() => qrPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  const handleCopiarLink = () => {
    if (partidaQR?.url) navigator.clipboard.writeText(partidaQR.url);
  };

  const handleSubirEtiqueta = (wineId: string) => {
    pendingUploadWineId.current = wineId;
    filePickerRef.current?.click();
  };

  const handleEtiquetaFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const wineId = pendingUploadWineId.current;
    if (!file || !wineId || !auth.currentUser) return;
    e.target.value = "";
    setUploadingImageFor(wineId);
    try {
      const url = await uploadToCloudinary(file);
      await updateWineImageUrl(auth.currentUser.uid, wineId, url);
      setWines((prev) => prev.map((w) => w.id === wineId ? { ...w, imageUrl: url } : w));
    } catch (err) {
      console.error(err);
      alert("Error subiendo imagen");
    } finally {
      setUploadingImageFor(null);
      pendingUploadWineId.current = null;
    }
  };

  const handleLinkCertificate = async (wineId: string, certificateTokenId: string) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    await linkWineToCertificate(uid, wineId, certificateTokenId);
    setWines((prev) =>
      prev.map((w) => w.id === wineId ? { ...w, certificateTokenId } : w)
    );
    setLinkingWineId(null);
  };

  const handleDescargarQR = () => {
    if (!partidaQR?.qrDataUrl) return;
    const a = document.createElement("a");
    a.href = partidaQR.qrDataUrl;
    a.download = `qr-${partidaQR.wine.name.replace(/\s+/g, "-").toLowerCase()}.png`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.18),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(14,165,233,0.14),transparent_30%),linear-gradient(to_bottom,#052e16,#0a0f1d_45%,#020617)] text-white">
      <header className="px-6 py-5 border-b border-white/10 backdrop-blur-sm bg-slate-950/30 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl shadow-lg shadow-emerald-900/40 flex items-center justify-center text-lg">
              🛰️
            </div>
            <span className="font-bold text-xl tracking-tight">VESTA</span>
            <span className="hidden sm:inline text-emerald-400 text-sm ml-1">
              Mi Escritorio
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-emerald-100/60 hidden sm:inline">{auth.currentUser?.email}</span>
            <button 
              onClick={() => { auth.signOut(); }}
              className="text-sm px-4 py-2 rounded-full border border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/20 hover:text-white transition-colors"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10 space-y-12">
        
        {/* PARCELAS SECTION */}
        <section>
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Mis Parcelas</h2>
              <p className="text-emerald-100/60 text-sm">Tu tierra, analizada desde el espacio.</p>
            </div>
            <button 
              onClick={() => router.push("/mapa")}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-sm font-semibold text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
            >
              + Nueva Parcela
            </button>
          </div>

          {loading ? (
             <div className="h-32 flex items-center justify-center">
                <p className="text-emerald-500/50 animate-pulse">Sincronizando con satélites...</p>
             </div>
          ) : parcels.length === 0 ? (
             <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-10 text-center backdrop-blur-sm">
                <span className="text-4xl">🗺️</span>
                <p className="text-emerald-100/70 mt-4 mb-4">Aún no has trazado el polígono de tu cosecha.</p>
                <button onClick={() => router.push("/mapa")} className="text-emerald-400 font-medium hover:text-emerald-300">Ir al mapa satelital →</button>
             </div>
          ) : (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {parcels.map(p => (
                  <div key={p.id} className="bg-gradient-to-b from-white/[0.08] to-white/[0.03] border border-white/10 rounded-2xl p-5 hover:bg-white/[0.12] transition-colors group">
                    <div className="flex justify-between items-start mb-4">
                       <h3 className="font-semibold text-lg text-emerald-50">{p.name}</h3>
                       <span className="text-xs font-mono bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded">Sentinel-L2A</span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono break-all mb-4 opacity-50">
                       bbox: {p.bbox.map(n => n.toFixed(3)).join(',')}
                    </p>
                    <button 
                      onClick={() => handleAnalyzeParcel(p)}
                      className="w-full py-2 rounded-lg bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-all text-sm"
                    >
                      Diagnóstico IA →
                    </button>
                  </div>
                ))}
             </div>
          )}
        </section>

        {/* VINOS SECTION */}
        <section>
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Mi Catálogo de Vinos</h2>
              <p className="text-emerald-100/60 text-sm">Registro preparado para auditoría on-chain HCS.</p>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2.5 rounded-xl border border-emerald-500/50 bg-emerald-900/30 hover:bg-emerald-800/40 text-sm font-semibold text-emerald-300 transition-all"
            >
              + Cargar Vino
            </button>
          </div>

          {loading ? (
             <div className="h-32" />
          ) : wines.length === 0 ? (
             <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-10 text-center backdrop-blur-sm">
                <span className="text-4xl text-slate-600">🍷</span>
                <p className="text-emerald-100/70 mt-4 mb-4">No has registrado las etiquetas comercializables del lote.</p>
             </div>
          ) : (
             <>
             {/* File picker oculto compartido entre cards */}
             <input
               ref={filePickerRef}
               type="file"
               accept="image/jpeg,image/png,image/webp"
               onChange={handleEtiquetaFileChange}
               className="hidden"
             />

             <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                {wines.map(w => (
                  <div key={w.id} className="relative bg-gradient-to-b from-slate-800/80 to-slate-950/90 border border-white/10 rounded-2xl overflow-hidden shadow-2xl group text-center">
                    <div className="aspect-[3/4] w-full overflow-hidden bg-black/40 p-4 flex items-center justify-center">
                      {w.imageUrl ? (
                        <img
                          src={w.imageUrl}
                          alt={w.name}
                          className="h-full object-contain filter drop-shadow-[0_0_10px_rgba(16,185,129,0.1)] group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden"); }}
                        />
                      ) : null}
                      {/* Placeholder visible si no hay imagen o falla la carga */}
                      <div className={`flex flex-col items-center justify-center gap-2 text-slate-600 ${w.imageUrl ? "hidden" : ""}`}>
                        <span className="text-4xl">📷</span>
                        <p className="text-xs text-slate-500">Etiqueta no subida</p>
                        {uploadingImageFor === w.id ? (
                          <p className="text-[10px] text-emerald-400 animate-pulse">Subiendo...</p>
                        ) : (
                          <button
                            onClick={() => handleSubirEtiqueta(w.id)}
                            className="mt-1 text-[10px] px-2.5 py-1 rounded-lg border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                          >
                            Subir etiqueta
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="p-4 border-t border-white/5">
                       <h3 className="font-bold text-white leading-tight">{w.name}</h3>
                       <p className="text-emerald-400 text-sm font-medium mt-1">{w.variety} • {w.year}</p>

                       {/* Certificado vinculado */}
                       {w.certificateTokenId ? (
                         <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2 py-1">
                           <span>✓</span>
                           <span>Cert. #{w.certificateTokenId}</span>
                           <button
                             onClick={() => setLinkingWineId(w.id)}
                             className="ml-auto text-white/30 hover:text-white/60 transition-colors"
                           >
                             ✎
                           </button>
                         </div>
                       ) : (
                         <button
                           onClick={() => setLinkingWineId(w.id)}
                           disabled={certificates.length === 0}
                           className="mt-2 w-full py-1.5 rounded-lg border border-dashed border-white/20 text-white/40 hover:border-emerald-500/40 hover:text-emerald-400 transition-all text-xs disabled:opacity-30"
                         >
                           {certificates.length === 0 ? "Sin certificados aún" : "+ Vincular certificado"}
                         </button>
                       )}

                       {/* Selector de certificado */}
                       {linkingWineId === w.id && (
                         <div className="mt-2 bg-slate-800 border border-white/10 rounded-xl p-3 space-y-1.5">
                           <p className="text-[10px] text-white/40 uppercase tracking-wide mb-2">Seleccioná un análisis</p>
                           {certificates.map((cert) => (
                             <button
                               key={cert.id}
                               onClick={() => handleLinkCertificate(w.id, cert.tokenId)}
                               className="w-full text-left px-3 py-2 rounded-lg bg-white/5 hover:bg-emerald-500/15 hover:border-emerald-500/30 border border-transparent transition-all"
                             >
                               <p className="text-xs text-white font-medium">Token #{cert.tokenId}</p>
                               <p className="text-[10px] text-white/40 font-mono truncate">{cert.txHash.slice(0, 20)}…</p>
                             </button>
                           ))}
                           <button
                             onClick={() => setLinkingWineId(null)}
                             className="w-full text-xs text-white/30 hover:text-white/50 pt-1 transition-colors"
                           >
                             Cancelar
                           </button>
                         </div>
                       )}

                       {uploadingImageFor === w.id ? (
                         <p className="mt-3 text-xs text-emerald-400 animate-pulse">Subiendo imagen...</p>
                       ) : (
                         <button
                           onClick={() => handleGenerarQR(w)}
                           disabled={generatingQR === w.id}
                           className="mt-3 w-full py-2 rounded-lg bg-emerald-500/15 text-emerald-400 font-medium border border-emerald-500/25 hover:bg-emerald-500/25 transition-all text-xs disabled:opacity-50"
                         >
                           {generatingQR === w.id ? "Generando..." : "Crear QR de partida"}
                         </button>
                       )}
                    </div>
                  </div>
                ))}
             </div>

             {/* Panel QR de partida */}
             {partidaQR && (
               <div ref={qrPanelRef} className="mt-8 bg-gradient-to-b from-white/[0.07] to-white/[0.03] border border-emerald-500/20 rounded-2xl p-6">
                 <div className="flex items-start justify-between mb-4">
                   <div>
                     <p className="text-xs font-semibold text-emerald-400/70 uppercase tracking-wide mb-1">Partida generada</p>
                     <h3 className="text-xl font-bold text-white">{partidaQR.wine.name}</h3>
                     <p className="text-emerald-400 text-sm mt-0.5">{partidaQR.wine.variety} · Cosecha {partidaQR.wine.year}</p>
                   </div>
                   <button
                     onClick={() => setPartidaQR(null)}
                     className="text-slate-500 hover:text-slate-300 text-xl leading-none transition-colors"
                   >
                     ×
                   </button>
                 </div>

                 <div className="flex flex-col sm:flex-row gap-6 items-start">
                   {/* QR */}
                   <div className="shrink-0 bg-white p-3 rounded-xl shadow-lg">
                     <img src={partidaQR.qrDataUrl} alt="QR partida" className="w-[180px] h-[180px]" />
                   </div>

                   {/* Info + acciones */}
                   <div className="flex-1 space-y-3">
                     <div className="bg-slate-900/60 rounded-xl px-4 py-3">
                       <p className="text-xs text-slate-400 mb-1">Link del pasaporte digital</p>
                       <p className="text-xs font-mono text-emerald-300 break-all leading-relaxed">{partidaQR.url}</p>
                     </div>
                     <p className="text-xs text-slate-400">
                       Escaneá el QR con el celular para ver el pasaporte como lo verá el consumidor final.
                       Imprimilo en la etiqueta o usalo en materiales de marketing.
                     </p>
                     <div className="flex gap-2 pt-1">
                       <button
                         onClick={handleCopiarLink}
                         className="flex-1 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 rounded-xl py-2.5 text-sm font-medium transition-colors"
                       >
                         Copiar link
                       </button>
                       <button
                         onClick={handleDescargarQR}
                         className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors"
                       >
                         Descargar QR
                       </button>
                     </div>
                   </div>
                 </div>
               </div>
             )}
             </>
          )}
        </section>

      </main>

      <AddWineModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => loadData()}
      />
    </div>
  );
}
