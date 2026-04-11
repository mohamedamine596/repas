import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Truck, Package, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const FOOD_LABELS = {
  repas_complet: "Repas complet",
  fruits_legumes: "Fruits & Légumes",
  pain_patisserie: "Pain & Pâtisserie",
  conserves: "Conserves",
  boissons: "Boissons",
  produits_laitiers: "Produits laitiers",
  autre: "Autre",
};

const FOOD_EMOJIS = {
  repas_complet: "🍲",
  fruits_legumes: "🥗",
  pain_patisserie: "🥖",
  conserves: "🥫",
  boissons: "🥤",
  produits_laitiers: "🧀",
  autre: "🍽️",
};

const STATUS_STYLES = {
  available: "bg-emerald-100 text-emerald-700",
  reserved: "bg-amber-100 text-amber-700",
  collected: "bg-blue-100 text-blue-700",
  delivered: "bg-purple-100 text-purple-700",
  expired: "bg-gray-100 text-gray-500",
};

const STATUS_LABELS = {
  available: "Disponible",
  reserved: "Réservé",
  collected: "Récupéré",
  delivered: "Livré",
  expired: "Expiré",
};

export default function MealCard({ meal, distance }) {
  return (
    <Link
      to={createPageUrl("MealDetail") + `?id=${meal.id}`}
      className="group block bg-white rounded-2xl border border-[#f0e8df] overflow-hidden hover:shadow-lg hover:shadow-[#1B5E3B]/5 transition-all duration-300 hover:-translate-y-1"
    >
      {/* Image / Placeholder */}
      <div className="relative h-44 bg-gradient-to-br from-[#1B5E3B]/5 to-[#E8634A]/5 flex items-center justify-center overflow-hidden">
        {meal.photo_url ? (
          <img src={meal.photo_url} alt={meal.title} className="w-full h-full object-cover" />
        ) : (
          <span className="text-5xl">{FOOD_EMOJIS[meal.food_type] || "🍽️"}</span>
        )}
        <Badge className={`absolute top-3 right-3 ${STATUS_STYLES[meal.status]} border-0 font-medium`}>
          {STATUS_LABELS[meal.status]}
        </Badge>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <p className="text-xs font-medium text-[#E8634A] uppercase tracking-wide">
            {FOOD_LABELS[meal.food_type]}
          </p>
          <h3 className="text-base font-semibold text-gray-900 mt-1 group-hover:text-[#1B5E3B] transition-colors line-clamp-1">
            {meal.title}
          </h3>
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{meal.description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {meal.available_date
              ? format(new Date(meal.available_date), "d MMM, HH:mm", { locale: fr })
              : "—"}
          </span>
          <span className="flex items-center gap-1">
            <Package className="w-3.5 h-3.5" />
            {meal.quantity}
          </span>
          <span className="flex items-center gap-1">
            {meal.delivery_option === "delivery" ? (
              <Truck className="w-3.5 h-3.5" />
            ) : (
              <MapPin className="w-3.5 h-3.5" />
            )}
            {meal.delivery_option === "pickup"
              ? "À récupérer"
              : meal.delivery_option === "delivery"
              ? "Livraison"
              : "Les deux"}
          </span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[#f5efe8]">
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <MapPin className="w-3 h-3" />
            {distance != null ? (
              <span>{distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}</span>
            ) : (
              <span className="truncate max-w-[140px]">{meal.address}</span>
            )}
          </div>
          <span className="text-xs font-medium text-[#1B5E3B] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            Voir <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}