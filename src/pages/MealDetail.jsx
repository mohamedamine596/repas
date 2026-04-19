// @ts-nocheck
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MapPin, Clock, Package, Truck, User, MessageCircle,
  AlertTriangle, ArrowLeft, CheckCircle2, Loader2
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import MealStatusBadge from "../components/meals/MealStatusBadge";
import { useAuth } from "@/lib/AuthContext";
import { backendApi } from "@/api/backendClient";

const FOOD_LABELS = {
  repas_complet: "🍲 Repas complet",
  fruits_legumes: "🥗 Fruits & Légumes",
  pain_patisserie: "🥖 Pain & Pâtisserie",
  conserves: "🥫 Conserves",
  boissons: "🥤 Boissons",
  produits_laitiers: "🧀 Produits laitiers",
  autre: "🍽️ Autre",
};

export default function MealDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const mealId = urlParams.get("id");

  const { user, token, isLoadingAuth, navigateToLogin, isReceiver } = useAuth();
  const [message, setMessage] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    if (!isLoadingAuth && !user) {
      navigateToLogin();
    }
  }, [isLoadingAuth, user, navigateToLogin]);

  const { data: meal, isLoading } = useQuery({
    queryKey: ["meal", mealId],
    queryFn: async () => backendApi.meals.getById(mealId),
    enabled: !!mealId,
  });

  const reserveMutation = useMutation({
    mutationFn: () =>
      backendApi.meals.update(token, mealId, {
        status: "reserved",
        reserved_by: user.email,
        reserved_by_name: user.name || user.fullName,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal", mealId] });
      toast.success("Repas réservé ! Contactez le donneur pour les détails.");
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: () => backendApi.messages.send(token, { toEmail: meal.donor_email, content: message }),
    onSuccess: () => {
      toast.success("Message envoyé !");
      setMessage("");
    },
  });

  const reportMutation = useMutation({
    mutationFn: () =>
      backendApi.reports.create(token, {
        meal_id: mealId,
        reason: reportReason,
        details: reportDetails,
      }),
    onSuccess: () => {
      toast.success("Signalement envoyé. Merci !");
      setReportOpen(false);
      setReportReason("");
      setReportDetails("");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (newStatus) =>
      backendApi.meals.update(token, mealId, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal", mealId] });
      toast.success("Statut mis à jour !");
    },
  });

  if (isLoading || isLoadingAuth || !user) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#1B5E3B]" />
      </div>
    );
  }

  if (!meal) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Repas introuvable</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Retour
        </Button>
      </div>
    );
  }

  const isDonor = user.email === meal.donor_email;
  const isReservedByMe = user.email === meal.reserved_by;

  return (
    <div className="max-w-3xl mx-auto pb-24 md:pb-8 space-y-6">
      <Button variant="ghost" className="text-gray-500" onClick={() => navigate(-1)}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Retour
      </Button>

      {/* Image */}
      <div className="relative h-56 md:h-72 bg-gradient-to-br from-[#1B5E3B]/5 to-[#E8634A]/5 rounded-2xl overflow-hidden">
        {meal.photo_url ? (
          <img src={meal.photo_url} alt={meal.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-7xl">
            {FOOD_LABELS[meal.food_type]?.split(" ")[0] || "🍽️"}
          </div>
        )}
        <div className="absolute top-4 right-4">
          <MealStatusBadge status={meal.status} />
        </div>
      </div>

      {/* Details */}
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-[#E8634A]">{FOOD_LABELS[meal.food_type]}</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{meal.title}</h1>
          <p className="text-gray-500 mt-2 leading-relaxed">{meal.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card className="border-[#f0e8df]">
            <CardContent className="p-4 flex items-center gap-3">
              <Package className="w-5 h-5 text-[#1B5E3B]" />
              <div>
                <p className="text-xs text-gray-400">Quantité</p>
                <p className="text-sm font-medium">{meal.quantity}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-[#f0e8df]">
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="w-5 h-5 text-[#1B5E3B]" />
              <div>
                <p className="text-xs text-gray-400">Disponibilité</p>
                <p className="text-sm font-medium">
                  {meal.available_date
                    ? format(new Date(meal.available_date), "d MMM, HH:mm", { locale: fr })
                    : "—"}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-[#f0e8df]">
            <CardContent className="p-4 flex items-center gap-3">
              <Truck className="w-5 h-5 text-[#1B5E3B]" />
              <div>
                <p className="text-xs text-gray-400">Mode</p>
                <p className="text-sm font-medium">
                  {meal.delivery_option === "pickup" ? "À récupérer" :
                   meal.delivery_option === "delivery" ? "Livraison" : "Les deux"}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-[#f0e8df]">
            <CardContent className="p-4 flex items-center gap-3">
              <User className="w-5 h-5 text-[#1B5E3B]" />
              <div>
                <p className="text-xs text-gray-400">Donneur</p>
                <p className="text-sm font-medium">{meal.donor_name}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-[#f0e8df]">
          <CardContent className="p-4 flex items-center gap-3">
            <MapPin className="w-5 h-5 text-[#E8634A]" />
            <p className="text-sm text-gray-600">{meal.address}</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {/* Reserve button */}
        {!isDonor && isReceiver && meal.status === "available" && (
          <Button
            className="w-full bg-[#1B5E3B] hover:bg-[#154d30] text-white rounded-xl h-12 text-base"
            onClick={() => reserveMutation.mutate()}
            disabled={reserveMutation.isPending}
          >
            {reserveMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Réserver ce repas
              </>
            )}
          </Button>
        )}

        {/* Donor: update status */}
        {isDonor && (
          <Card className="border-[#f0e8df]">
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-medium text-gray-700">Modifier le statut :</p>
              <div className="flex flex-wrap gap-2">
                {["available", "reserved", "collected", "delivered", "expired"].map((s) => (
                  <Button
                    key={s}
                    variant={meal.status === s ? "default" : "outline"}
                    size="sm"
                    className={meal.status === s ? "bg-[#1B5E3B] text-white" : ""}
                    onClick={() => updateStatusMutation.mutate(s)}
                    disabled={updateStatusMutation.isPending}
                  >
                    {s === "available" ? "Disponible" :
                     s === "reserved" ? "Réservé" :
                     s === "collected" ? "Récupéré" :
                     s === "delivered" ? "Livré" : "Expiré"}
                  </Button>
                ))}
              </div>
              {meal.reserved_by_name && (
                <p className="text-sm text-gray-500">
                  Réservé par : <span className="font-medium">{meal.reserved_by_name}</span>
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Contact donor */}
        {!isDonor && (
          <Card className="border-[#f0e8df]">
            <CardContent className="p-4 space-y-3">
              <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Envoyer un message au donneur
              </p>
              <Textarea
                placeholder="Votre message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="h-20"
              />
              <Button
                className="bg-[#E8634A] hover:bg-[#d4553e] text-white rounded-xl"
                onClick={() => sendMessageMutation.mutate()}
                disabled={!message.trim() || sendMessageMutation.isPending}
              >
                {sendMessageMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Envoyer"
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Report */}
        {!isDonor && (
          <Dialog open={reportOpen} onOpenChange={setReportOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" className="w-full text-gray-400 hover:text-red-500">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Signaler cette annonce
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Signaler cette annonce</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <Select value={reportReason} onValueChange={setReportReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Raison du signalement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inappropriate">Contenu inapproprié</SelectItem>
                    <SelectItem value="expired">Nourriture périmée</SelectItem>
                    <SelectItem value="fake">Fausse annonce</SelectItem>
                    <SelectItem value="spam">Spam</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder="Détails (optionnel)"
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                />
                <Button
                  className="w-full bg-red-500 hover:bg-red-600 text-white rounded-xl"
                  onClick={() => reportMutation.mutate()}
                  disabled={!reportReason || reportMutation.isPending}
                >
                  {reportMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Envoyer le signalement"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}