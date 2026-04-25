import React, { useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Apple,
  Bell,
  HandHeart,
  Handshake,
  Home,
  Menu,
  Settings,
  ShieldCheck,
  TriangleAlert,
  Users,
  UserRound,
  X,
  Search,
} from "lucide-react";

const SIDEBAR_SECTIONS = [
  {
    title: "Pilotage",
    links: [
      { to: "/admin/overview", label: "Vue d'ensemble", icon: Home },
      { to: "/admin/donations", label: "Donations", icon: Apple },
      { to: "/admin/reports", label: "Signalements", icon: TriangleAlert },
    ],
  },
  {
    title: "Utilisateurs",
    links: [
      { to: "/admin/users", label: "Tous les utilisateurs", icon: Users },
      { to: "/admin/donors", label: "Donneurs", icon: UserRound },
      { to: "/admin/receivers", label: "Receveurs", icon: Handshake },
      { to: "/admin/verifications", label: "Verifications", icon: ShieldCheck },
    ],
  },
  {
    title: "Configuration",
    links: [{ to: "/admin/settings", label: "Parametres", icon: Settings }],
  },
];

const SIDEBAR_LINKS = SIDEBAR_SECTIONS.flatMap((section) => section.links);

function isLinkActive(pathname, link) {
  return pathname === link.to || pathname.startsWith(`${link.to}/`);
}

function SidebarNav({ onNavigate }) {
  const location = useLocation();

  return (
    <aside className="h-full w-[240px] bg-[#2D6A1F] text-white flex flex-col">
      <div className="px-5 py-6 border-b border-white/15">
        <Link to="/admin/overview" className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <HandHeart className="w-5 h-5" />
          </span>
          <div>
            <p className="font-semibold text-base leading-tight">Repas</p>
            <p className="text-[11px] uppercase tracking-[0.15em] text-[#F5C77A]">Admin</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-5 overflow-y-auto">
        {SIDEBAR_SECTIONS.map((section) => (
          <div key={section.title} className="mb-5">
            <p className="px-3 pb-1 text-[11px] uppercase tracking-[0.14em] text-white/60">
              {section.title}
            </p>
            <div className="space-y-1">
              {section.links.map((item) => {
                const Icon = item.icon;
                const active = isLinkActive(location.pathname, item);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onNavigate}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      active
                        ? "bg-[#F5C77A] text-[#1A3E14] font-semibold"
                        : "text-white/90 hover:bg-white/10"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-white/15 text-xs text-white/80">
        Tableau d'administration
      </div>
    </aside>
  );
}

export default function AdminShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const location = useLocation();

  const pageTitle = useMemo(() => {
    const match = SIDEBAR_LINKS.find((item) => isLinkActive(location.pathname, item));
    return match ? match.label : "Administration";
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#FAF6EE] text-[#1E293B]">
      <div className="hidden lg:block fixed inset-y-0 left-0 z-40">
        <SidebarNav />
      </div>

      <div className="lg:pl-[240px] min-h-screen">
        <header className="sticky top-0 z-30 bg-[#FFFDF7]/95 backdrop-blur border-b border-[#E7DDCB]">
          <div className="px-4 md:px-6 h-16 flex items-center gap-3 md:gap-4">
            <button
              type="button"
              className="lg:hidden w-10 h-10 rounded-lg border border-[#D8CEBC] bg-white text-[#2D6A1F] flex items-center justify-center"
              onClick={() => setMobileOpen(true)}
              aria-label="Ouvrir le menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.15em] text-[#7B6D59]">Repas</p>
              <h1 className="text-sm md:text-base font-semibold text-[#234D1A] truncate">{pageTitle}</h1>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 bg-white border border-[#E1D7C8] rounded-xl px-3 py-2 min-w-[320px]">
                <Search className="w-4 h-4 text-[#8B7A64]" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Rechercher un donneur, receveur ou donation"
                  className="w-full text-sm bg-transparent outline-none text-[#344054] placeholder:text-[#9B8C79]"
                />
              </div>

              <button
                type="button"
                className="w-10 h-10 rounded-xl bg-white border border-[#E1D7C8] text-[#2D6A1F] flex items-center justify-center"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 bg-white border border-[#E1D7C8] rounded-xl px-2.5 py-1.5">
                <span className="w-8 h-8 rounded-full bg-[#2D6A1F] text-white flex items-center justify-center font-semibold text-sm">
                  SA
                </span>
                <div className="hidden md:block">
                  <p className="text-sm font-semibold text-[#25431E] leading-tight">Sonia Admin</p>
                  <p className="text-[11px] text-[#8B7A64] leading-tight">Super Admin</p>
                </div>
              </div>
            </div>
          </div>

          <div className="md:hidden px-4 pb-3">
            <div className="flex items-center gap-2 bg-white border border-[#E1D7C8] rounded-xl px-3 py-2">
              <Search className="w-4 h-4 text-[#8B7A64]" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher"
                className="w-full text-sm bg-transparent outline-none text-[#344054] placeholder:text-[#9B8C79]"
              />
            </div>
          </div>
        </header>

        <main className="px-4 md:px-6 py-5 md:py-6">
          <Outlet />
        </main>
      </div>

      {mobileOpen ? (
        <div className="lg:hidden fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label="Fermer le menu"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0">
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
          </div>
          <button
            type="button"
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white text-[#2D6A1F] flex items-center justify-center"
            onClick={() => setMobileOpen(false)}
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
