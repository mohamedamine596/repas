import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Upload, Loader2, Camera } from "lucide-react";
import { MobileSelect } from "../components/ui/MobileSelect";
import { toast } from "sonner";

const FOOD_TYPES = [
  { value: "repas_complet", label: "🍲 Repas complet" },
  { value: "fruits_legumes", label: "🥗 Fruits & Légumes" },
  { value: "pain_patisserie", label: "🥖 Pain & Pâtisserie" },
  { value: "conserves", label: "🥫 Conserves" },
  { value: "boissons", label: "🥤 Boissons" },
  { value: "produits_laitiers", label: "🧀 Produits laitiers" },
  { value: "autre", label: "🍽️ Autre" },
];

const DELIVERY_OPTIONS = [
  { value: "pickup", label: "À venir récupérer" },
  { value: "delivery", label: "Je peux livrer" },
  { value: "both", label: "Les deux possibles" },
];

export default function PublishMeal() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const [form, setForm] = useState({
    title: "",
    food_type: "",
    description: "",
    quantity: "",
    available_date: "",
    delivery_option: "",
    address: "",
    latitude: null,
    longitude: null,
  });

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => base44.auth.redirectToLogin());
  }, []);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("La géolocalisation n'est pas disponible");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setForm((prev) => ({ ...prev, latitude: lat, longitude: lng }));
        
        // Reverse geocode
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
          );
          const data = await res.json();
          if (data.display_name) {
            setForm((prev) => ({ ...prev, address: data.display_name }));
          }
        } catch {}
        
        setGeoLoading(false);
        toast.success("Position détectée !");
      },
      () => {
        setGeoLoading(false);
        toast.error("Impossible de détecter votre position");
      }
    );
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.food_type || !form.description || !form.quantity || !form.delivery_option || !form.address) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setLoading(true);

    let photo_url = "";
    if (photoFile) {
      const uploaded = await base44.integrations.Core.UploadFile({ file: photoFile });
      photo_url = uploaded.file_url;
    }

    await base44.entities.Meal.create({
      ...form,
      photo_url,
      status: "available",
      donor_name: user.full_name,
      donor_email: user.email,
    });

    toast.success("Votre repas a été publié avec succès !");
    navigate(createPageUrl("Dashboard"));
    setLoading(false);
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto pb-24 md:pb-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Publier un repas</h1>
        <p className="text-gray-500 mt-1">Partagez de la nourriture avec ceux qui en ont besoin</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photo */}
        <Card className="border-[#f0e8df]">
          <CardContent className="p-6">
            <Label className="text-sm font-medium text-gray-700 mb-3 block">Photo (optionnel)</Label>
            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-[#e0d8cf] rounded-xl cursor-pointer hover:border-[#1B5E3B]/30 transition-colors bg-[#faf5ef] overflow-hidden">
              {photoPreview ? (
                <img src={photoPreview} alt="Aperçu" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center text-gray-400">
                  <Camera className="w-8 h-8 mb-2" />
                  <span className="text-sm">Ajouter une photo</span>
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </label>
          </CardContent>
        </Card>

        {/* Info */}
        <Card className="border-[#f0e8df]">
          <CardHeader>
            <CardTitle className="text-base">Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Titre *</Label>
              <Input
                id="title"
                placeholder="Ex: Couscous fait maison"
                value={form.title}
                onChange={(e) => handleChange("title", e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Type de nourriture *</Label>
              <MobileSelect
                value={form.food_type}
                onValueChange={(v) => handleChange("food_type", v)}
                placeholder="Choisir un type"
                options={FOOD_TYPES}
                triggerClassName="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="desc">Description *</Label>
              <Textarea
                id="desc"
                placeholder="Décrivez le repas..."
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                className="mt-1 h-24"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="qty">Quantité *</Label>
                <Input
                  id="qty"
                  placeholder="Ex: 3 portions"
                  value={form.quantity}
                  onChange={(e) => handleChange("quantity", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="date">Disponibilité *</Label>
                <Input
                  id="date"
                  type="datetime-local"
                  value={form.available_date}
                  onChange={(e) => handleChange("available_date", e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Mode de récupération *</Label>
              <MobileSelect
                value={form.delivery_option}
                onValueChange={(v) => handleChange("delivery_option", v)}
                placeholder="Choisir"
                options={DELIVERY_OPTIONS}
                triggerClassName="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card className="border-[#f0e8df]">
          <CardHeader>
            <CardTitle className="text-base">Localisation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="address">Adresse *</Label>
              <Input
                id="address"
                placeholder="Votre adresse"
                value={form.address}
                onChange={(e) => handleChange("address", e.target.value)}
                className="mt-1"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-[#1B5E3B]/20 text-[#1B5E3B]"
              onClick={detectLocation}
              disabled={geoLoading}
            >
              {geoLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <MapPin className="w-4 h-4 mr-2" />
              )}
              Détecter ma position
            </Button>
            {form.latitude && (
              <p className="text-xs text-gray-400">
                📍 {form.latitude.toFixed(4)}, {form.longitude.toFixed(4)}
              </p>
            )}
          </CardContent>
        </Card>

        <Button
          type="submit"
          className="w-full bg-[#1B5E3B] hover:bg-[#154d30] text-white rounded-xl h-12 text-base"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            "Publier le repas"
          )}
        </Button>
      </form>
    </div>
  );
}