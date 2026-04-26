import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { MapPin, Clock, Truck, ArrowRight } from "lucide-react";
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
  confirmed: "bg-emerald-200 text-emerald-800",
  collected: "bg-blue-100 text-blue-700",
  delivered: "bg-purple-100 text-purple-700",
  expired: "bg-gray-100 text-gray-500",
};

const STATUS_LABELS = {
  available: "Disponible",
  reserved: "Réservé",
  confirmed: "Confirmé",
  collected: "Récupéré",
  delivered: "Livré",
  expired: "Expiré",
};

export default function MealCard({ meal, distance }) {
  return (
    <Link
      to={createPageUrl("MealDetail") + `?id=${meal.id}`}
      className="group block bg-white rounded-2xl overflow-hidden border border-stone-100 hover:shadow-xl hover:shadow-emerald-900/8 hover:-translate-y-1 transition-all duration-300"
    >
      {/* Image / Placeholder */}
      <div className="relative h-48 bg-gradient-to-br from-emerald-50 to-stone-100 flex items-center justify-center overflow-hidden">
        {meal.photo_url ? (
          <img
            src={meal.photo_url}
            alt={meal.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-6xl opacity-70">
            {FOOD_EMOJIS[meal.food_type] || "🍽️"}
          </span>
        )}
        {/* Portions badge */}
        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#1b5e3b] text-white text-[10px] font-bold uppercase tracking-wide shadow-sm">
          {meal.quantity || "?"}
        </span>
        {/* Status / expiry badge */}
        <span
          className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide shadow-sm ${STATUS_STYLES[meal.status]}`}
        >
          {STATUS_LABELS[meal.status]}
        </span>
      </div>

      <div className="p-4">
        {/* Food type label */}
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#813e44] mb-1">
          {FOOD_EMOJIS[meal.food_type]} {FOOD_LABELS[meal.food_type] || "Repas"}
        </p>
        <h3 className="font-bold text-[#191c19] text-sm leading-snug line-clamp-1 group-hover:text-[#1b5e3b] transition-colors">
          {meal.title}
        </h3>
        <p className="text-xs text-stone-400 mt-1 line-clamp-2 leading-relaxed">
          {meal.description}
        </p>

        {/* Meta row */}
        <div className="flex items-center gap-3 mt-3 text-xs text-stone-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {meal.expiresAt || meal.expires_at || meal.available_date
              ? format(
                  new Date(
                    meal.expiresAt || meal.expires_at || meal.available_date,
                  ),
                  "d MMM, HH:mm",
                  { locale: fr },
                )
              : "—"}
          </span>
          <span className="flex items-center gap-1">
            {meal.delivery_option === "delivery" ? (
              <Truck className="w-3 h-3" />
            ) : (
              <MapPin className="w-3 h-3" />
            )}
            {meal.delivery_option === "pickup"
              ? "À récupérer"
              : meal.delivery_option === "delivery"
                ? "Livraison"
                : "Les deux"}
          </span>
        </div>

        {/* Location / distance */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-100">
          <div className="flex items-center gap-1 text-xs text-stone-400">
            <MapPin className="w-3 h-3" />
            {distance != null ? (
              <span className="font-medium text-emerald-700">
                {distance < 1
                  ? `${Math.round(distance * 1000)}m`
                  : `${distance.toFixed(1)}km`}
              </span>
            ) : (
              <span className="truncate max-w-[140px]">{meal.address}</span>
            )}
          </div>
          <span className="text-xs font-semibold text-[#1b5e3b] flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            Voir <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}
