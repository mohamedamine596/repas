import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { User, Gift, Heart, MapPin, Loader2, Save, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    base44.auth.me().then((u) => {
      setUser(u);
      setBio(u.bio || "");
      setPhone(u.phone || "");
    }).catch(() => base44.auth.redirectToLogin());
  }, []);

  const { data: myMeals = [] } = useQuery({
    queryKey: ["profileMeals", user?.email],
    queryFn: () => base44.entities.Meal.filter({ donor_email: user.email }),
    enabled: !!user?.email,
  });

  const { data: myReservations = [] } = useQuery({
    queryKey: ["profileReservations", user?.email],
    queryFn: () => base44.entities.Meal.filter({ reserved_by: user.email }),
    enabled: !!user?.email,
  });

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe({ bio, phone });
    toast.success("Profil mis à jour !");
    setSaving(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "SUPPRIMER") return;
    setDeleting(true);
    // Delete all user's meals
    const userMeals = await base44.entities.Meal.filter({ donor_email: user.email });
    for (const meal of userMeals) {
      await base44.entities.Meal.delete(meal.id);
    }
    toast.success("Votre compte a été supprimé.");
    setDeleting(false);
    base44.auth.logout();
  };

  if (!user) return null;

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
              <h2 className="text-lg font-bold text-gray-900">{user.full_name}</h2>
              <p className="text-sm text-gray-500">{user.email}</p>
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