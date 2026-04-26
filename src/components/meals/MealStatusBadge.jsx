import React from "react";
import { Badge } from "@/components/ui/badge";

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

export default function MealStatusBadge({ status }) {
  return (
    <Badge className={`${STATUS_STYLES[status]} border-0 font-medium`}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
