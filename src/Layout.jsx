import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import {
  Heart,
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
  ChevronLeft
} from "lucide-react";
import AppLogo from "./components/AppLogo";

const NAV_ITEMS = [
  { name: "Accueil", page: "Home", icon: Home },
  { name: "Tableau de bord", page: "Dashboard", icon: LayoutDashboard },
  { name: "Publier", page: "PublishMeal", icon: PlusCircle },
  { name: "Repas", page: "MealsList", icon: List },
  { name: "Carte", page: "MealMap", icon: Map },
  { name: "Messages", page: "Messages", icon: MessageCircle },
  { name: "Historique", page: "MealHistory", icon: History },
  { name: "À propos", page: "About", icon: Info },
];

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

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

  const isPublicPage = currentPageName === "Home";

  const handleLogout = () => {
    base44.auth.logout();
  };

  if (isPublicPage && !user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      {/* Top nav */}
      <header
        className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-[#f0e8df]"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {canGoBack && (
              <Button
                variant="ghost"
                size="icon"
                className="select-none mr-1 text-gray-500 hover:text-[#1B5E3B]"
                onClick={() => navigate(-1)}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
            )}
            <Link to={createPageUrl("Home")} className="flex items-center gap-2">
              <AppLogo size="sm" showText={true} showTagline={true} />
            </Link>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = currentPageName === item.page;
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all select-none
                    ${isActive
                      ? "bg-[#1B5E3B] text-white"
                      : "text-gray-600 hover:bg-[#f5efe8] hover:text-[#1B5E3B]"
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            {user && (
              <Link
                to={createPageUrl("Profile")}
                className="hidden md:flex items-center gap-2 text-sm text-gray-600 hover:text-[#1B5E3B] transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[#1B5E3B]/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-[#1B5E3B]" />
                </div>
                <span className="font-medium">{user.full_name?.split(' ')[0]}</span>
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:flex text-gray-500 hover:text-red-500"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-[#f0e8df] px-4 py-4 space-y-1 animate-in slide-in-from-top-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = currentPageName === item.page;
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all select-none
                    ${isActive
                      ? "bg-[#1B5E3B] text-white"
                      : "text-gray-600 hover:bg-[#f5efe8]"
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
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-[#f5efe8]"
            >
              <User className="w-5 h-5" />
              Mon Profil
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 w-full"
            >
              <LogOut className="w-5 h-5" />
              Déconnexion
            </button>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -18 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-[#f0e8df] z-50"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center justify-around py-2">
          {[NAV_ITEMS[0], NAV_ITEMS[2], NAV_ITEMS[3], NAV_ITEMS[4], NAV_ITEMS[5]].map((item) => {
            const Icon = item.icon;
            const isActive = currentPageName === item.page;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all select-none
                  ${isActive ? "text-[#1B5E3B]" : "text-gray-400"}`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}