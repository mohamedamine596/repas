import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, Package, Heart, MessageCircle, PlusCircle, ArrowRight } from "lucide-react";
import MealCard from "../components/meals/MealCard";
import PullToRefresh from "../components/PullToRefresh";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => base44.auth.redirectToLogin());
  }, []);

  const handleRefresh = async () => {
    await queryClient.invalidateQueries(["myMeals"]);
    await queryClient.invalidateQueries(["myReservations"]);
    await queryClient.invalidateQueries(["unreadMessages"]);
  };

  const { data: myMeals = [] } = useQuery({
    queryKey: ["myMeals", user?.email],
    queryFn: () => base44.entities.Meal.filter({ donor_email: user.email }, "-created_date", 10),
    enabled: !!user?.email,
  });

  const { data: myReservations = [] } = useQuery({
    queryKey: ["myReservations", user?.email],
    queryFn: () => base44.entities.Meal.filter({ reserved_by: user.email }, "-created_date", 10),
    enabled: !!user?.email,
  });

  const { data: unreadMessages = [] } = useQuery({
    queryKey: ["unreadMessages", user?.email],
    queryFn: () => base44.entities.Message.filter({ receiver_email: user.email, is_read: false }),
    enabled: !!user?.email,
  });

  if (!user) return null;

  const stats = [
    {
      title: "Mes dons",
      value: myMeals.length,
      icon: Gift,
      color: "bg-emerald-500",
      bgColor: "bg-emerald-50",
    },
    {
      title: "Disponibles",
      value: myMeals.filter((m) => m.status === "available").length,
      icon: Package,
      color: "bg-[#E8634A]",
      bgColor: "bg-orange-50",
    },
    {
      title: "Récupérations",
      value: myReservations.length,
      icon: Heart,
      color: "bg-purple-500",
      bgColor: "bg-purple-50",
    },
    {
      title: "Messages",
      value: unreadMessages.length,
      icon: MessageCircle,
      color: "bg-blue-500",
      bgColor: "bg-blue-50",
    },
  ];

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="space-y-8 pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bonjour, {user.full_name?.split(" ")[0] || "ami"} 👋
          </h1>
          <p className="text-gray-500 mt-1">Voici un aperçu de votre activité solidaire</p>
        </div>
        <Link to={createPageUrl("PublishMeal")}>
          <Button className="bg-[#E8634A] hover:bg-[#d4553e] text-white rounded-xl">
            <PlusCircle className="w-4 h-4 mr-2" />
            Publier un repas
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-[#f0e8df]">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.color.replace("bg-", "text-")}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* My recent donations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Mes derniers dons</h2>
          <Link to={createPageUrl("MealHistory")}>
            <Button variant="ghost" className="text-[#1B5E3B] text-sm">
              Tout voir <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>
        {myMeals.length === 0 ? (
          <Card className="border-[#f0e8df] border-dashed">
            <CardContent className="p-8 text-center">
              <Gift className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Vous n'avez pas encore publié de repas.</p>
              <Link to={createPageUrl("PublishMeal")} className="mt-4 inline-block">
                <Button variant="outline" className="rounded-xl border-[#1B5E3B]/20 text-[#1B5E3B]">
                  Publier mon premier repas
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myMeals.slice(0, 3).map((meal) => (
              <MealCard key={meal.id} meal={meal} />
            ))}
          </div>
        )}
      </div>

      {/* My reservations */}
      {myReservations.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Mes réservations</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myReservations.slice(0, 3).map((meal) => (
              <MealCard key={meal.id} meal={meal} />
            ))}
          </div>
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}