// @ts-nocheck
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { User, Gift, Heart, MapPin, Loader2, Save, Trash2, AlertTriangle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { backendApi } from "@/api/backendClient";
import { createPageUrl } from "@/utils";

const ACCOUNT_STATUS_LABELS = {
  email_pending: "Email a verifier",
  email_verified: "Document + quiz requis",
  quiz_passed: "Quiz valide",
  pending_admin_review: "En verification admin",
  active: "Compte actif",
  suspended: "Suspendu",
};

const ACCOUNT_STATUS_STYLES = {
  email_pending: "bg-amber-50 text-amber-800 border-amber-200",
  email_verified: "bg-blue-50 text-blue-800 border-blue-200",
  quiz_passed: "bg-emerald-50 text-emerald-800 border-emerald-200",
  pending_admin_review: "bg-amber-50 text-amber-800 border-amber-200",
  active: "bg-emerald-50 text-emerald-800 border-emerald-200",
  suspended: "bg-red-50 text-red-800 border-red-200",
};

export default function Profile() {
  const { user, token, isLoadingAuth, navigateToLogin, logout, checkAppState } = useAuth();
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isLoadingAuth && !user) {
      navigateToLogin();
      return;
    }
    if (user) {
      setBio(user.bio || "");
      setPhone(user.phone || "");
    }
  }, [isLoadingAuth, user, navigateToLogin]);

  const { data: myMeals = [] } = useQuery({
    queryKey: ["profileMeals", user?.email],
    queryFn: async () => {
      return backendApi.meals.list({ donor_email: user.email }, "-created_date", 200);
    },
    enabled: !!user?.email,
  });

  const { data: myReservations = [] } = useQuery({
    queryKey: ["profileReservations", user?.email],
    queryFn: async () => {
      return backendApi.meals.list({ reserved_by: user.email }, "-created_date", 200);
    },
    enabled: !!user?.email,
  });

  const {
    data: verificationStatus,
    isLoading: loadingVerification,
  } = useQuery({
    queryKey: ["verificationStatus", user?.id, token],
    queryFn: async () => backendApi.verification.status(token),
    enabled: !!user?.id && !!token && user?.role === "DONOR",
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await backendApi.auth.updateMe(token, { bio, phone });
      await checkAppState();
      toast.success("Profil mis à jour !");
    } catch {
      toast.error("Impossible de mettre a jour le profil");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "SUPPRIMER") return;
    setDeleting(true);
    // Delete all user's meals
    const userMeals = await backendApi.meals.list({ donor_email: user.email }, "-created_date", 500);
    const safeUserMeals = Array.isArray(userMeals) ? userMeals : [];
    for (const meal of safeUserMeals) {
      await backendApi.meals.remove(token, meal.id);
    }
    toast.success("Votre compte a été supprimé.");
    setDeleting(false);
    logout(true);
  };

  if (isLoadingAuth || !user) return null;

  const donatedCount = myMeals.filter((m) => ["collected", "delivered"].includes(m.status)).length;
  const receivedCount = myReservations.filter((m) => ["collected", "delivered"].includes(m.status)).length;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24 md:pb-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mon Profil</h1>
        <p className="text-gray-500 mt-1">Gérez vos informations</p>
      </div>

      {/* Avatar + Stats */}
      <Card className="border-[#f0e8df]">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#1B5E3B]/10 flex items-center justify-center">
              <User className="w-8 h-8 text-[#1B5E3B]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{user.name || user.fullName}</h2>
              <p className="text-sm text-gray-500">{user.email}</p>
              <p className="text-xs text-gray-500 mt-0.5">Role: {user.role}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center p-3 bg-emerald-50 rounded-xl">
              <Gift className="w-5 h-5 text-emerald-600 mx-auto" />
              <p className="text-xl font-bold text-gray-900 mt-1">{myMeals.length}</p>
              <p className="text-xs text-gray-500">Publiés</p>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-xl">
              <Heart className="w-5 h-5 text-[#E8634A] mx-auto" />
              <p className="text-xl font-bold text-gray-900 mt-1">{donatedCount}</p>
              <p className="text-xs text-gray-500">Donnés</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-xl">
              <MapPin className="w-5 h-5 text-purple-600 mx-auto" />
              <p className="text-xl font-bold text-gray-900 mt-1">{receivedCount}</p>
              <p className="text-xs text-gray-500">Reçus</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {user.role === "DONOR" && (
        <Card className="border-[#f0e8df]">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Verification donneur
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingVerification ? (
              <div className="flex items-center text-sm text-gray-500">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verification en cours de chargement...
              </div>
            ) : (
              <>
                <div className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${ACCOUNT_STATUS_STYLES[verificationStatus?.accountStatus] || ACCOUNT_STATUS_STYLES.email_pending}`}>
                  {ACCOUNT_STATUS_LABELS[verificationStatus?.accountStatus] || "En attente"}
                </div>

                {verificationStatus?.message ? (
                  <p className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
                    {verificationStatus.message}
                  </p>
                ) : null}

                {verificationStatus?.latestRequest?.rejectionReason ? (
                  <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                    Motif du refus: {verificationStatus.latestRequest.rejectionReason}
                  </p>
                ) : null}

                {verificationStatus?.accountStatus === "suspended" && user?.suspensionReason ? (
                  <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                    Raison de suspension: {user.suspensionReason}
                  </p>
                ) : null}

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-md border border-[#dbe5d5] bg-white px-3 py-2">
                    <p className="text-gray-500">Tentatives quiz</p>
                    <p className="font-semibold text-gray-900">
                      {Number(user?.donorQuiz?.attempts || 0)}/{Number(user?.donorQuiz?.maxAttempts || 2)}
                    </p>
                  </div>
                  <div className="rounded-md border border-[#dbe5d5] bg-white px-3 py-2">
                    <p className="text-gray-500">Dernier score</p>
                    <p className="font-semibold text-gray-900">
                      {user?.donorQuiz?.lastScore ?? "-"}
                    </p>
                  </div>
                </div>

                {verificationStatus?.accountStatus === "email_verified" ? (
                  <Button
                    className="bg-[#1B5E3B] hover:bg-[#154d30] text-white rounded-xl"
                    onClick={() => window.location.assign(createPageUrl("DonorDocumentUpload"))}
                  >
                    Continuer la verification
                  </Button>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit */}
      <Card className="border-[#f0e8df]">
        <CardHeader>
          <CardTitle className="text-base">Informations supplémentaires</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Téléphone</Label>
            <Input
              placeholder="Votre numéro de téléphone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>À propos de moi</Label>
            <Textarea
              placeholder="Quelques mots sur vous..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="mt-1 h-20"
            />
          </div>
          <Button
            className="bg-[#1B5E3B] hover:bg-[#154d30] text-white rounded-xl select-none"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Enregistrer
          </Button>
        </CardContent>
      </Card>

      {/* Delete account */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-base text-red-600 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Zone dangereuse
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            La suppression de votre compte est définitive. Toutes vos annonces seront supprimées.
          </p>
          <Button
            variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-50 rounded-xl select-none"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Supprimer mon compte
          </Button>
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={(o) => { setDeleteOpen(o); setDeleteConfirm(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Supprimer mon compte</DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Tapez <strong>SUPPRIMER</strong> pour confirmer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <Input
              placeholder="Tapez SUPPRIMER"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
            />
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              className="select-none"
              onClick={() => { setDeleteOpen(false); setDeleteConfirm(""); }}
            >
              Annuler
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl select-none"
              onClick={handleDeleteAccount}
              disabled={deleteConfirm !== "SUPPRIMER" || deleting}
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmer la suppression"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}