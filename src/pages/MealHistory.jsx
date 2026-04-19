import React, { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { backendApi } from "@/api/backendClient";
import { useAuth } from "@/lib/AuthContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Gift, Heart } from "lucide-react";
import MealCard from "../components/meals/MealCard";

export default function MealHistory() {
  const { user, isLoadingAuth, navigateToLogin } = useAuth();

  useEffect(() => {
    if (!isLoadingAuth && !user) {
      navigateToLogin();
    }
  }, [isLoadingAuth, user, navigateToLogin]);

  const { data: myDonations = [], isLoading: loadingDonations } = useQuery({
    queryKey: ["historyDonations", user?.email],
    queryFn: async () => {
      return backendApi.meals.list({ donor_email: user.email }, "-created_date", 100);
    },
    enabled: !!user?.email,
  });

  const { data: myReservations = [], isLoading: loadingReservations } = useQuery({
    queryKey: ["historyReservations", user?.email],
    queryFn: async () => {
      return backendApi.meals.list({ reserved_by: user.email }, "-created_date", 100);
    },
    enabled: !!user?.email,
  });

  if (isLoadingAuth || !user) return null;

  const isLoading = loadingDonations || loadingReservations;

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Historique</h1>
        <p className="text-gray-500 mt-1">Vos dons et récupérations</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#1B5E3B]" />
        </div>
      ) : (
        <Tabs defaultValue="donations">
          <TabsList className="bg-[#f5efe8]">
            <TabsTrigger value="donations" className="data-[state=active]:bg-[#1B5E3B] data-[state=active]:text-white">
              <Gift className="w-4 h-4 mr-2" />
              Mes dons ({myDonations.length})
            </TabsTrigger>
            <TabsTrigger value="reservations" className="data-[state=active]:bg-[#1B5E3B] data-[state=active]:text-white">
              <Heart className="w-4 h-4 mr-2" />
              Récupérations ({myReservations.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="donations" className="mt-6">
            {myDonations.length === 0 ? (
              <div className="text-center py-16">
                <Gift className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400">Aucun don pour le moment</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {myDonations.map((meal) => (
                  <MealCard key={meal.id} meal={meal} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reservations" className="mt-6">
            {myReservations.length === 0 ? (
              <div className="text-center py-16">
                <Heart className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400">Aucune récupération pour le moment</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {myReservations.map((meal) => (
                  <MealCard key={meal.id} meal={meal} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}