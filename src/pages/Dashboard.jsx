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

  // Donor: meals that have been reserved but not yet confirmed
  const pendingDonorReservations = myMeals.filter(
    (m) => m.status === "reserved",
  );

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
      <div className="space-y-7 pb-24 md:pb-8">
        {/* ── Greeting bar ──────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-[#004527] to-[#1b5e3b] rounded-3xl px-6 py-5 text-white">
          <div>
            <p className="text-white/60 text-xs uppercase tracking-widest font-semibold mb-1">
              Tableau de bord
            </p>
            <h1 className="text-xl font-extrabold">
              Bonjour, {user.name || user.fullName || "ami"} 👋
            </h1>
            <p className="text-white/60 text-sm mt-0.5">
              Voici un aperçu de votre activité solidaire
            </p>
          </div>
          {isAdmin ? (
            <Link to={createPageUrl("AdminVerifications")}>
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-sm font-semibold transition-colors backdrop-blur-sm">
                <ShieldCheck className="w-4 h-4" />
                Gérer les vérifications
              </button>
            </Link>
          ) : isDonor ? (
            isVerifiedDonor ? (
              <Link to={createPageUrl("PublishMeal")}>
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#aef2c4] hover:bg-[#92d5a9] text-[#002110] text-sm font-bold transition-colors">
                  <PlusCircle className="w-4 h-4" />
                  Publier un repas
                </button>
              </Link>
            ) : (
              <Link to={donorActionLink}>
                <button className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-amber-900 text-sm font-bold transition-colors">
                  <ShieldCheck className="w-4 h-4" />
                  {donorActionLabel}
                </button>
              </Link>
            )
          ) : (
            <Link to={createPageUrl("MealsList")}>
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-sm font-semibold transition-colors backdrop-blur-sm">
                <Search className="w-4 h-4" />
                Trouver des repas
              </button>
            </Link>
          )}
        </div>

        {/* ── Info banners ──────────────────────────────────────────── */}
        {isDonor && !isVerifiedDonor && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3.5">
            <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-900">{donorStatusMessage}</p>
          </div>
        )}
        {isReceiver && (
          <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3.5">
            <Heart className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-sm text-emerald-900">
              En tant que receveur, vous pouvez réserver des repas immédiatement
              après inscription.
            </p>
          </div>
        )}

        {/* ── Stats bento grid ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.title}
              className="bg-white rounded-3xl border border-stone-100 p-5 hover:shadow-md hover:shadow-emerald-900/6 transition-shadow"
            >
              <div
                className={`w-10 h-10 rounded-2xl ${stat.bgColor} flex items-center justify-center mb-3`}
              >
                <stat.icon
                  className={`w-5 h-5 ${stat.color.replace("bg-", "text-")}`}
                />
              </div>
              <p className="text-2xl font-extrabold text-[#191c19]">
                {stat.value}
              </p>
              <p className="text-xs text-stone-400 font-medium mt-0.5">
                {stat.title}
              </p>
            </div>
          ))}
        </div>

        {/* ── Donor: pending reservations alert ────────────────────── */}
        {isDonor && pendingDonorReservations.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-base font-extrabold text-[#191c19] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-500" />
              Réservations à confirmer ({pendingDonorReservations.length})
            </h2>
            {pendingDonorReservations.map((meal) => (
              <div
                key={meal.id}
                className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-amber-900 truncate">
                    {meal.title}
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Réservé par{" "}
                    <span className="font-medium">{meal.reserved_by_name}</span>
                    {" — "}
                    <a
                      href={`mailto:${meal.reserved_by_email}`}
                      className="underline"
                    >
                      {meal.reserved_by_email}
                    </a>
                  </p>
                </div>
                <Link
                  to={`/MealDetail?id=${meal.id}`}
                  className="shrink-0 ml-3"
                >
                  <button className="px-3 py-1.5 rounded-xl bg-[#1b5e3b] text-white text-xs font-semibold hover:bg-[#004527] transition-colors">
                    Confirmer
                  </button>
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* ── My recent donations ───────────────────────────────────── */}
        {isDonor && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-extrabold text-[#191c19]">
                Mes derniers dons
              </h2>
              <Link to={createPageUrl("MealHistory")}>
                <button className="text-sm font-semibold text-[#1b5e3b] hover:text-[#004527] flex items-center gap-1">
                  Tout voir <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </Link>
            </div>
            {myMeals.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-stone-200 rounded-3xl p-8 text-center">
                <div className="w-14 h-14 bg-stone-100 rounded-3xl flex items-center justify-center mx-auto mb-3">
                  <Gift className="w-7 h-7 text-stone-400" />
                </div>
                <p className="font-semibold text-stone-600 text-sm">
                  Vous n'avez pas encore publié de repas.
                </p>
                <Link
                  to={createPageUrl("PublishMeal")}
                  className="mt-4 inline-block"
                >
                  <button
                    disabled={!isVerifiedDonor}
                    className="px-5 py-2.5 rounded-2xl bg-[#1b5e3b] text-white text-sm font-semibold hover:bg-[#004527] disabled:opacity-40 transition-colors"
                  >
                    Publier mon premier repas
                  </button>
                </Link>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {myMeals.slice(0, 3).map((meal) => (
                  <MealCard key={meal.id} meal={meal} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── My reservations ───────────────────────────────────────── */}
        {!isAdmin && myReservations.length > 0 && (
          <div>
            <h2 className="text-base font-extrabold text-[#191c19] mb-4">
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
