/**
 * AdminShell - Layout principal pour le tableau de bord administrateur Kind Harvest
 * Sidebar fixe 210px + topbar + zone de contenu principal
 * Toutes les routes admin sont rendues à l'intérieur de ce layout
 */
import React, { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Home,
  Users,
  ChevronRight,
  Apple,
  TriangleAlert,
  Settings,
  Search,
  Bell,
  Menu,
  X,
} from "lucide-react";
import { getOpenReportsCount } from "../mockDataFrench";

const BRAND_COLORS = {
  sidebarBg: "#1a3a0f",
  primaryGreen: "#2d6a1f",
  accentGreen: "#4a9e28",
  lightGreenFill: "#EAF3DE",
};

// Section Utilisateurs (expandable)
const UTILISATEURS_LINKS = [
  { to: "/admin/restaurants", label: "Restaurants" },
  { to: "/admin/receveurs", label: "Receveurs" },
];

function SidebarLogo() {
  return (
    <Link
      to="/admin"
      className="flex items-center gap-3 px-4 py-5 border-b"
      style={{ borderColor: "rgba(255,255,255,0.1)" }}
    >
      {/* Logo icon - green square with leaf */}
      <div
        className="w-10 h-10 rounded flex items-center justify-center text-white font-bold text-lg"
        style={{ backgroundColor: BRAND_COLORS.accentGreen }}
      >
        🌱
      </div>
      <span className="text-white font-semibold text-lg">Kind Harvest</span>
    </Link>
  );
}

function AdminProfileBlock() {
  const adminName = "Admin Principal";
  const initials = "AP";

  return (
    <div
      className="px-4 py-4 border-b"
      style={{ borderColor: "rgba(255,255,255,0.1)" }}
    >
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
        Administrateur
      </p>
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold"
          style={{ backgroundColor: BRAND_COLORS.primaryGreen }}
        >
          {initials}
        </div>
        <span className="text-white text-sm font-medium">{adminName}</span>
      </div>
    </div>
  );
}

function SidebarNav({ utilisateursOpen, toggleUtilisateurs, onNavigate }) {
  const location = useLocation();
  const openReportsCount = getOpenReportsCount();

  const mainLinks = [
    { to: "/admin", label: "Vue d'ensemble", icon: Home },
    { to: "/admin/donations", label: "Donations", icon: Apple },
    {
      to: "/admin/signalements",
      label: "Signalements",
      icon: TriangleAlert,
      badge: openReportsCount > 0 ? openReportsCount : null,
    },
  ];

  const isActive = (to) => {
    if (to === "/admin") {
      return (
        location.pathname === "/admin" ||
        location.pathname === "/admin/overview"
      );
    }
    return location.pathname.startsWith(to);
  };

  return (
    <nav className="px-3 py-4 space-y-1">
      {/* Main links */}
      {mainLinks.map((link) => {
        const Icon = link.icon;
        const active = isActive(link.to);
        return (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors relative ${
              active
                ? "text-white font-medium"
                : "text-gray-300 hover:text-white hover:bg-white/5"
            }`}
            style={
              active
                ? {
                    backgroundColor: "rgba(74, 158, 40, 0.15)",
                    borderLeft: `3px solid ${BRAND_COLORS.accentGreen}`,
                  }
                : {}
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1">{link.label}</span>
            {link.badge && (
              <span
                className="px-2 py-0.5 rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: "#dc2626" }}
              >
                {link.badge}
              </span>
            )}
          </NavLink>
        );
      })}

      {/* Utilisateurs section (expandable) */}
      <div className="pt-2">
        <button
          onClick={toggleUtilisateurs}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
        >
          <Users className="w-5 h-5 flex-shrink-0" />
          <span className="flex-1 text-left">Utilisateurs</span>
          <ChevronRight
            className={`w-4 h-4 transition-transform ${utilisateursOpen ? "rotate-90" : ""}`}
          />
        </button>

        {/* Sub-links */}
        {utilisateursOpen && (
          <div className="mt-1 space-y-0.5 ml-8">
            {UTILISATEURS_LINKS.map((link) => {
              const active = isActive(link.to);
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={onNavigate}
                  className={`flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
                    active
                      ? "text-white font-medium"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0"></span>
                  <span>{link.label}</span>
                </NavLink>
              );
            })}
          </div>
        )}
      </div>

      {/* Settings link */}
      <div className="pt-2">
        <NavLink
          to="/admin/parametres"
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              isActive
                ? "text-white font-medium bg-white/10"
                : "text-gray-300 hover:text-white hover:bg-white/5"
            }`
          }
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          <span>Paramètres</span>
        </NavLink>
      </div>
    </nav>
  );
}

function TopNavbar({ onToggleSidebar, isMobile }) {
  const location = useLocation();
  const openReportsCount = getOpenReportsCount();

  // Determine page title based on route
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === "/admin" || path === "/admin/overview")
      return "Vue d'ensemble";
    if (path.startsWith("/admin/restaurants")) return "Restaurants partenaires";
    if (path.startsWith("/admin/receveurs")) return "Receveurs";
    if (path.startsWith("/admin/donations")) return "Donations";
    if (path.startsWith("/admin/signalements")) return "Signalements";
    if (path.startsWith("/admin/parametres")) return "Paramètres";
    return "Administration";
  };

  return (
    <div className="h-[52px] bg-white border-b border-gray-200 px-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {isMobile && (
          <button
            onClick={onToggleSidebar}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
        )}
        <h1 className="text-lg font-semibold text-gray-800">
          {getPageTitle()}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Search bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher..."
            className="w-[180px] pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        {/* Notification bell */}
        <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5 text-gray-600" />
          {openReportsCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          )}
        </button>
      </div>
    </div>
  );
}

export default function AdminShellNew() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [utilisateursOpen, setUtilisateursOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const toggleUtilisateurs = () => setUtilisateursOpen(!utilisateursOpen);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[210px] transform transition-transform duration-300 ${
          isMobile && !sidebarOpen ? "-translate-x-full" : "translate-x-0"
        }`}
        style={{ backgroundColor: BRAND_COLORS.sidebarBg }}
      >
        {/* Mobile close button */}
        {isMobile && (
          <button
            onClick={closeSidebar}
            className="absolute top-4 right-4 p-1 text-white hover:bg-white/10 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <SidebarLogo />
        <AdminProfileBlock />
        <SidebarNav
          utilisateursOpen={utilisateursOpen}
          toggleUtilisateurs={toggleUtilisateurs}
          onNavigate={isMobile ? closeSidebar : undefined}
        />
      </aside>

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={closeSidebar}
        ></div>
      )}

      {/* Main content */}
      <div className={`flex-1 flex flex-col ${!isMobile ? "ml-[210px]" : ""}`}>
        <TopNavbar onToggleSidebar={toggleSidebar} isMobile={isMobile} />
        <main className="flex-1 overflow-auto p-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
