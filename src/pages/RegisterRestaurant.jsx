// @ts-nocheck
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSEO } from "@/hooks/useSEO";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import { backendApi } from "@/api/backendClient";
import AuthSplitLayout from "@/components/auth/AuthSplitLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

const inputClass =
  "mt-2 h-11 border-transparent bg-[#f3f3f1] !text-black placeholder:!text-[#97a1ad] caret-[#14531c] focus-visible:ring-0 focus-visible:border-[#14531c]";
const inputStyle = {
  color: "#000",
  WebkitTextFillColor: "#000",
  caretColor: "#14531c",
};

// Validation Luhn-like pour SIREN (9 chiffres)
function validateSiren(value) {
  if (!/^\d{9}$/.test(value)) return false;
  const digits = value.split("").map(Number);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let d = digits[i];
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

export default function RegisterRestaurant() {
  useSEO({
    title: "Inscrire mon restaurant partenaire",
    description: "Vous avez des surplus alimentaires ? Inscrivez votre restaurant sur Repas Solidaire et contribuez à la lutte contre le gaspillage alimentaire en France.",
    url: "https://repas-fraiche.vercel.app/RegisterRestaurant",
  });
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sirenChecking, setSirenChecking] = useState(false);
  const [sirenValid, setSirenValid] = useState(null); // null | true | false
  const [sirenApiDown, setSirenApiDown] = useState(false);

  const [form, setForm] = useState({
    businessName: "",
    managerName: "",
    siren: "",
    email: "",
    phone: "",
    street: "",
    postalCode: "",
    city: "",
    password: "",
    confirmPassword: "",
    certifyFoodSafe: false,
  });

  const [errors, setErrors] = useState({});

  const handleChange = (field) => (e) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSirenBlur = async () => {
    const siren = form.siren.trim();
    if (!siren) {
      setSirenValid(null);
      return;
    }

    if (!validateSiren(siren)) {
      setSirenValid(false);
      setErrors((prev) => ({
        ...prev,
        siren: "Format SIREN invalide (9 chiffres requis)",
      }));
      return;
    }

    // Call INSEE API to verify SIREN and fetch business name
    setSirenChecking(true);
    setSirenApiDown(false);

    try {
      const response = await fetch(
        `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(siren)}&page=1&per_page=5`,
      );

      if (!response.ok) {
        throw new Error("API response error");
      }

      const data = await response.json();
      const exactMatch = Array.isArray(data.results)
        ? data.results.find((item) => String(item.siren) === siren)
        : null;

      // Check if we found the exact SIREN
      if (exactMatch) {
        const entreprise = exactMatch;

        // Check if the company is active
        if (entreprise.etat_administratif !== "A") {
          setSirenValid(false);
          setErrors((prev) => ({
            ...prev,
            siren: "Cette entreprise est fermée",
          }));
          setSirenChecking(false);
          return;
        }

        // Auto-fill business name from INSEE data
        const businessName =
          entreprise.nom_raison_sociale || entreprise.nom_complet || "";
        if (businessName) {
          setForm((prev) => ({ ...prev, businessName }));
          toast.success(`Entreprise trouvée : ${businessName}`);
        }

        setSirenValid(true);
        setErrors((prev) => ({ ...prev, siren: "" }));
      } else {
        // No results found
        setSirenValid(false);
        setErrors((prev) => ({
          ...prev,
          siren: "SIREN introuvable dans la base INSEE",
        }));
      }
    } catch (error) {
      console.error("Error fetching SIREN data:", error);
      // API is down or network error - allow manual entry
      setSirenApiDown(true);
      setSirenValid(true); // Still mark as valid format-wise
      toast.warning(
        "API SIREN temporairement indisponible. Vous pouvez continuer avec la vérification manuelle.",
      );
    } finally {
      setSirenChecking(false);
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!form.businessName.trim())
      newErrors.businessName = "Nom de la société requis";
    if (!form.managerName.trim())
      newErrors.managerName = "Nom du gérant requis";
    if (!form.siren.trim()) newErrors.siren = "SIREN requis";
    else if (!validateSiren(form.siren)) newErrors.siren = "SIREN invalide";

    if (!form.email.trim()) newErrors.email = "Email requis";
    else if (!/\S+@\S+\.\S+/.test(form.email))
      newErrors.email = "Email invalide";

    if (!form.phone.trim()) newErrors.phone = "Téléphone requis";

    if (!form.street.trim()) newErrors.street = "Adresse requise";
    if (!form.postalCode.trim()) newErrors.postalCode = "Code postal requis";
    else if (!/^\d{5}$/.test(form.postalCode))
      newErrors.postalCode = "Code postal invalide (5 chiffres)";
    if (!form.city.trim()) newErrors.city = "Ville requise";

    if (!form.password) newErrors.password = "Mot de passe requis";
    else if (form.password.length < 10)
      newErrors.password = "Minimum 10 caractères";

    if (form.password !== form.confirmPassword)
      newErrors.confirmPassword = "Les mots de passe ne correspondent pas";

    if (!form.certifyFoodSafe)
      newErrors.certifyFoodSafe =
        "Vous devez certifier que les aliments sont propres à la consommation";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Veuillez corriger les erreurs du formulaire");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        businessName: form.businessName.trim(),
        managerName: form.managerName.trim(),
        siren: form.siren.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: {
          street: form.street.trim(),
          postalCode: form.postalCode.trim(),
          city: form.city.trim(),
          country: "FR",
        },
        password: form.password,
      };

      await backendApi.auth.registerRestaurant(payload);

      localStorage.setItem("pendingVerificationEmail", form.email);
      toast.success("Inscription réussie ! Vérifiez votre boîte mail.");
      navigate(createPageUrl("OtpVerification"));
    } catch (err) {
      console.error("Registration error:", err);
      const errorData = err?.data || err?.response?.data || {};
      const errorCode = errorData?.code;
      const errorMsg = errorData?.error || err?.message || "Erreur lors de l'inscription";

      if (errorCode === "SIREN_DUPLICATE") {
        setErrors({ siren: "Ce SIREN est déjà enregistré" });
        toast.error("Ce SIREN est déjà enregistré");
      } else if (errorCode === "SIREN_INVALID") {
        setErrors({ siren: "SIREN invalide ou entreprise fermée" });
        toast.error("SIREN invalide ou entreprise fermée");
        if (errorData?.sirenApiDown) {
          setSirenApiDown(true);
          toast.warning(
            "API SIREN indisponible. Votre dossier sera vérifié par l'équipe.",
          );
        }
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout
      title="Inscrire mon restaurant partenaire"
      subtitle="Rejoignez Kind Harvest et partagez vos invendus alimentaires"
      footerText="Déjà un compte ?"
      footerLinkText="Se connecter"
      footerLinkTo={createPageUrl("Login")}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Section Identité */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Identité de l'entreprise
          </h3>

          <div>
            <Label
              htmlFor="businessName"
              className="text-sm font-medium text-[#1a3a0f]"
            >
              Nom de la société *
            </Label>
            <Input
              id="businessName"
              type="text"
              value={form.businessName}
              onChange={handleChange("businessName")}
              className={inputClass}
              style={inputStyle}
              placeholder="Ex: Restaurant Le Gourmet"
            />
            {errors.businessName && (
              <p className="mt-1 text-sm text-red-600">{errors.businessName}</p>
            )}
          </div>

          <div>
            <Label
              htmlFor="managerName"
              className="text-sm font-medium text-[#1a3a0f]"
            >
              Nom du gérant *
            </Label>
            <Input
              id="managerName"
              type="text"
              value={form.managerName}
              onChange={handleChange("managerName")}
              className={inputClass}
              style={inputStyle}
              placeholder="Prénom et nom"
            />
            {errors.managerName && (
              <p className="mt-1 text-sm text-red-600">{errors.managerName}</p>
            )}
          </div>

          <div>
            <Label
              htmlFor="siren"
              className="text-sm font-medium text-[#1a3a0f]"
            >
              Numéro SIREN * (9 chiffres)
            </Label>
            <div className="relative">
              <Input
                id="siren"
                type="text"
                maxLength="9"
                value={form.siren}
                onChange={handleChange("siren")}
                onBlur={handleSirenBlur}
                className={inputClass}
                style={inputStyle}
                placeholder="123456789"
                disabled={sirenChecking}
              />
              {sirenChecking && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#2d6a1f] animate-spin" />
              )}
              {!sirenChecking && sirenValid === true && (
                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-600" />
              )}
              {!sirenChecking && sirenValid === false && (
                <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-600" />
              )}
            </div>
            {sirenChecking && (
              <p className="mt-1 text-sm text-blue-600">
                🔍 Recherche de l'entreprise...
              </p>
            )}
            {!sirenChecking && sirenValid === true && (
              <p className="mt-1 text-sm text-green-600">✓ SIREN vérifié</p>
            )}
            {errors.siren && (
              <p className="mt-1 text-sm text-red-600">{errors.siren}</p>
            )}
            {sirenApiDown && (
              <p className="mt-1 text-sm text-orange-600">
                API SIREN indisponible - vérification manuelle
              </p>
            )}
          </div>

          <div>
            <Label
              htmlFor="email"
              className="text-sm font-medium text-[#1a3a0f]"
            >
              Email professionnel *
            </Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={handleChange("email")}
              className={inputClass}
              style={inputStyle}
              placeholder="contact@restaurant.fr"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          <div>
            <Label
              htmlFor="phone"
              className="text-sm font-medium text-[#1a3a0f]"
            >
              Téléphone *
            </Label>
            <Input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange("phone")}
              className={inputClass}
              style={inputStyle}
              placeholder="06 12 34 56 78"
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
            )}
          </div>
        </div>

        {/* Section Adresse */}
        <div className="space-y-4 pt-4 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Adresse du restaurant
          </h3>

          <div>
            <Label
              htmlFor="street"
              className="text-sm font-medium text-[#1a3a0f]"
            >
              Rue *
            </Label>
            <Input
              id="street"
              type="text"
              value={form.street}
              onChange={handleChange("street")}
              className={inputClass}
              style={inputStyle}
              placeholder="12 Rue de la Paix"
            />
            {errors.street && (
              <p className="mt-1 text-sm text-red-600">{errors.street}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label
                htmlFor="postalCode"
                className="text-sm font-medium text-[#1a3a0f]"
              >
                Code postal *
              </Label>
              <Input
                id="postalCode"
                type="text"
                maxLength="5"
                value={form.postalCode}
                onChange={handleChange("postalCode")}
                className={inputClass}
                style={inputStyle}
                placeholder="75001"
              />
              {errors.postalCode && (
                <p className="mt-1 text-sm text-red-600">{errors.postalCode}</p>
              )}
            </div>

            <div>
              <Label
                htmlFor="city"
                className="text-sm font-medium text-[#1a3a0f]"
              >
                Ville *
              </Label>
              <Input
                id="city"
                type="text"
                value={form.city}
                onChange={handleChange("city")}
                className={inputClass}
                style={inputStyle}
                placeholder="Paris"
              />
              {errors.city && (
                <p className="mt-1 text-sm text-red-600">{errors.city}</p>
              )}
            </div>
          </div>
        </div>

        {/* Section Mot de passe */}
        <div className="space-y-4 pt-4 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Sécurité</h3>

          <div>
            <Label
              htmlFor="password"
              className="text-sm font-medium text-[#1a3a0f]"
            >
              Mot de passe * (minimum 10 caractères)
            </Label>
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={handleChange("password")}
              className={inputClass}
              style={inputStyle}
              placeholder="••••••••••"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          <div>
            <Label
              htmlFor="confirmPassword"
              className="text-sm font-medium text-[#1a3a0f]"
            >
              Confirmer le mot de passe *
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange("confirmPassword")}
              className={inputClass}
              style={inputStyle}
              placeholder="••••••••••"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">
                {errors.confirmPassword}
              </p>
            )}
          </div>
        </div>

        {/* Certification */}
        <div className="flex items-start space-x-3 pt-4">
          <Checkbox
            id="certifyFoodSafe"
            checked={form.certifyFoodSafe}
            onCheckedChange={(checked) =>
              setForm((prev) => ({ ...prev, certifyFoodSafe: checked }))
            }
            className="mt-1"
          />
          <Label
            htmlFor="certifyFoodSafe"
            className="text-sm text-gray-700 cursor-pointer"
          >
            Je certifie que les aliments mis à disposition sont propres à la
            consommation et respectent les normes d'hygiène en vigueur.
          </Label>
        </div>
        {errors.certifyFoodSafe && (
          <p className="text-sm text-red-600">{errors.certifyFoodSafe}</p>
        )}

        <Button
          type="submit"
          disabled={loading || !form.certifyFoodSafe}
          className="w-full h-12 bg-[#2d6a1f] hover:bg-[#1a3a0f] text-white font-semibold transition-colors disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Inscription en cours...
            </>
          ) : (
            "Créer mon compte"
          )}
        </Button>

        <p className="text-xs text-center text-gray-500 mt-4">
          En vous inscrivant, vous acceptez nos conditions d'utilisation.
        </p>
      </form>
    </AuthSplitLayout>
  );
}
