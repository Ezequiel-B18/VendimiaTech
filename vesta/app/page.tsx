"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { VestaLogo, SatelliteIcon, ShieldCheckIcon, EyeIcon, LinkIcon, MailIcon } from "@/components/icons";

export default function HomePage() {
  const router = useRouter();
  const [wineCode, setWineCode] = useState("");
  const [email, setEmail] = useState("");

  const handleMenuNavigate = (sectionId: string) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleBottleLookup = () => {
    const value = wineCode.trim();
    if (!value) return;
    const normalized = value.replace(/^bottle=/i, "");
    if (!normalized) return;
    router.push(`/bottle/${encodeURIComponent(normalized)}`);
  };

  return (
    <div className="min-h-screen bg-[#0a0b1e] text-white">
      {/* ── Header ── */}
      <header className="px-6 py-5 border-b border-white/5 sticky top-0 z-30 bg-[#0a0b1e]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <VestaLogo className="w-7 h-8 text-emerald-400" />
              <span className="font-bold text-xl tracking-tight text-white">VESTA</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <button onClick={() => handleMenuNavigate("como-funciona")} className="text-sm text-gray-400 hover:text-white transition-colors">
                Cómo Funciona
              </button>
              <button onClick={() => handleMenuNavigate("tracking-vino")} className="text-sm text-gray-400 hover:text-white transition-colors">
                Verificar Botella
              </button>
              <button onClick={() => handleMenuNavigate("about-us")} className="text-sm text-gray-400 hover:text-white transition-colors">
                Acerca de
              </button>
            </nav>
          </div>

          <button
            onClick={() => router.push("/login")}
            className="px-5 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
          >
            Acceso Portal
          </button>
        </div>
      </header>

      <main>
        {/* ── Hero with green gradient + GIF ── */}
        <section className="relative overflow-hidden">
          {/* Green → dark blue gradient background */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#062a1e] via-[#0a1e2e] to-[#0a0b1e] z-0" />
          <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-emerald-900/40 to-transparent z-0" />

          <div className="relative z-10 max-w-6xl mx-auto px-6 pt-24 pb-20 flex items-center">
            <div className="max-w-2xl flex-1">
              <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-6">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-purple-400">Monitoreo satelital</span>
                <br />
                para tu viñedo
              </h1>
              <p className="text-gray-400 text-lg leading-relaxed max-w-lg mb-8">
                VESTA combina imágenes Sentinel-2, IA geoespacial y blockchain para proteger tu cosecha. <span className="text-emerald-400 font-medium">Alertas predictivas antes de que sea tarde.</span>
              </p>

              {/* Frost event badge */}
              <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 text-purple-300 px-4 py-2 rounded-md text-sm mb-10">
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                23 Mar 2026 — 3.1°C alertado con anticipación en Monteviejo
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => router.push("/login")}
                  className="bg-gradient-to-r from-purple-600 to-emerald-600 hover:from-purple-500 hover:to-emerald-500 text-white font-semibold py-3 px-6 rounded-md transition-all text-sm"
                >
                  Acceder a la Plataforma
                </button>
                <button
                  onClick={() => handleMenuNavigate("como-funciona")}
                  className="border border-white/10 hover:border-white/20 text-gray-300 hover:text-white font-medium py-3 px-6 rounded-md transition-all text-sm"
                >
                  Cómo Funciona
                </button>
              </div>
            </div>

            {/* GIF on the right */}
            <div className="hidden lg:block flex-shrink-0 ml-8 relative">
              <div className="w-[340px] h-[340px] rounded-full overflow-hidden opacity-70 relative">
                <img
                  src="https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExOXBlMG85YXg3Y280amRmbW5zbW55eDd2MXI3N2UxcTRjdGJxNXk1eiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/kEYB6QU5pvrwtVMaLc/giphy.gif"
                  alt="Earth satellite view"
                  className="w-full h-full object-cover"
                />
                {/* Soft fade-out edges */}
                <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-[#062a1e]/80 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a1e2e]/60 to-transparent pointer-events-none" />
                <div className="absolute inset-0 rounded-full shadow-[inset_0_0_60px_30px_rgba(10,11,30,0.7)] pointer-events-none" />
              </div>
            </div>
          </div>
        </section>

        {/* ── Cómo funciona ── */}
        <section id="como-funciona" className="border-t border-white/5 py-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="max-w-2xl mb-12">
              <h2 className="text-3xl font-bold mb-4">¿Cómo funciona VESTA?</h2>
              <p className="text-gray-400 leading-relaxed">
                Resolvemos el problema de la falta de datos precisos en viticultura. Muchos productores dependen de reportes genéricos y reaccionan tarde al clima. VESTA usa tecnología satelital y blockchain que garantiza que cada dato sea verificable y oportuno.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  icon: <SatelliteIcon className="w-7 h-7 text-purple-400" />,
                  title: "Imagen Real",
                  desc: "Datos Sentinel-2 actualizados de tu parcela exacta, sin reportes genéricos.",
                },
                {
                  icon: <EyeIcon className="w-7 h-7 text-purple-400" />,
                  title: "Total Transparencia",
                  desc: "Visualizá el vigor vegetativo, madurez y riesgos con informes detallados.",
                },
                {
                  icon: <ShieldCheckIcon className="w-7 h-7 text-emerald-400" />,
                  title: "Alertas Anticipadas",
                  desc: "Pronósticos de helada y riesgos antes de que afecten tu cosecha.",
                },
                {
                  icon: <LinkIcon className="w-7 h-7 text-emerald-400" />,
                  title: "Trazabilidad Completa",
                  desc: "Cada análisis queda registrado on-chain, verificable desde el viñedo hasta la botella.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-6 hover:bg-white/[0.06] transition-colors"
                >
                  <div className="mb-4">{item.icon}</div>
                  <p className="font-semibold text-white mb-2">{item.title}</p>
                  <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing ── */}
        <section id="pricing" className="border-t border-white/5 py-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="max-w-3xl mb-10">
              <h2 className="text-3xl font-bold mb-4">Planes VESTA</h2>
              <p className="text-gray-400 leading-relaxed">
                Elegí el plan según tu escala productiva. El acceso se activa por contacto y validación de hectáreas.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <article className="rounded-2xl border border-violet-400/20 bg-gradient-to-b from-violet-500/10 via-violet-500/5 to-transparent p-6">
                <div className="mb-6">
                  <p className="text-sm text-violet-200/90 font-medium">Productor Chico</p>
                  <p className="text-sm text-gray-300 mt-1">20 a 50 hectareas</p>
                </div>

                <div className="mb-5">
                  <p className="text-lg text-gray-400 line-through">USD 50/mes</p>
                  <p className="text-4xl font-extrabold tracking-tight text-violet-100">USD 24.99<span className="text-base text-violet-200/80 font-semibold">/mes</span></p>
                </div>

                <div className="rounded-lg border border-violet-300/25 bg-violet-400/10 px-3 py-2.5 mb-5">
                  <p className="text-xs font-semibold text-violet-100">Oferta primeros clientes · 3 meses</p>
                </div>
              </article>

              <article className="rounded-2xl border border-violet-300/30 bg-gradient-to-b from-violet-400/20 via-violet-500/10 to-transparent p-6 shadow-[0_0_0_1px_rgba(167,139,250,0.08)]">
                <div className="mb-6">
                  <p className="text-sm text-violet-100 font-medium">Productor Mediano</p>
                  <p className="text-sm text-gray-300 mt-1">50 a 80 hectareas</p>
                </div>

                <div className="mb-5">
                  <p className="text-lg text-gray-400 line-through">USD 100/mes</p>
                  <p className="text-4xl font-extrabold tracking-tight text-white">USD 49.99<span className="text-base text-violet-200/80 font-semibold">/mes</span></p>
                </div>

                <div className="rounded-lg border border-violet-200/30 bg-violet-300/15 px-3 py-2.5 mb-5">
                  <p className="text-xs font-semibold text-violet-50">Oferta primeros clientes · 3 meses</p>
                </div>
              </article>

              <article className="rounded-2xl border border-violet-400/20 bg-gradient-to-b from-violet-500/10 via-violet-500/5 to-transparent p-6">
                <div className="mb-6">
                  <p className="text-sm text-violet-200/90 font-medium">Bodega Exportadora</p>
                  <p className="text-sm text-gray-300 mt-1">100 a 500 hectareas</p>
                </div>

                <div className="mb-5">
                  <p className="text-lg text-gray-400 line-through">USD 250/mes</p>
                  <p className="text-4xl font-extrabold tracking-tight text-violet-100">USD 124.99<span className="text-base text-violet-200/80 font-semibold">/mes</span></p>
                </div>

                <div className="rounded-lg border border-violet-300/25 bg-violet-400/10 px-3 py-2.5 mb-5">
                  <p className="text-xs font-semibold text-violet-100">Oferta primeros clientes · 3 meses</p>
                </div>
              </article>
            </div>

            <div className="mt-8 flex justify-center">
              <div className="text-center">
                <p className="text-sm text-gray-300 mb-3">
                  Contactanos para acceder a este plan y validar que tu operación esté dentro del rango de hectáreas.
                </p>
                <button
                  onClick={() => router.push("/login")}
                  className="px-6 py-3 rounded-md bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors"
                >
                  Contactar para validar hectáreas
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Verificar botella ── */}
        <section id="tracking-vino" className="border-t border-white/5 py-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="max-w-xl">
              <span className="inline-flex px-3 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 mb-4">
                Consumidores Finales
              </span>
              <h2 className="text-3xl font-bold text-white mb-3">¿Tenés una botella certificada?</h2>
              <p className="text-gray-400 mb-6 leading-relaxed">
                Escaneá el QR o ingresá su código único para ver el pasaporte blockchain del terroir.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={wineCode}
                  onChange={(e) => setWineCode(e.target.value)}
                  placeholder="Código de la botella (Ej: 3)"
                  className="flex-1 bg-white/5 border border-white/10 rounded-md px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all text-sm"
                />
                <button
                  onClick={handleBottleLookup}
                  className="px-6 py-3 rounded-md bg-emerald-600 hover:bg-emerald-500 font-medium text-white text-sm transition-colors whitespace-nowrap"
                >
                  Verificar Origen
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA Section ── */}
        <section className="border-t border-white/5 py-20">
          <div className="max-w-6xl mx-auto px-6 text-center">
            <h2 className="text-3xl font-bold mb-4">¿Listo para proteger tu viñedo?</h2>
            <p className="text-gray-400 max-w-xl mx-auto mb-8 leading-relaxed">
              Únete a VESTA y obtené monitoreo satelital con IA para tu bodega. Alertas predictivas, certificación blockchain y análisis agronómico profesional.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => router.push("/login")}
                className="bg-gradient-to-r from-purple-600 to-emerald-600 hover:from-purple-500 hover:to-emerald-500 text-white font-semibold py-3 px-6 rounded-md transition-all text-sm"
              >
                Acceder a la Plataforma
              </button>
              <button
                onClick={() => handleMenuNavigate("tracking-vino")}
                className="border border-white/10 hover:border-white/20 text-gray-300 hover:text-white font-medium py-3 px-6 rounded-md transition-all text-sm"
              >
                Verificar Botella
              </button>
            </div>
          </div>
        </section>

        {/* ── About ── */}
        <section id="about-us" className="border-t border-white/5 py-10" />
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 bg-[#080916] py-14 mt-0">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div>
              <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <VestaLogo className="w-6 h-7 text-emerald-400" />
                <span className="font-bold text-lg text-white">VESTA</span>
              </Link>
              <p className="text-gray-500 text-sm mt-3 leading-relaxed">
                Plataforma de monitoreo satelital con IA y certificación blockchain para viticultura.
              </p>
            </div>

            {/* Plataforma */}
            <div>
              <h4 className="text-purple-400 font-semibold text-sm mb-4">Plataforma</h4>
              <ul className="space-y-2.5">
                <li><Link href="/login" className="text-gray-400 hover:text-white text-sm transition-colors">Acceso Portal</Link></li>
                <li><button onClick={() => handleMenuNavigate("como-funciona")} className="text-gray-400 hover:text-white text-sm transition-colors">Cómo Funciona</button></li>
                <li><Link href="/collection" className="text-gray-400 hover:text-white text-sm transition-colors">Mi Colección</Link></li>
              </ul>
            </div>

            {/* Recursos */}
            <div>
              <h4 className="text-purple-400 font-semibold text-sm mb-4">Recursos</h4>
              <ul className="space-y-2.5">
                <li><button onClick={() => handleMenuNavigate("about-us")} className="text-gray-400 hover:text-white text-sm transition-colors">Acerca de</button></li>
                <li><button onClick={() => handleMenuNavigate("tracking-vino")} className="text-gray-400 hover:text-white text-sm transition-colors">Verificar Botella</button></li>
                <li><button onClick={() => handleMenuNavigate("como-funciona")} className="text-gray-400 hover:text-white text-sm transition-colors">Documentación</button></li>
              </ul>
            </div>

            {/* Suscríbete */}
            <div>
              <h4 className="text-purple-400 font-semibold text-sm mb-4">Suscríbete</h4>
              <p className="text-gray-500 text-sm mb-3">Recibí novedades y actualizaciones de VESTA.</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Tu email"
                  className="flex-1 bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
                />
                <button className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 rounded-md transition-colors flex items-center gap-1.5 text-sm font-medium">
                  <MailIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Suscribir</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-600">© 2026 VESTA — VendimiaTech. Todos los derechos reservados.</p>
            <div className="flex gap-4">
              <span className="text-xs text-gray-600 hover:text-gray-400 cursor-pointer transition-colors">Privacidad</span>
              <span className="text-xs text-gray-600 hover:text-gray-400 cursor-pointer transition-colors">Términos</span>
              <span className="text-xs text-gray-600 hover:text-gray-400 cursor-pointer transition-colors">Legal</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
