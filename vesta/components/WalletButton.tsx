"use client";

import { useState, useEffect, useRef } from "react";

export interface WalletState {
  address: string;
  chainId: number;
  provider: unknown;
  via: "beexo" | "metamask";
}

interface Props {
  onConnect: (wallet: WalletState | null) => void;
  wallet: WalletState | null;
}

async function connectBeexo(): Promise<WalletState> {
  const { XOConnectProvider } = await import("xo-connect");
  const xo = new XOConnectProvider();
  type EIP1193 = { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> };
  const p = xo as unknown as EIP1193;

  const accounts = (await p.request({ method: "eth_requestAccounts" })) as string[];
  if (!accounts || accounts.length === 0) throw new Error("Beexo no devolvió cuentas");

  const chainIdHex = (await p.request({ method: "eth_chainId" })) as string;
  return {
    address: accounts[0],
    chainId: parseInt(chainIdHex, 16),
    provider: xo,
    via: "beexo",
  };
}

async function connectMetaMask(): Promise<WalletState> {
  const eth = (window as unknown as { ethereum?: { request: (a: { method: string }) => Promise<unknown> } }).ethereum;
  if (!eth) throw new Error("MetaMask no está instalado");

  const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
  const chainIdHex = (await eth.request({ method: "eth_chainId" })) as string;

  return {
    address: accounts[0],
    chainId: parseInt(chainIdHex, 16),
    provider: eth,
    via: "metamask",
  };
}

export default function WalletButton({ onConnect, wallet }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<"beexo" | "metamask" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const connect = async (via: "beexo" | "metamask") => {
    setLoading(via);
    setError(null);
    try {
      const state = via === "beexo" ? await connectBeexo() : await connectMetaMask();
      onConnect(state);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al conectar");
    } finally {
      setLoading(null);
    }
  };

  if (wallet) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 bg-green-900/40 border border-green-700/40 text-green-300 px-3 py-1.5 rounded-full text-xs">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
          <span className="hidden sm:inline">
            {wallet.via === "beexo" ? "⬡ " : "🦊 "}
          </span>
          {wallet.address.slice(0, 6)}…{wallet.address.slice(-4)}
        </div>
        <button
          onClick={() => onConnect(null)}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(!open); setError(null); }}
        className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
      >
        <span>🔗</span> Conectar Wallet
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-gray-900 border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
          <div className="px-3 py-2 border-b border-white/5">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Elegir wallet</p>
          </div>

          {/* Beexo */}
          <button
            onClick={() => connect("beexo")}
            disabled={loading !== null}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left disabled:opacity-50"
          >
            <div className="w-8 h-8 bg-purple-900 rounded-lg flex items-center justify-center text-sm font-bold text-purple-300">
              ⬡
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Beexo Wallet</p>
              <p className="text-[10px] text-gray-500">xo-connect SDK</p>
            </div>
            {loading === "beexo" && (
              <svg className="animate-spin h-3.5 w-3.5 text-purple-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
          </button>

          {/* MetaMask */}
          <button
            onClick={() => connect("metamask")}
            disabled={loading !== null}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left disabled:opacity-50 border-t border-white/5"
          >
            <div className="w-8 h-8 bg-orange-900 rounded-lg flex items-center justify-center text-lg">
              🦊
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">MetaMask</p>
              <p className="text-[10px] text-gray-500">Browser extension</p>
            </div>
            {loading === "metamask" && (
              <svg className="animate-spin h-3.5 w-3.5 text-orange-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
          </button>

          {error && (
            <div className="px-4 py-2 border-t border-white/5">
              <p className="text-[10px] text-red-400">{error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
