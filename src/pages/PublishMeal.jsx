// @ts-nocheck
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Loader2, Camera } from "lucide-react";
import { MobileSelect } from "../components/ui/MobileSelect";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import { backendApi } from "@/api/backendClient";

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

const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;

export default function PublishMeal() {
  const navigate = useNavigate();
  const {
    user,
    token,
    isLoadingAuth,
    navigateToLogin,
    isDonor,
    isVerifiedDonor,
  } = useAuth();
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const [form, setForm] = useState({
    title: "",
    food_type: "",
    description: "",
    quantity: "",
    prepared_at: "",
    expires_at: "",
    delivery_option: "",
    address: "",
    latitude: null,
    longitude: null,
  });

  const handleChange = (field, value) => {
    setSubmitError("");
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (payload) => {
    const errors = {};
    if (!payload.title) errors.title = "Le titre est obligatoire.";
    if (!payload.food_type)
      errors.food_type = "Le type de nourriture est obligatoire.";
    if (!payload.description)
      errors.description = "La description est obligatoire.";
    else if (payload.description.trim().length < 10)
      errors.description =
        "La description doit contenir au moins 10 caractères.";
    if (!payload.quantity) errors.quantity = "La quantité est obligatoire.";
    if (!payload.prepared_at)
      errors.prepared_at = "L'heure de préparation est obligatoire.";
    if (!payload.expires_at)
      errors.expires_at = "La date d'expiration est obligatoire.";
    else if (payload.prepared_at && payload.expires_at) {
      const prepDate = new Date(payload.prepared_at);
      const expDate = new Date(payload.expires_at);
      if (expDate <= prepDate) {
        errors.expires_at =
          "La date d'expiration doit être après la préparation.";
      }
    }
    if (!payload.delivery_option)
      errors.delivery_option = "Le mode de récupération est obligatoire.";
    if (!payload.address) errors.address = "L'adresse est obligatoire.";
    return errors;
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
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
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
      },
    );
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > MAX_PHOTO_SIZE_BYTES) {
        toast.error(
          "Image trop lourde (max 5 Mo). Choisissez une image plus légère.",
        );
        e.target.value = "";
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    // Check photo first
    if (!photoFile) {
      toast.error(
        "Une photo du repas est obligatoire pour la sécurité alimentaire",
      );
      setSubmitError("Veuillez ajouter une photo de votre repas.");
      return;
    }

    // Convert datetime-local to ISO string
    const preparedISO = form.prepared_at
      ? new Date(form.prepared_at).toISOString()
      : new Date().toISOString();
    const expiresISO = form.expires_at
      ? new Date(form.expires_at).toISOString()
      : "";

    const payload = {
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      quantity: form.quantity.trim(),
      address: form.address.trim(),
      prepared_at: preparedISO,
      expires_at: expiresISO,
    };

    console.log("🍽️ Payload to send:", payload);

    const errors = validateForm(payload);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setSubmitError("Veuillez corriger les champs en rouge puis réessayer.");
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    if (!user) {
      toast.error("Veuillez vous connecter pour publier un repas");
      navigateToLogin();
      return;
    }

    if (!isDonor) {
      toast.error("Seuls les comptes donneurs peuvent publier un repas");
      return;
    }

    if (!isVerifiedDonor) {
      toast.error("Votre compte donneur doit etre verifie avant de publier");
      return;
    }

    setLoading(true);

    try {
      let photo_url = "";
      if (photoFile) {
        photo_url = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve(typeof reader.result === "string" ? reader.result : "");
          reader.onerror = () => reject(new Error("Image read failed"));
          reader.readAsDataURL(photoFile);
        });
      }

      await backendApi.meals.create(token, {
        ...payload,
        photo_url,
        status: "available",
      });

      console.log("✅ Meal published successfully!");
      setFieldErrors({});
      setSubmitError("");
      toast.success("Votre repas a été publié avec succès !");
      navigate(createPageUrl("Dashboard"));
    } catch (error) {
      console.error("❌ Error publishing meal:", error);
      console.error("Error details:", {
        status: error?.status,
        data: error?.data,
        message: error?.message,
      });

      const status = error?.status;
      const message = error?.data?.error || error?.message;

      if (status === 401) {
        setSubmitError("Session expirée. Veuillez vous reconnecter.");
        toast.error("Votre session a expiré. Reconnectez-vous.");
        navigateToLogin();
      } else if (status === 403 && error?.data?.code === "DONOR_NOT_VERIFIED") {
        setSubmitError(
          "Votre verification donneur est en attente. Publication bloquee.",
        );
        toast.error("Votre compte donneur n'est pas encore verifie.");
      } else if (status === 400 && message) {
        setSubmitError(`Erreur de validation: ${message}`);
        toast.error(`Validation refusée: ${message}`);
      } else if (message === "Failed to fetch") {
        setSubmitError(
          "Le backend est inaccessible. Démarrez l'API sur le port 4000 puis réessayez.",
        );
        toast.error(
          "Le serveur backend est inaccessible. Vérifiez qu'il tourne sur le port 4000.",
        );
      } else {
        setSubmitError(message || "Impossible de publier le repas. Réessayez.");
        toast.error(message || "Impossible de publier le repas. Réessayez.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#1B5E3B]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Connexion requise</h1>
        <p className="text-gray-500">
          Vous devez vous connecter pour publier un repas.
        </p>
        <Button
          className="bg-[#1B5E3B] hover:bg-[#154d30] text-white rounded-xl"
          onClick={() => navigateToLogin()}
        >
          Se connecter
        </Button>
      </div>
    );
  }

  if (!isDonor) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">
          Acces reserve aux donneurs
        </h1>
        <p className="text-gray-500">
          Votre compte est en mode receveur. Vous pouvez reserver des repas, pas
          en publier.
        </p>
        <Button
          className="bg-[#1B5E3B] hover:bg-[#154d30] text-white rounded-xl"
          onClick={() => navigate(createPageUrl("MealsList"))}
        >
          Voir les repas disponibles
        </Button>
      </div>
    );
  }

  if (!isVerifiedDonor) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">
          Verification donneur en attente
        </h1>
        <p className="text-gray-500">
          Vous devez televerser un document d'identite puis attendre la
          validation admin pour publier des repas.
        </p>
        <Button
          className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl"
          onClick={() => navigate(createPageUrl("Profile"))}
        >
          Aller a mon profil pour verifier mon compte
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-24 md:pb-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Publier un repas</h1>
        <p className="text-gray-500 mt-1">
          Partagez de la nourriture avec ceux qui en ont besoin
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photo */}
        <Card className="border-[#f0e8df]">
          <CardContent className="p-6">
            <Label className="text-sm font-medium text-gray-700 mb-3 block">
              Photo du repas *{" "}
              <span className="text-xs text-gray-500">
                (obligatoire pour la sécurité alimentaire)
              </span>
            </Label>
            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-[#e0d8cf] rounded-xl cursor-pointer hover:border-[#1B5E3B]/30 transition-colors bg-[#faf5ef] overflow-hidden">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Aperçu"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center text-gray-400">
                  <Camera className="w-8 h-8 mb-2" />
                  <span className="text-sm">📸 Ajouter une photo</span>
                  <span className="text-xs mt-1">Max 5 Mo</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
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
                className={`mt-1 ${fieldErrors.title ? "border-red-500 focus-visible:ring-red-500" : ""}`}
              />
              {fieldErrors.title && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.title}</p>
              )}
            </div>

            <div>
              <Label>Type de nourriture *</Label>
              <MobileSelect
                value={form.food_type}
                onValueChange={(v) => handleChange("food_type", v)}
                placeholder="Choisir un type"
                options={FOOD_TYPES}
                triggerClassName={`mt-1 ${fieldErrors.food_type ? "border-red-500" : ""}`}
              />
              {fieldErrors.food_type && (
                <p className="text-xs text-red-600 mt-1">
                  {fieldErrors.food_type}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="desc">
                Description *{" "}
                <span className="text-xs text-gray-500">
                  (minimum 10 caractères)
                </span>
              </Label>
              <Textarea
                id="desc"
                placeholder="Décrivez le repas en détail..."
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                className={`mt-1 h-24 ${fieldErrors.description ? "border-red-500 focus-visible:ring-red-500" : ""}`}
              />
              {fieldErrors.description && (
                <p className="text-xs text-red-600 mt-1">
                  {fieldErrors.description}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="qty">Quantité *</Label>
                <Input
                  id="qty"
                  placeholder="Ex: 3 portions"
                  value={form.quantity}
                  onChange={(e) => handleChange("quantity", e.target.value)}
                  className={`mt-1 ${fieldErrors.quantity ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                />
                {fieldErrors.quantity && (
                  <p className="text-xs text-red-600 mt-1">
                    {fieldErrors.quantity}
                  </p>
                )}
              </div>
            </div>

            {/* Food Safety: Preparation and Expiration Times */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="prepared_at">Heure de préparation *</Label>
                <Input
                  id="prepared_at"
                  type="datetime-local"
                  value={form.prepared_at}
                  onChange={(e) => handleChange("prepared_at", e.target.value)}
                  className={`mt-1 ${fieldErrors.prepared_at ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                  max={new Date().toISOString().slice(0, 16)}
                />
                {fieldErrors.prepared_at && (
                  <p className="text-xs text-red-600 mt-1">
                    {fieldErrors.prepared_at}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  📅 Quand avez-vous préparé ce repas ?
                </p>
              </div>
              <div>
                <Label htmlFor="expires_at">Date d'expiration *</Label>
                <Input
                  id="expires_at"
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={(e) => handleChange("expires_at", e.target.value)}
                  className={`mt-1 ${fieldErrors.expires_at ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                  min={
                    form.prepared_at || new Date().toISOString().slice(0, 16)
                  }
                />
                {fieldErrors.expires_at && (
                  <p className="text-xs text-red-600 mt-1">
                    {fieldErrors.expires_at}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  ⏰ Jusqu'à quand peut-on consommer ce repas ?
                </p>
              </div>
            </div>

            <div>
              <Label>Mode de récupération *</Label>
              <MobileSelect
                value={form.delivery_option}
                onValueChange={(v) => handleChange("delivery_option", v)}
                placeholder="Choisir"
                options={DELIVERY_OPTIONS}
                triggerClassName={`mt-1 ${fieldErrors.delivery_option ? "border-red-500" : ""}`}
              />
              {fieldErrors.delivery_option && (
                <p className="text-xs text-red-600 mt-1">
                  {fieldErrors.delivery_option}
                </p>
              )}
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
                className={`mt-1 ${fieldErrors.address ? "border-red-500 focus-visible:ring-red-500" : ""}`}
              />
              {fieldErrors.address && (
                <p className="text-xs text-red-600 mt-1">
                  {fieldErrors.address}
                </p>
              )}
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

        {submitError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            {submitError}
          </p>
        )}

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
