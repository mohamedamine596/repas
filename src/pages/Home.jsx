import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useSEO } from "@/hooks/useSEO";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import { ArrowRight, MapPin, Users, Gift, Shield, Leaf, Heart, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import MealCard from "../components/meals/MealCard";
import { backendApi } from "@/api/backendClient";

export default function Home() {
  useSEO({
    title: "Repas Solidaire "” Donnez ou trouvez des repas gratuits près de chez vous",
    description: "Plateforme gratuite de partage de repas en France. Donnez vos surplus alimentaires ou trouvez des repas offerts près de chez vous. Anti-gaspillage & solidarité alimentaire.",
    url: "https://repas-sable.vercel.app/",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Repas Solidaire "” Accueil",
      "description": "Plateforme gratuite de partage de repas et de lutte contre le gaspillage alimentaire en France.",
      "url": "https://repas-sable.vercel.app/",
      "inLanguage": "fr-FR"
    }
  });
  const { user } = useAuth();
  const [recentMeals, setRecentMeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    backendApi.meals.list({ status: "available" }, "-created_date", 6)
      .then((data) => setRecentMeals(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    { value: "1 200+", label: "Repas partagés", color: "text-[#813e44]" },
    { value: "340+",   label: "Bénéficiaires",  color: "text-[#004527]" },
    { value: "18",     label: "Villes actives",  color: "text-[#1b5e3b]" },
  ];

  const features = [
    {
      icon: Gift,
      title: "Donnez facilement",
      desc: "Publiez un repas en quelques clics et aidez une personne dans le besoin.",
      bg: "bg-emerald-50",
      iconColor: "text-[#1b5e3b]",
    },
    {
      icon: MapPin,
      title: "Trouvez Ã  proximité",
      desc: "Découvrez les repas disponibles autour de vous grâce Ã  la géolocalisation.",
      bg: "bg-amber-50",
      iconColor: "text-amber-700",
    },
    {
      icon: Users,
      title: "Connectez-vous",
      desc: "Échangez directement avec les donneurs et réservez en un instant.",
      bg: "bg-blue-50",
      iconColor: "text-blue-700",
    },
    {
      icon: Shield,
      title: "En toute confiance",
      desc: "Un système de signalement pour garantir la qualité et la sécurité.",
      bg: "bg-rose-50",
      iconColor: "text-rose-700",
    },
  ];

  return (
    <div className="min-h-screen bg-[#FFF8F0] font-sans">

      {/* â”€â”€ Unauthenticated top nav â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {!user && (
        <header className="sticky top-0 z-50 bg-stone-50 border-b border-stone-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#1b5e3b] flex items-center justify-center">
                <span className="text-white text-sm font-bold">R</span>
              </div>
              <span className="text-xl font-bold text-emerald-900 tracking-tight">Repas Solidaire</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" className="text-emerald-800 font-medium hover:bg-emerald-50" asChild>
                <Link to={createPageUrl("Login")}>Connexion</Link>
              </Button>
              <Button className="bg-[#1b5e3b] hover:bg-[#004527] text-white rounded-full px-5" asChild>
                <Link to={createPageUrl("Login")}>S'inscrire</Link>
              </Button>
            </div>
          </div>
        </header>
      )}

      {/* â”€â”€ Hero â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="relative bg-[#f2f4ef] overflow-hidden">
        {/* Background image with gradient */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1600&q=80"
            alt="Repas partagé"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#004527]/90 via-[#1b5e3b]/70 to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 md:py-36">
          <motion.div
            className="max-w-xl"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white/90 text-xs font-semibold uppercase tracking-widest mb-4 backdrop-blur-sm">
              <Leaf className="w-3 h-3" /> Solidarité Sans Frontières
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight">
              Des repas en trop ?<br />
              <span className="text-[#aef2c4]">Partagez-les.</span>
            </h1>
            <p className="mt-5 text-lg text-white/75 leading-relaxed max-w-md">
              Donnez vos surplus alimentaires Ã  des personnes dans le besoin,
              près de chez vous. Simple, gratuit et solidaire.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={createPageUrl("PublishMeal")}>
                <Button className="bg-white text-[#004527] hover:bg-[#aef2c4] rounded-full h-12 px-7 text-base font-semibold shadow-lg">
                  <Gift className="w-4 h-4 mr-2" />
                  Donner un repas
                </Button>
              </Link>
              <Link to={createPageUrl("MealsList")}>
                <Button variant="outline" className="border-white/50 text-white hover:bg-white/10 rounded-full h-12 px-7 text-base">
                  Voir les repas
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Wave divider */}
        <div className="relative z-10">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="block w-full -mb-1">
            <path d="M0 60 L0 30 Q360 0 720 30 Q1080 60 1440 30 L1440 60 Z" fill="#FFF8F0" />
          </svg>
        </div>
      </section>

      {/* â”€â”€ Impact counters â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="max-w-7xl mx-auto px-6 -mt-2 mb-16">
        <div className="bg-white rounded-[32px] shadow-xl shadow-emerald-900/8 border border-stone-100 p-8">
          <div className="grid grid-cols-3 gap-4 divide-x divide-stone-100">
            {stats.map((s, i) => (
              <motion.div
                key={i}
                className="text-center px-4"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 + 0.3 }}
              >
                <p className={`text-3xl md:text-4xl font-extrabold ${s.color}`}>{s.value}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-stone-400">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* â”€â”€ How it works â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="max-w-7xl mx-auto px-6 py-8 mb-16">
        <div className="text-center mb-12">
          <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold uppercase tracking-widest rounded-full mb-3">
            Fonctionnement
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#191c19]">Comment ça marche ?</h2>
          <p className="mt-2 text-stone-500 text-sm">Une démarche simple et humaine</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="bg-white rounded-2xl p-6 border border-stone-100 hover:shadow-lg hover:shadow-emerald-900/6 hover:-translate-y-1 transition-all duration-300"
            >
              <div className={`w-11 h-11 rounded-2xl ${f.bg} flex items-center justify-center mb-4`}>
                <f.icon className={`w-5 h-5 ${f.iconColor}`} />
              </div>
              <h3 className="font-bold text-[#191c19] text-sm">{f.title}</h3>
              <p className="mt-1.5 text-xs text-stone-500 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* â”€â”€ Recent meals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {recentMeals.length > 0 && (
        <section className="bg-[#f2f4ef] py-16 mb-0">
          {/* wave top */}
          <svg viewBox="0 0 1440 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="block w-full mb-8 -mt-16">
            <path d="M0 0 Q360 40 720 20 Q1080 0 1440 40 L1440 0 Z" fill="#FFF8F0" />
          </svg>
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-[#191c19]">Repas disponibles</h2>
                <p className="mt-1 text-stone-500 text-sm">Les dernières annonces publiées près de chez vous</p>
              </div>
              <Link to={createPageUrl("MealsList")}>
                <Button variant="ghost" className="text-[#1b5e3b] font-semibold hover:bg-emerald-50">
                  Voir tout <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentMeals.map((meal, i) => (
                <motion.div
                  key={meal.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                >
                  <MealCard meal={meal} />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* â”€â”€ CTA banner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="relative overflow-hidden rounded-[32px] bg-[#1b5e3b] p-10 md:p-16 text-center">
          {/* decorative circles */}
          <div className="absolute -top-20 -right-20 w-56 h-56 bg-white/5 rounded-full pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-white/5 rounded-full pointer-events-none" />
          <div className="relative z-10">
            <Sparkles className="w-8 h-8 text-[#aef2c4] mx-auto mb-4" />
            <h2 className="text-2xl md:text-4xl font-extrabold text-white">
              Chaque repas partagé fait la différence
            </h2>
            <p className="mt-3 text-white/70 text-base max-w-lg mx-auto">
              Rejoignez la communauté Repas Solidaire et contribuez Ã  un monde plus généreux.
            </p>
            {!user && (
              <Button
                className="mt-8 bg-[#aef2c4] hover:bg-[#92d5a9] text-[#002110] font-bold rounded-full h-12 px-8 text-base shadow-lg"
                asChild
              >
                <Link to={createPageUrl("Login")}>Rejoindre la communauté</Link>
              </Button>
            )}
            {user && (
              <Button
                className="mt-8 bg-[#aef2c4] hover:bg-[#92d5a9] text-[#002110] font-bold rounded-full h-12 px-8 text-base shadow-lg"
                asChild
              >
                <Link to={createPageUrl("PublishMeal")}>Publier un repas</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* â”€â”€ Footer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <footer className="border-t border-stone-200 bg-stone-50">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#1b5e3b] flex items-center justify-center">
              <span className="text-white text-sm font-bold">R</span>
            </div>
            <div>
              <p className="font-bold text-emerald-900 text-sm">Repas Solidaire</p>
              <p className="text-xs text-stone-400">Une initiative de Solidarité Sans Frontières</p>
            </div>
          </div>
          <p className="text-xs text-stone-400">© 2026 Repas Solidaire "” Tous droits réservés</p>
        </div>
      </footer>
    </div>
  );
}

