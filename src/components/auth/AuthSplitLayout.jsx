import React from "react";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=1400&q=80";

export default function AuthSplitLayout({
  eyebrow = "Bienvenue",
  title,
  subtitle,
  heroTitle = "Cultivating Community,\nOne Harvest at a Time.",
  heroSubtitle =
    "Join Kind Harvest in our mission to bridge the gap between abundance and need through sustainable food sharing.",
  children,
}) {
  return (
    <div className="min-h-screen bg-[#efefec] flex items-center justify-center px-4 py-6 md:py-10">
      <div className="w-full max-w-5xl overflow-hidden bg-white md:grid md:grid-cols-[1.05fr_1fr] shadow-[0_24px_64px_rgba(0,0,0,0.18)]">
        <aside className="relative hidden md:block min-h-[650px]">
          <img
            src={HERO_IMAGE}
            alt="Vegetables"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-emerald-900/35" />
          <div className="absolute left-7 bottom-7 right-7 text-white">
            <h2 className="text-4xl font-bold leading-tight tracking-tight whitespace-pre-line">
              {heroTitle}
            </h2>
            <p className="mt-4 text-sm text-white/90 max-w-sm leading-relaxed">{heroSubtitle}</p>
          </div>
        </aside>

        <section className="px-7 py-8 md:px-12 md:py-12">
          <div className="relative md:hidden h-44 -mx-7 -mt-8 mb-8 overflow-hidden">
            <img src={HERO_IMAGE} alt="Vegetables" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/30" />
          </div>

          <p className="text-[10px] font-semibold tracking-[0.24em] text-[#f97316] uppercase">{eyebrow}</p>
          <h1 className="mt-2 text-[34px] md:text-[38px] font-extrabold leading-[1.1] text-[#155e2b] tracking-tight">
            {title}
          </h1>
          {subtitle ? <p className="mt-2 text-sm text-gray-500 max-w-md">{subtitle}</p> : null}

          <div className="mt-8">{children}</div>
        </section>
      </div>
    </div>
  );
}
