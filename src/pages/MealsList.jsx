import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
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
  const [search, setSearch] = useState("");
  const [foodFilter, setFoodFilter] = useState("all");
  const [deliveryFilter, setDeliveryFilter] = useState("all");
  const [userLocation, setUserLocation] = useState(null);
  const [sortBy, setSortBy] = useState("recent");
  const [locLoading, setLocLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: meals = [], isLoading } = useQuery({
    queryKey: ["availableMeals"],
    queryFn: () => base44.entities.Meal.filter({ status: "available" }, "-created_date", 100),
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
      <div className="space-y-6 pb-24 md:pb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Repas disponibles</h1>
          <p className="text-gray-500 mt-1">Trouvez de la nourriture près de chez vous</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Rechercher un repas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <MobileSelect
            value={foodFilter}
            onValueChange={setFoodFilter}
            placeholder="Type de nourriture"
            options={FOOD_OPTIONS}
            triggerClassName="w-full md:w-48"
          />
          <MobileSelect
            value={deliveryFilter}
            onValueChange={setDeliveryFilter}
            placeholder="Mode de récupération"
            options={DELIVERY_OPTIONS}
            triggerClassName="w-full md:w-48"
          />
          <Button
            variant="outline"
            className="rounded-xl border-[#1B5E3B]/20 text-[#1B5E3B] select-none"
            onClick={() => setSortBy(sortBy === "distance" ? "recent" : "distance")}
            disabled={!userLocation}
          >
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            {sortBy === "distance" ? "Par distance" : "Récent"}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#1B5E3B]" />
          </div>
        ) : filteredMeals.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">Aucun repas trouvé</p>
            <p className="text-gray-400 text-sm mt-2">Essayez de modifier vos filtres</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredMeals.map((meal) => (
              <MealCard key={meal.id} meal={meal} distance={meal.distance} />
            ))}
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}