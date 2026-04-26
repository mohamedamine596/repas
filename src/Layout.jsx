import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import {
  Home,
  PlusCircle,
  List,
  Map,
  MessageCircle,
  User,
  History,
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  Info,
  ChevronLeft,
  ShieldCheck
} from "lucide-react";
import AppLogo from "./components/AppLogo";

const NAV_ITEMS = [
  { name: "Accueil", page: "Home", icon: Home },
  { name: "Tableau de bord", page: "Dashboard", icon: LayoutDashboard },
  { name: "Publier", page: "PublishMeal", icon: PlusCircle, roles: ["DONOR"] },
  { name: "Repas", page: "MealsList", icon: List },
  { name: "Carte", page: "MealMap", icon: Map },
  { name: "Messages", page: "Messages", icon: MessageCircle },
  { name: "Historique", page: "MealHistory", icon: History },
  { name: "Verifications", page: "AdminVerifications", icon: ShieldCheck, roles: ["ADMIN"] },
  { name: "À propos", page: "About", icon: Info },
];

const PUBLIC_LAYOUT_PAGES = new Set([
  "Home",
  "Login",
  "OtpVerification",
  "ForgotPassword",
  "ResetPassword",
]);

export default function Layout({ children, currentPageName }) {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Sync dark mode with system preference
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = (e) => {
      document.documentElement.classList.toggle("dark", e.matches);
    };
    apply(mq);
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const location = useLocation();
  const canGoBack = currentPageName !== "Home";
  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(user?.role)
  );
  const mobileBottomPreferred = user?.role === "ADMIN"
    ? ["Home", "Dashboard", "AdminVerifications", "Messages", "About"]
    : ["Home", "PublishMeal", "MealsList", "MealMap", "Messages"];
  const mobileBottomItems = mobileBottomPreferred
    .map((page) => visibleNavItems.find((item) => item.page === page))
    .filter(Boolean);

  const isPublicPage = PUBLIC_LAYOUT_PAGES.has(currentPageName);

  const handleLogout = () => {
    logout(true);
  };

  if (isPublicPage && !user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#FFF8F0] font-sans">
      {/* Top nav */}
      <header
        className="sticky top-0 z-50 bg-stone-50 border-b border-stone-200 shadow-sm shadow-emerald-900/5"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            {canGoBack && (
              <button
                className="p-1.5 rounded-full text-stone-500 hover:text-emerald-800 hover:bg-emerald-50 transition-colors mr-1"
                onClick={() => navigate(-1)}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <Link to={createPageUrl("Home")} className="flex items-center gap-2 select-none">
              <div className="w-8 h-8 rounded-xl bg-[#1b5e3b] flex items-center justify-center">
                <span className="text-white text-sm font-bold">R</span>
              </div>
              <span className="text-xl font-bold text-emerald-900 tracking-tight hidden sm:block">
                Repas Solidaire
              </span>
            </Link>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPageName === item.page;
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all select-none
                    ${isActive
                      ? "text-emerald-900 border-b-2 border-emerald-900 rounded-none pb-1"
                      : "text-stone-500 hover:text-emerald-800 hover:bg-emerald-50/50"
                    }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            {user && (
              <Link
                to={createPageUrl("Profile")}
                className="hidden md:flex items-center gap-2 text-sm text-stone-600 hover:text-emerald-800 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-[#1b5e3b]/10 flex items-center justify-center text-[#1b5e3b] font-bold text-sm">
                  {(user.name || user.fullName || "U").charAt(0).toUpperCase()}
                </div>
              </Link>
            )}
            <button
              className="hidden md:flex items-center gap-1 text-stone-400 hover:text-red-500 transition-colors text-sm"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
            </button>
            <button
              className="md:hidden p-2 rounded-full text-stone-500 hover:bg-stone-100"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-stone-50 border-t border-stone-200 px-4 py-3 space-y-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPageName === item.page;
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all select-none
                    ${isActive
                      ? "bg-[#1b5e3b] text-white"
                      : "text-stone-600 hover:bg-emerald-50 hover:text-emerald-800"
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
            <Link
              to={createPageUrl("Profile")}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-stone-600 hover:bg-emerald-50"
            >
              <User className="w-5 h-5" />
              Mon Profil
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 w-full"
            >
              <LogOut className="w-5 h-5" />
              Déconnexion
            </button>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-stone-100 shadow-[0_-4px_20px_rgba(27,94,59,0.06)] z-50 rounded-t-3xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center justify-around px-4 pt-2 pb-4">
          {mobileBottomItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPageName === item.page;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all select-none
                  ${isActive
                    ? "bg-emerald-100 text-emerald-900"
                    : "text-stone-400 hover:text-emerald-700"
                  }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-semibold">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}