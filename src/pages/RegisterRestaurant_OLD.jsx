// @ts-nocheck
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import { backendApi } from "@/api/backendClient";
import AuthSplitLayout from "@/components/auth/AuthSplitLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const STEPS = [
  { number: 1, label: "Identité" },
  { number: 2, label: "Adresse" },
  { number: 3, label: "Accès" },
];

const inputClass =
  "mt-2 h-11 border-transparent bg-[#f3f3f1] !text-black placeholder:!text-[#97a1ad] caret-[#14531c] focus-visible:ring-0 focus-visible:border-[#14531c]";
const inputStyle = {
  color: "#000",
  WebkitTextFillColor: "#000",
  caretColor: "#14531c",
};

function validateSiren(value) {
  if (!/^\d{9}$/.test(value)) return false;
  // Luhn-like checksum (algorithm Luhn applied to 9 digits)
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
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    businessName: "",
    managerName: "",
    siren: "",
    email: "",
    phone: "",
    street: "",
    city: "",
    postalCode: "",
    password: "",
    confirmPassword: "",
  });

  const [sirenTouched, setSirenTouched] = useState(false);

  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const sirenValid = validateSiren(form.siren);
  const sirenError = sirenTouched && form.siren.length > 0 && !sirenValid;

  const goToStep2 = (e) => {
    e.preventDefault();
    if (!form.businessName.trim() || form.businessName.trim().length < 2) {
      toast.error("Le nom du restaurant doit contenir au moins 2 caractères.");
      return;
    }
    if (!form.managerName.trim() || form.managerName.trim().length < 2) {
      toast.error("Le nom du responsable doit contenir au moins 2 caractères.");
      return;
    }
    if (!form.siren.trim() || !sirenValid) {
      toast.error("Le numéro SIREN doit être composé de 9 chiffres valides.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) {
      toast.error("Entrez une adresse email professionnelle valide.");
      return;
    }
    if (!/^\+?[\d\s\-(). ]{7,20}$/.test(form.phone.trim())) {
      toast.error("Numéro de téléphone invalide.");
      return;
    }
    setStep(2);
  };

  const goToStep3 = (e) => {
    e.preventDefault();
    if (!form.street.trim() || form.street.trim().length < 3) {
      toast.error("L'adresse doit contenir au moins 3 caractères.");
      return;
    }
    if (!form.city.trim()) {
      toast.error("La ville est obligatoire.");
      return;
    }
    if (!form.postalCode.trim() || !/^\d{5}$/.test(form.postalCode.trim())) {
      toast.error("Code postal invalide (5 chiffres).");
      return;
    }
    setStep(3);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.password.length < 10) {
      toast.error("Le mot de passe doit contenir au moins 10 caractères.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      const result = await backendApi.auth.registerRestaurant({
        businessName: form.businessName.trim(),
        managerName: form.managerName.trim(),
        siren: form.siren.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
        address: {
          street: form.street.trim(),
          city: form.city.trim(),
          postalCode: form.postalCode.trim(),
          country: "FR",
        },
      });

      const pendingEmail = form.email.trim().toLowerCase();
      window.localStorage.setItem("ctp_pending_email", pendingEmail);
      window.localStorage.setItem("ctp_pending_role", "ROLE_RESTAURANT");

      if (result?.sirenApiDown) {
        toast.warning(
          "Le service INSEE était temporairement indisponible. Votre SIREN sera vérifié par notre équipe via vos documents.",
        );
      } else {
        toast.success("Restaurant enregistré. Vérifiez votre email !");
      }

      if (result?.otpDebugCode) {
        toast.info(`DEBUG OTP : ${result.otpDebugCode}`);
      }

      navigate(createPageUrl("OtpVerification"), {
        state: { email: pendingEmail, role: "ROLE_RESTAURANT" },
        replace: true,
      });
    } catch (error) {
      const code = error?.data?.code;
      if (code === "SIREN_DUPLICATE") {
        toast.error("Un restaurant avec ce numéro SIREN est déjà inscrit.");
      } else if (code === "SIREN_INVALID") {
        toast.error(
          error?.data?.error || "Numéro SIREN invalide ou entreprise fermée.",
        );
      } else {
        toast.error(error?.message || "Inscription échouée. Réessayez.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout
      eyebrow="Espace restaurant"
      title="Créez votre espace donateur"
      subtitle="Seuls les restaurants enregistrés légalement peuvent publier des repas."
      heroTitle={"Ensemble contre\nle gaspillage alimentaire."}
      heroSubtitle="Votre SIREN est vérifié en temps réel auprès du registre national pour garantir la confiance de nos bénéficiaires."
    >
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((s, idx) => (
          <React.Fragment key={s.number}>
            <div className="flex items-center gap-1.5">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors ${
                  step >= s.number
                    ? "bg-[#14531c] text-white"
                    : "bg-[#e8e8e5] text-[#97a1ad]"
                }`}
              >
                {step > s.number ? "✓" : s.number}
              </div>
              <span
                className={`text-[11px] font-medium ${
                  step >= s.number ? "text-[#14531c]" : "text-[#97a1ad]"
                }`}
              >
                {s.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`flex-1 h-px ${step > s.number ? "bg-[#14531c]" : "bg-[#e8e8e5]"}`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1 — Restaurant identity */}
      {step === 1 && (
        <form onSubmit={goToStep2} className="space-y-4">
          <div>
            <Label className="text-[12px] font-semibold text-[#1d1d1d]">
              Nom du restaurant *
            </Label>
            <Input
              value={form.businessName}
              onChange={set("businessName")}
              placeholder="Le Jardin Gourmand"
              className={inputClass}
              style={inputStyle}
              required
            />
          </div>

          <div>
            <Label className="text-[12px] font-semibold text-[#1d1d1d]">
              Nom du responsable *
            </Label>
            <Input
              value={form.managerName}
              onChange={set("managerName")}
              placeholder="Marie Dupont"
              className={inputClass}
              style={inputStyle}
              required
            />
          </div>

          <div>
            <Label className="text-[12px] font-semibold text-[#1d1d1d]">
              Numéro SIREN *{" "}
              <span className="font-normal text-[#97a1ad]">(9 chiffres)</span>
            </Label>
            <Input
              value={form.siren}
              onChange={set("siren")}
              onBlur={() => setSirenTouched(true)}
              placeholder="123456789"
              maxLength={9}
              inputMode="numeric"
              className={`${inputClass} ${sirenError ? "border-red-400" : ""}`}
              style={inputStyle}
              required
            />
            {sirenError && (
              <p className="mt-1 text-[11px] text-red-600">
                SIREN invalide — vérifiez les 9 chiffres.
              </p>
            )}
            {sirenTouched && sirenValid && (
              <p className="mt-1 text-[11px] text-green-700">
                ✓ Format SIREN valide
              </p>
            )}
            <p className="mt-1 text-[10px] text-[#97a1ad]">
              Vérifié en temps réel auprès du registre Sirene (INSEE).
            </p>
          </div>

          <div>
            <Label className="text-[12px] font-semibold text-[#1d1d1d]">
              Email professionnel *
            </Label>
            <Input
              type="email"
              value={form.email}
              onChange={set("email")}
              placeholder="contact@restaurant.fr"
              className={inputClass}
              style={inputStyle}
              required
            />
          </div>

          <div>
            <Label className="text-[12px] font-semibold text-[#1d1d1d]">
              Téléphone *
            </Label>
            <Input
              type="tel"
              value={form.phone}
              onChange={set("phone")}
              placeholder="+33 1 23 45 67 89"
              className={inputClass}
              style={inputStyle}
              required
            />
          </div>

          <Button
            type="submit"
            className="mt-2 h-11 w-full rounded-md bg-[#14531c] hover:bg-[#0f4216] text-white font-semibold"
          >
            Continuer →
          </Button>
        </form>
      )}

      {/* Step 2 — Address */}
      {step === 2 && (
        <form onSubmit={goToStep3} className="space-y-4">
          <div>
            <Label className="text-[12px] font-semibold text-[#1d1d1d]">
              Adresse *
            </Label>
            <Input
              value={form.street}
              onChange={set("street")}
              placeholder="12 rue de la Paix"
              className={inputClass}
              style={inputStyle}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[12px] font-semibold text-[#1d1d1d]">
                Code postal *
              </Label>
              <Input
                value={form.postalCode}
                onChange={set("postalCode")}
                placeholder="75001"
                maxLength={5}
                inputMode="numeric"
                className={inputClass}
                style={inputStyle}
                required
              />
            </div>
            <div>
              <Label className="text-[12px] font-semibold text-[#1d1d1d]">
                Ville *
              </Label>
              <Input
                value={form.city}
                onChange={set("city")}
                placeholder="Paris"
                className={inputClass}
                style={inputStyle}
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-11"
              onClick={() => setStep(1)}
            >
              ← Retour
            </Button>
            <Button
              type="submit"
              className="flex-1 h-11 bg-[#14531c] hover:bg-[#0f4216] text-white font-semibold"
            >
              Continuer →
            </Button>
          </div>
        </form>
      )}

      {/* Step 3 — Password */}
      {step === 3 && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
            Après inscription, vous recevrez un code OTP par email puis devrez
            téléverser 3 documents légaux. Votre compte sera activé sous 24–48h.
          </div>

          <div>
            <Label className="text-[12px] font-semibold text-[#1d1d1d]">
              Mot de passe *{" "}
              <span className="font-normal text-[#97a1ad]">
                (min. 10 caractères)
              </span>
            </Label>
            <Input
              type="password"
              value={form.password}
              onChange={set("password")}
              placeholder="••••••••••"
              className={inputClass}
              style={inputStyle}
              required
            />
          </div>

          <div>
            <Label className="text-[12px] font-semibold text-[#1d1d1d]">
              Confirmer le mot de passe *
            </Label>
            <Input
              type="password"
              value={form.confirmPassword}
              onChange={set("confirmPassword")}
              placeholder="••••••••••"
              className={inputClass}
              style={inputStyle}
              required
            />
            {form.confirmPassword && form.password !== form.confirmPassword && (
              <p className="mt-1 text-[11px] text-red-600">
                Les mots de passe ne correspondent pas.
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-11"
              onClick={() => setStep(2)}
            >
              ← Retour
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 h-11 bg-[#14531c] hover:bg-[#0f4216] text-white font-semibold"
            >
              {loading ? "Vérification en cours…" : "S'inscrire"}
            </Button>
          </div>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-gray-500">
        Vous avez déjà un compte ?{" "}
        <button
          type="button"
          onClick={() => navigate(createPageUrl("Login"))}
          className="font-semibold text-[#14531c] hover:underline"
        >
          Se connecter
        </button>
      </p>
    </AuthSplitLayout>
  );
}
