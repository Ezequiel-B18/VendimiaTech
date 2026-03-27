"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Status = "loading" | "scanning" | "found" | "error";

export default function ScanPage() {
  const router = useRouter();
  const [manualCode, setManualCode] = useState("");
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerInstance = useRef<any>(null);

  const handleResult = (raw: string) => {
    setStatus("found");
    setTimeout(() => {
      try {
        const parsed = new URL(raw);
        const match = parsed.pathname.match(/\/bottle\/(.+)/);
        if (match) { router.push(`/bottle/${match[1]}`); return; }
      } catch { /* not a URL */ }
      const match = raw.match(/\/bottle\/(.+)/);
      if (match) { router.push(`/bottle/${match[1]}`); return; }
      if (raw.trim()) router.push(`/bottle/${raw.trim()}`);
    }, 600);
  };

  useEffect(() => {
    let mounted = true;

    import("html5-qrcode").then(({ Html5QrcodeScanner }) => {
      if (!mounted) return;

      scannerInstance.current = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 240, height: 240 }, showTorchButtonIfSupported: true },
        false
      );

      scannerInstance.current.render(
        (decodedText: string) => {
          scannerInstance.current?.clear();
          handleResult(decodedText);
        },
        () => {}
      );

      setStatus("scanning");
    }).catch(() => {
      setStatus("error");
      setErrorMsg("No se pudo acceder a la cámara. Usá el código manual.");
    });

    return () => {
      mounted = false;
      scannerInstance.current?.clear().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleManual = () => {
    if (!manualCode.trim()) return;
    handleResult(manualCode.trim());
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">

      {/* Header */}
      <div className="px-5 pt-10 pb-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-emerald-700/20 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-900/30">
          <span className="text-3xl">🍷</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Pasaporte del vino</h1>
        <p className="text-gray-500 text-sm mt-1.5">Escaneá el QR de la botella para ver su origen</p>
      </div>

      {/* Scanner area */}
      <div className="flex-1 px-5 flex flex-col items-center gap-5">

        {/* Loading state */}
        {status === "loading" && (
          <div className="w-full max-w-sm aspect-square rounded-2xl bg-gray-900 border border-white/10 flex flex-col items-center justify-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-full border-4 border-gray-700 border-t-emerald-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg">📷</span>
              </div>
            </div>
            <p className="text-gray-400 text-sm">Iniciando cámara...</p>
          </div>
        )}

        {/* Scanner — se muestra cuando el scanner está listo */}
        <div
          className={`w-full max-w-sm transition-all duration-500 ${
            status === "loading" ? "hidden" : "block"
          }`}
        >
          {/* Found overlay */}
          {status === "found" && (
            <div className="aspect-square rounded-2xl bg-emerald-900/60 border border-emerald-500/40 flex flex-col items-center justify-center gap-3 mb-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-900/50">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-emerald-300 font-semibold">QR detectado</p>
              <p className="text-gray-400 text-sm">Abriendo pasaporte...</p>
            </div>
          )}

          {/* Actual scanner div */}
          {status !== "found" && (
            <div className="rounded-2xl overflow-hidden border border-white/10 shadow-xl shadow-black/50">
              <div id="qr-reader" />
            </div>
          )}
        </div>

        {/* Error state */}
        {status === "error" && (
          <div className="w-full max-w-sm rounded-2xl bg-red-950/40 border border-red-500/20 p-5 text-center">
            <span className="text-3xl block mb-2">📷</span>
            <p className="text-red-400 text-sm">{errorMsg}</p>
          </div>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3 w-full max-w-sm">
          <div className="flex-1 h-px bg-white/8" />
          <span className="text-xs text-gray-600 px-1">o ingresá el código</span>
          <div className="flex-1 h-px bg-white/8" />
        </div>

        {/* Manual input */}
        <div className="w-full max-w-sm flex gap-2">
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleManual()}
            placeholder="Código de botella (ej: 12)"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm transition-all"
          />
          <button
            onClick={handleManual}
            disabled={!manualCode.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:bg-gray-800 disabled:text-gray-600 text-white font-semibold px-5 rounded-xl text-sm transition-all"
          >
            →
          </button>
        </div>

        {/* Tips */}
        <div className="w-full max-w-sm bg-white/[0.03] border border-white/5 rounded-2xl p-4 space-y-2.5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cómo funciona</p>
          {[
            { icon: "🔍", text: "Apuntá la cámara al código QR de la etiqueta" },
            { icon: "📡", text: "VESTA verifica el origen en la blockchain" },
            { icon: "🗺️", text: "Ves el mapa satelital real de donde creció tu vino" },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-3 text-sm text-gray-400">
              <span className="text-base shrink-0">{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <p className="text-xs text-gray-700 text-center py-6 px-4">
        VESTA · Satellite + Blockchain · Mendoza, Argentina
      </p>
    </div>
  );
}
