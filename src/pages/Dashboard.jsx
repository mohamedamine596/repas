import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Gift,
  Package,
  Heart,
  MessageCircle,
  PlusCircle,
  ArrowRight,
  ShieldCheck,
  Search,
} from "lucide-react";
import MealCard from "../components/meals/MealCard";
import PullToRefresh from "../components/PullToRefresh";
import { backendApi } from "@/api/backendClient";

export default function Dashboard() {
  const {
    user,
    token,
    isLoadingAuth,
    navigateToLogin,
    isDonor,
    isReceiver,
    isAdmin,
    isVerifiedDonor,
  } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isLoadingAuth && !user) {
      navigateToLogin();
    }
  }, [isLoadingAuth, user, navigateToLogin]);

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["myMeals"] });
    await queryClient.invalidateQueries({ queryKey: ["myReservations"] });
    await queryClient.invalidateQueries({ queryKey: ["unreadMessages"] });
    await queryClient.invalidateQueries({ queryKey: ["pendingVerifications"] });
  };

  const { data: myMeals = [] } = useQuery({
    queryKey: ["myMeals", user?.email],
    queryFn: async () => {
      return backendApi.meals.listByDonor(user.email, "-created_date", 10);
    },
    enabled: !!user?.email && isDonor,
  });

  const { data: myReservations = [] } = useQuery({
    queryKey: ["myReservations", user?.email],
    queryFn: async () => {
      return backendApi.meals.listByReserver(user.email, "-created_date", 10);
    },
    enabled: !!user?.email && !isAdmin,
  });

  const { data: unreadMessages = [] } = useQuery({
    queryKey: ["unreadMessages", user?.email],
    queryFn: async () => {
      const data = await backendApi.messages.listConversations(token);
      const conversations = Array.isArray(data?.conversations)
        ? data.conversations
        : [];
      return conversations.filter((c) => (c.unreadCount || 0) > 0);
    },
    enabled: !!user?.email && !!token,
  });

  const { data: pendingVerifications = [] } = useQuery({
    queryKey: ["pendingVerifications", token],
    queryFn: async () => {
      const data = await backendApi.admin.listVerifications(token, "PENDING");
      return Array.isArray(data?.verifications) ? data.verifications : [];
    },
    enabled: isAdmin && !!token,
  });

  if (isLoadingAuth || !user) return null;

  const donorStatus = user?.accountStatus;
  const donorStatusMessage =
    donorStatus === "email_pending"
      ? "Verifiez d'abord votre email via le code OTP pour poursuivre l'activation de votre compte donneur."
      : donorStatus === "email_verified"
        ? "Votre email est verifie. Passez maintenant le quiz de securite alimentaire pour continuer."
        : donorStatus === "pending_admin_review"
          ? "Votre quiz est valide. Votre compte est en cours de verification admin (24-48h)."
          : donorStatus === "suspended"
            ? "Votre compte donneur est suspendu. Contactez l'administration pour assistance."
            : "Votre compte donneur n'est pas encore actif.";

  const donorActionLink =
    donorStatus === "email_verified"
      ? createPageUrl("DonorQuiz")
      : createPageUrl("Profile");
  const donorActionLabel =
    donorStatus === "email_verified" ? "Passer le quiz" : "Voir mon statut";

  const stats = isAdmin
    ? [
        {
          title: "Vérifications en attente",
          value: pendingVerifications.length,
          icon: ShieldCheck,
          color: "bg-amber-500",
          bgColor: "bg-amber-50",
        },
        {
          title: "Messages",
          value: unreadMessages.length,
          icon: MessageCircle,
          color: "bg-blue-500",
          bgColor: "bg-blue-50",
        },
      ]
    : isDonor
      ? [
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
        ]
      : [
          {
            title: "Mes récupérations",
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
              Bonjour, {(user.name || user.fullName)?.split(" ")[0] || "ami"} 👋
            </h1>
            <p className="text-gray-500 mt-1">
              Voici un aperçu de votre activité solidaire
            </p>
          </div>
          {isAdmin ? (
            <Link to={createPageUrl("AdminVerifications")}>
              <Button className="bg-[#1B5E3B] hover:bg-[#154d30] text-white rounded-xl">
                <ShieldCheck className="w-4 h-4 mr-2" />
                Gerer les verifications
              </Button>
            </Link>
          ) : isDonor ? (
            isVerifiedDonor ? (
              <Link to={createPageUrl("PublishMeal")}>
                <Button className="bg-[#E8634A] hover:bg-[#d4553e] text-white rounded-xl">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Publier un repas
                </Button>
              </Link>
            ) : (
              <Link to={donorActionLink}>
                <Button className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl">
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  {donorActionLabel}
                </Button>
              </Link>
            )
          ) : (
            <Link to={createPageUrl("MealsList")}>
              <Button className="bg-[#1B5E3B] hover:bg-[#154d30] text-white rounded-xl">
                <Search className="w-4 h-4 mr-2" />
                Rechercher des repas
              </Button>
            </Link>
          )}
        </div>

        {isDonor && !isVerifiedDonor && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4 text-sm text-amber-900">
              {donorStatusMessage}
            </CardContent>
          </Card>
        )}

        {isReceiver && (
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="p-4 text-sm text-emerald-900">
              En tant que receveur, vous pouvez reserver des repas immediatement
              apres inscription.
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card
              key={stat.title}
              className="border-[#dbe5f2] bg-gradient-to-br from-[#f8fbff] to-[#edf4ff] shadow-sm"
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#51627a]">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-[#0f2a57] mt-1">
                      {stat.value}
                    </p>
                  </div>
                  <div
                    className={`w-10 h-10 rounded-xl border border-[#dbe5f2] bg-white ${stat.bgColor} flex items-center justify-center`}
                  >
                    <stat.icon
                      className={`w-5 h-5 ${stat.color.replace("bg-", "text-")}`}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* My recent donations */}
        {isDonor && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Mes derniers dons
              </h2>
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
                  <p className="text-gray-500">
                    Vous n'avez pas encore publie de repas.
                  </p>
                  <Link
                    to={createPageUrl("PublishMeal")}
                    className="mt-4 inline-block"
                  >
                    <Button
                      variant="outline"
                      className="rounded-xl border-[#1B5E3B]/20 text-[#1B5E3B]"
                      disabled={!isVerifiedDonor}
                    >
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
        )}

        {/* My reservations */}
        {!isAdmin && myReservations.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Mes réservations
            </h2>
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
