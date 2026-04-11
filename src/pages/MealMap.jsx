import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Loader2, Navigation } from "lucide-react";
import MealStatusBadge from "../components/meals/MealStatusBadge";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const mealIcon = new L.Icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

export default function MealMap() {
  const [center, setCenter] = useState([48.8566, 2.3522]); // Paris default
  const [userPos, setUserPos] = useState(null);

  const { data: meals = [], isLoading } = useQuery({
    queryKey: ["mapMeals"],
    queryFn: () => base44.entities.Meal.filter({ status: "available" }, "-created_date", 200),
  });

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        setCenter(coords);
        setUserPos(coords);
      },
      () => {}
    );
  }, []);

  const mealsWithCoords = meals.filter((m) => m.latitude && m.longitude);

  return (
    <div className="space-y-4 pb-24 md:pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Carte des repas</h1>
          <p className="text-gray-500 mt-1">{mealsWithCoords.length} repas sur la carte</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#1B5E3B]" />
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden border border-[#f0e8df] shadow-lg" style={{ height: "calc(100vh - 220px)" }}>
          <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {mealsWithCoords.map((meal) => (
              <Marker key={meal.id} position={[meal.latitude, meal.longitude]} icon={mealIcon}>
                <Popup>
                  <div className="p-1 min-w-[180px]">
                    <h3 className="font-semibold text-sm">{meal.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">{meal.quantity}</p>
                    <p className="text-xs text-gray-400 mt-1">{meal.address}</p>
                    <Link to={createPageUrl("MealDetail") + `?id=${meal.id}`}>
                      <Button size="sm" className="mt-2 w-full bg-[#1B5E3B] hover:bg-[#154d30] text-white text-xs rounded-lg h-7">
                        Voir le détail
                      </Button>
                    </Link>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}
    </div>
  );
}