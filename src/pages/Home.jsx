import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Heart, ArrowRight, MapPin, Users, Gift, Shield } from "lucide-react";
import { motion } from "framer-motion";
import MealCard from "../components/meals/MealCard";
import AppLogo from "../components/AppLogo";

export default function Home() {
  const [user, setUser] = useState(null);
  const [recentMeals, setRecentMeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    base44.entities.Meal.filter({ status: "available" }, "-created_date", 6)
      .then(setRecentMeals)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const features = [
    {
      icon: Gift,
      title: "Donnez facilement",
      desc: "Publiez un repas en quelques clics et aidez une personne dans le besoin."
    },
    {
      icon: MapPin,
      title: "Trouvez à proximité",
      desc: "Découvrez les repas disponibles autour de vous grâce à la géolocalisation."
    },
    {
      icon: Users,
      title: "Connectez-vous",
      desc: "Échangez directement avec les donneurs et réservez en un instant."
    },
    {
      icon: Shield,
      title: "En toute confiance",
      desc: "Un système de signalement pour garantir la qualité et la sécurité."
    },
  ];

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Navbar for unauthenticated */}
        {!user && (
          <nav className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AppLogo size="md" showText={true} showTagline={true} />
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                className="text-[#1B5E3B] font-medium"
                onClick={() => base44.auth.redirectToLogin()}
              >
                Connexion
              </Button>
              <Button
                className="bg-[#1B5E3B] hover:bg-[#154d30] text-white rounded-xl"
                onClick={() => base44.auth.redirectToLogin()}
              >
                S'inscrire
              </Button>
            </div>
          </nav>
        )}

        <div className="max-w-7xl mx-auto px-6 pt-16 pb-24 md:pt-24 md:pb-32">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-block px-4 py-1.5 rounded-full bg-[#1B5E3B]/10 text-[#1B5E3B] text-sm font-medium mb-3">
                🤝 Ensemble contre le gaspillage
              </span>
              <p className="text-xs text-gray-400 mb-5">Une initiative de l'association <span className="font-semibold text-[#1B5E3B]">Solidarité Sans Frontières</span></p>
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight">
                Partagez un repas,
                <br />
                <span className="text-[#1B5E3B]">changez une vie</span>
              </h1>
              <p className="mt-6 text-lg text-gray-500 leading-relaxed max-w-lg">
                Donnez vos repas encore consommables à des personnes dans le besoin, 
                près de chez vous. Simple, gratuit et solidaire.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                {user ? (
                  <>
                    <Link to={createPageUrl("PublishMeal")}>
                      <Button className="bg-[#E8634A] hover:bg-[#d4553e] text-white rounded-xl h-12 px-6 text-base">
                        <Gift className="w-5 h-5 mr-2" />
                        Donner un repas
                      </Button>
                    </Link>
                    <Link to={createPageUrl("MealsList")}>
                      <Button variant="outline" className="rounded-xl h-12 px-6 text-base border-[#1B5E3B]/20 text-[#1B5E3B] hover:bg-[#1B5E3B]/5">
                        Voir les repas
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Button
                      className="bg-[#E8634A] hover:bg-[#d4553e] text-white rounded-xl h-12 px-6 text-base"
                      onClick={() => base44.auth.redirectToLogin()}
                    >
                      Commencer maintenant
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          </div>

          {/* Decorative circles */}
          <div className="absolute top-20 right-10 w-72 h-72 bg-[#1B5E3B]/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-10 right-40 w-48 h-48 bg-[#E8634A]/5 rounded-full blur-3xl pointer-events-none" />
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Comment ça marche ?</h2>
          <p className="mt-3 text-gray-500">Une démarche simple et humaine</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="bg-white rounded-2xl p-6 border border-[#f0e8df] hover:shadow-lg hover:shadow-[#1B5E3B]/5 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-[#1B5E3B]/10 flex items-center justify-center mb-4">
                <f.icon className="w-6 h-6 text-[#1B5E3B]" />
              </div>
              <h3 className="font-semibold text-gray-900">{f.title}</h3>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Recent meals */}
      {recentMeals.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 py-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Repas disponibles</h2>
              <p className="mt-2 text-gray-500">Les dernières annonces publiées</p>
            </div>
            <Link to={createPageUrl("MealsList")}>
              <Button variant="ghost" className="text-[#1B5E3B] font-medium">
                Voir tout <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentMeals.map((meal) => (
              <MealCard key={meal.id} meal={meal} />
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="bg-[#1B5E3B] rounded-3xl p-8 md:p-16 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative z-10">
            <h2 className="text-2xl md:text-4xl font-bold text-white">
              Chaque repas partagé fait la différence
            </h2>
            <p className="mt-4 text-white/70 text-lg max-w-lg mx-auto">
              Rejoignez la communauté Repas Solidaire et contribuez à un monde plus généreux.
            </p>
            {!user && (
              <Button
                className="mt-8 bg-[#E8634A] hover:bg-[#d4553e] text-white rounded-xl h-12 px-8 text-base"
                onClick={() => base44.auth.redirectToLogin()}
              >
                Rejoindre la communauté
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-10 border-t border-[#f0e8df]">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start gap-1">
            <AppLogo size="sm" showText={true} showTagline={false} />
            <p className="text-xs text-[#1B5E3B] font-medium mt-1">Une initiative de l'association Solidarité Sans Frontières</p>
          </div>
          <div className="text-center md:text-right space-y-1">
            <p className="text-sm font-semibold text-gray-700">Association Solidarité Sans Frontières</p>
            <p className="text-xs text-gray-400">France</p>
            <p className="text-xs text-gray-400">Plateforme solidaire de partage de repas.</p>
            <p className="text-xs text-gray-400 mt-2">© 2026 Repas Solidaire. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}