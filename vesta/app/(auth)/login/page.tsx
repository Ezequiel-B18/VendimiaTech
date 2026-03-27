"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/escritorio"); // Redirigir al inicio protegido
    } catch (err: unknown) {
      console.error(err);
      setError("Credenciales incorrectas o usuario no encontrado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.18),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(14,165,233,0.14),transparent_30%),linear-gradient(to_bottom,#052e16,#0a0f1d_45%,#020617)] text-white p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl shadow-lg shadow-emerald-900/40 flex items-center justify-center text-3xl mb-4">
            🛰️
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Acceso Privado VESTA</h1>
          <p className="text-emerald-300/80 mt-2 text-sm">Plataforma exclusiva para productores asociados</p>
        </div>

        <form 
          onSubmit={handleLogin}
          className="bg-gradient-to-b from-white/[0.08] to-white/[0.03] backdrop-blur-md border border-white/10 rounded-3xl p-8 shadow-[0_20px_70px_rgba(2,6,23,0.45)]"
        >
          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-300 text-sm rounded-xl text-center backdrop-blur-sm">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-emerald-100/70 mb-2">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all font-medium"
                placeholder="roberto.p@monteviejo.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-emerald-100/70 mb-2">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all font-medium"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                 <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                 </svg>
              ) : (
                "Ingresar al Dashboard →"
              )}
            </button>
          </div>
        </form>

        <p className="text-center text-sm text-slate-500 mt-8">
          ¿No tienes una cuenta productiva? Contacta a tu representante VESTA.
        </p>
      </div>
    </div>
  );
}
