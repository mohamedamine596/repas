import React from "react";

const IMPACT = [
  { value: "1 200+", label: "Repas partagés" },
  { value: "340+",   label: "Bénéficiaires aidés" },
  { value: "18",     label: "Villes actives" },
];

export default function AuthSplitLayout({
  eyebrow = "Bienvenue",
  title,
  subtitle,
  children,
}) {
  return (
    <div className="min-h-screen bg-[#FFF8F0] font-sans flex items-center justify-center px-4 py-8 md:py-12">
      <div className="w-full max-w-5xl overflow-hidden rounded-3xl shadow-2xl shadow-emerald-900/15 md:grid md:grid-cols-[1fr_1fr]">

        {/* ── Left panel ── */}
        <aside className="relative hidden md:flex flex-col justify-between p-10 bg-gradient-to-br from-[#004527] to-[#1b5e3b] min-h-[600px] overflow-hidden">
          {/* decorative circles */}
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full pointer-events-none" />
          <div className="absolute bottom-0 -left-16 w-48 h-48 bg-white/5 rounded-full pointer-events-none" />

          {/* Logo */}
          <div className="relative z-10 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <span className="text-white font-extrabold text-base">R</span>
            </div>
            <span className="text-white font-extrabold text-lg tracking-tight">Repas Solidaire</span>
          </div>

          {/* Headline */}
          <div className="relative z-10">
            <h2 className="text-4xl font-extrabold text-white leading-tight">
              Des repas en trop ?<br />
              <span className="text-[#aef2c4]">Partagez-les.</span>
            </h2>
            <p className="mt-3 text-sm text-white/70 max-w-xs leading-relaxed">
              Rejoignez la communauté Repas Solidaire et contribuez à lutter contre le gaspillage alimentaire.
            </p>

            {/* Mini impact stats */}
            <div className="mt-8 grid grid-cols-3 gap-3">
              {IMPACT.map((s, i) => (
                <div key={i} className="bg-white/10 rounded-2xl p-3 text-center backdrop-blur-sm">
                  <p className="text-xl font-extrabold text-[#aef2c4]">{s.value}</p>
                  <p className="text-[10px] text-white/60 uppercase tracking-wide leading-tight mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="relative z-10 text-[10px] text-white/40 uppercase tracking-widest">
            Une initiative de Solidarité Sans Frontières
          </p>
        </aside>

        {/* ── Right panel (form) ── */}
        <section className="bg-white px-7 py-9 md:px-12 md:py-12 flex flex-col justify-center">
          {/* Mobile brand header */}
          <div className="flex items-center gap-2 mb-7 md:hidden">
            <div className="w-8 h-8 rounded-xl bg-[#1b5e3b] flex items-center justify-center">
              <span className="text-white font-bold text-sm">R</span>
            </div>
            <span className="font-extrabold text-emerald-900 text-lg">Repas Solidaire</span>
          </div>

          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#813e44]">{eyebrow}</p>
          <h1 className="mt-2 text-2xl md:text-3xl font-extrabold text-[#004527] leading-snug">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 text-sm text-stone-400 max-w-sm leading-relaxed">{subtitle}</p>
          )}

          <div className="mt-7">{children}</div>
        </section>
      </div>
    </div>
  );
}
