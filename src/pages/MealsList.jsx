import React, { useState, useEffect } from "react";
import { backendApi } from "@/api/backendClient";
import { useSEO } from "@/hooks/useSEO";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, SlidersHorizontal } from "lucide-react";
import MealCard from "../components/meals/MealCard";
import { MobileSelect } from "../components/ui/MobileSelect";
import PullToRefresh from "../components/PullToRefresh";

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const FOOD_OPTIONS = [
  { value: "all", label: "Tous les types" },
  { value: "repas_complet", label: "🍲 Repas complet" },
  { value: "fruits_legumes", label: "🥗 Fruits & Légumes" },
  { value: "pain_patisserie", label: "🥖 Pain & Pâtisserie" },
  { value: "conserves", label: "🥫 Conserves" },
  { value: "boissons", label: "🥤 Boissons" },
  { value: "produits_laitiers", label: "🧀 Produits laitiers" },
  { value: "autre", label: "🍽️ Autre" },
];

const DELIVERY_OPTIONS = [
  { value: "all", label: "Tous les modes" },
  { value: "pickup", label: "À récupérer" },
  { value: "delivery", label: "Livraison" },
];

export default function MealsList() {
  useSEO({
    title: "Repas disponibles près de chez vous",
    description: "Parcourez tous les repas solidaires disponibles en France. Filtrez par type d'aliment, mode de livraison et distance. Repas gratuits offerts par des donateurs vérifiés.",
    url: "https://repas-sable.vercel.app/MealsList",
  });
  const [search, setSearch] = useState("");
  const [foodFilter, setFoodFilter] = useState("all");
  const [deliveryFilter, setDeliveryFilter] = useState("all");
  const [userLocation, setUserLocation] = useState(null);
  const [sortBy, setSortBy] = useState("recent");
  const [locLoading, setLocLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: meals = [], isLoading } = useQuery({
    queryKey: ["availableMeals"],
    queryFn: async () => {
      return backendApi.meals.list({ status: "available" }, "-created_date", 100);
    },
  });

  const handleRefresh = async () => {
    await queryClient.invalidateQueries(["availableMeals"]);
  };

  const detectLocation = () => {
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSortBy("distance");
        setLocLoading(false);
      },
      () => setLocLoading(false)
    );
  };

  useEffect(() => {
    detectLocation();
  }, []);

  const filteredMeals = meals
    .filter((m) => {
      const matchSearch =
        !search ||
        m.title?.toLowerCase().includes(search.toLowerCase()) ||
        m.description?.toLowerCase().includes(search.toLowerCase());
      const matchFood = foodFilter === "all" || m.food_type === foodFilter;
      const matchDelivery = deliveryFilter === "all" || m.delivery_option === deliveryFilter || m.delivery_option === "both";
      return matchSearch && matchFood && matchDelivery;
    })
    .map((m) => ({
      ...m,
      distance:
        userLocation && m.latitude && m.longitude
          ? getDistance(userLocation.lat, userLocation.lng, m.latitude, m.longitude)
          : null,
    }))
    .sort((a, b) => {
      if (sortBy === "distance" && a.distance != null && b.distance != null) {
        return a.distance - b.distance;
      }
      return new Date(b.created_date) - new Date(a.created_date);
    });

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="pb-24 md:pb-8 -mt-6 -mx-4 sm:-mx-6">

        {/* ── Search hero ─────────────────────────────────────────── */}
        <div className="bg-[#004527] px-6 pt-8 pb-12">
          <h1 className="text-2xl font-extrabold text-white mb-1">Repas disponibles</h1>
          <p className="text-white/60 text-sm mb-5">Trouvez de la nourriture près de chez vous</p>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Rechercher un repas, un ingrédient…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 h-12 rounded-2xl bg-white text-[#191c19] placeholder:text-stone-400 text-sm font-medium outline-none shadow-lg"
            />
          </div>
        </div>

        {/* ── Filter chips (sticky) ────────────────────────────────── */}
        <div className="sticky top-16 z-30 bg-[#FFF8F0] border-b border-stone-200 px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide -mt-0">
          {FOOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFoodFilter(opt.value)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                foodFilter === opt.value
                  ? "bg-[#1b5e3b] text-white border-[#1b5e3b]"
                  : "bg-white text-stone-600 border-stone-200 hover:border-[#1b5e3b] hover:text-[#1b5e3b]"
              }`}
            >
              {opt.label}
            </button>
          ))}
          <div className="w-px bg-stone-200 mx-1 shrink-0" />
          {DELIVERY_OPTIONS.slice(1).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDeliveryFilter(deliveryFilter === opt.value ? "all" : opt.value)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                deliveryFilter === opt.value
                  ? "bg-[#813e44] text-white border-[#813e44]"
                  : "bg-white text-stone-600 border-stone-200 hover:border-[#813e44] hover:text-[#813e44]"
              }`}
            >
              {opt.label}
            </button>
          ))}
          <button
            onClick={() => setSortBy(sortBy === "distance" ? "recent" : "distance")}
            disabled={!userLocation}
            className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all border ${
              sortBy === "distance"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-stone-600 border-stone-200 hover:border-blue-500 hover:text-blue-600"
            } disabled:opacity-40`}
          >
            <SlidersHorizontal className="w-3 h-3 inline mr-1" />
            {sortBy === "distance" ? "Distance" : "Récent"}
          </button>
        </div>

        {/* ── Meal grid ───────────────────────────────────────────── */}
        <div className="px-4 sm:px-6 pt-6">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[#1b5e3b]" />
            </div>
          ) : filteredMeals.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-16 h-16 bg-stone-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <Search className="w-7 h-7 text-stone-400" />
              </div>
              <p className="font-semibold text-stone-600">Aucun repas trouvé</p>
              <p className="text-stone-400 text-sm mt-1">Essayez de modifier vos filtres</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-stone-400 font-semibold uppercase tracking-widest mb-4">
                {filteredMeals.length} repas disponible{filteredMeals.length > 1 ? "s" : ""}
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredMeals.map((meal) => (
                  <MealCard key={meal.id} meal={meal} distance={meal.distance} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </PullToRefresh>
  );
}