// @ts-nocheck
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import AuthSplitLayout from "@/components/auth/AuthSplitLayout";

export default function Login() {
  const navigate = useNavigate();
  const { login, register, isLoadingAuth } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  const inputClass =
    "auth-field mt-2 h-11 border-transparent bg-[#f3f3f1] !text-black placeholder:!text-[#97a1ad] caret-[#14531c] focus-visible:ring-0 focus-visible:border-[#14531c]";
  const inputStyle = {
    color: "#000000",
    WebkitTextFillColor: "#000000",
    caretColor: "#14531c",
  };

  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setLockoutSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [lockoutSeconds]);

  const handleForgotPassword = () => navigate(createPageUrl("ForgotPassword"));

  const validateForm = () => {
    if (!email.trim()) {
      toast.error("L'adresse email est obligatoire.");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error("Entrez une adresse email valide.");
      return false;
    }
    if (password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères.");
      return false;
    }
    if (isRegisterMode && name.trim().length < 2) {
      toast.error("Le nom complet doit contenir au moins 2 caractères.");
      return false;
    }
    return true;
  };

  const routeAfterLogin = (session) => {
    const role = session?.user?.role;
    const status = session?.user?.accountStatus;

    if (role === "ADMIN" || role === "ROLE_ADMIN") {
      navigate("/admin/dashboard", { replace: true });
      return;
    }
    if (role === "ROLE_RESTAURANT" || role === "DONOR") {
      if (status === "siren_verified") {
        navigate(createPageUrl("RestaurantDocumentUpload"), { replace: true });
        return;
      }
      if (status === "pending_admin_review" || status === "pending_review") {
        navigate(createPageUrl("RestaurantPendingReview"), { replace: true });
        return;
      }
      if (status === "approved") {
        navigate("/restaurant/dashboard", { replace: true });
        return;
      }
    }
    navigate("/receveur/dashboard", { replace: true });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setLockoutSeconds(0);

    try {
      if (isRegisterMode) {
        // Registration on this page = RECEIVER only. Restaurants use RegisterRestaurant.
        const normalizedEmail = email.trim().toLowerCase();
        const result = await register({
          name: name.trim(),
          email: normalizedEmail,
          password,
          role: "RECEIVER",
        });
        window.localStorage.setItem("ctp_pending_email", normalizedEmail);
        window.localStorage.setItem("ctp_pending_role", "ROLE_RECEIVER");

        const notification = result?.emailNotification;
        if (notification?.delivered) {
          toast.success("Compte créé. Code OTP envoyé sur votre email.");
        } else if (notification?.skipped) {
          toast.warning(
            "Compte créé, mais l'email OTP n'a pas été envoyé (SMTP non configuré).",
          );
        } else {
          toast.success(result?.message || "Compte créé avec succès.");
        }
        if (result?.otpDebugCode)
          toast.info(`DEBUG OTP : ${result.otpDebugCode}`);

        navigate(createPageUrl("OtpVerification"), {
          state: { email: normalizedEmail, role: "ROLE_RECEIVER" },
          replace: true,
        });
        return;
      }

      const result = await login({
        email: email.trim().toLowerCase(),
        password,
      });

      // Backend lets siren_verified restaurants log in so they can upload docs
      if (result?.nextStep === "document_upload") {
        toast.success(
          "Connexion réussie. Veuillez déposer vos documents légaux.",
        );
        navigate(createPageUrl("RestaurantDocumentUpload"), { replace: true });
        return;
      }

      toast.success("Connexion réussie");
      routeAfterLogin(result);
    } catch (error) {
      const code = error?.data?.code;

      if (code === "ACCOUNT_LOCKED") {
        const remaining = Number(error?.data?.lockoutRemainingSeconds || 0);
        setLockoutSeconds(remaining);
        toast.error(error?.message || "Compte temporairement verrouillé.");
        return;
      }
      if (code === "EMAIL_OTP_REQUIRED") {
        const normalizedEmail = email.trim().toLowerCase();
        window.localStorage.setItem("ctp_pending_email", normalizedEmail);
        toast.error("Votre email doit être vérifié avant de vous connecter.");
        navigate(createPageUrl("OtpVerification"), {
          state: { email: normalizedEmail },
        });
        return;
      }
      if (code === "ACCOUNT_SUSPENDED") {
        toast.error(
          error?.data?.reason ||
            "Votre compte est suspendu. Contactez l'administration.",
        );
        return;
      }
      if (code === "ACCOUNT_AUTO_SUSPENDED") {
        toast.error(
          "Votre compte a été suspendu automatiquement suite à plusieurs signalements. Veuillez contacter l'administration.",
        );
        return;
      }

      toast.error(error?.message || "Opération échouée");
    } finally {
      setLoading(false);
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#efefec]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#14531c] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AuthSplitLayout
      eyebrow="Bienvenue"
      title={
        isRegisterMode
          ? "Créez votre espace bénéficiaire"
          : "Accédez à votre espace"
      }
      subtitle={
        isRegisterMode
          ? "Inscrivez-vous pour trouver des repas près de chez vous."
          : "Connectez-vous pour gérer vos repas ou trouver de l'aide."
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {lockoutSeconds > 0 && !isRegisterMode && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            Trop de tentatives. Réessayez dans {lockoutSeconds} secondes.
          </div>
        )}

        {isRegisterMode && (
          <div>
            <Label className="text-[12px] font-semibold text-[#1d1d1d]">
              Nom complet
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Votre nom complet"
              className={inputClass}
              style={inputStyle}
            />
          </div>
        )}

        <div>
          <Label className="text-[12px] font-semibold text-[#1d1d1d]">
            Adresse email
          </Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="nom@exemple.com"
            className={inputClass}
            style={inputStyle}
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label className="text-[12px] font-semibold text-[#1d1d1d]">
              Mot de passe
            </Label>
            {!isRegisterMode && (
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-[11px] font-medium text-[#f97316] hover:text-[#ea580c]"
              >
                Mot de passe oublié ?
              </button>
            )}
          </div>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            className={inputClass}
            style={inputStyle}
          />
        </div>

        <Button
          type="submit"
          className="mt-2 h-11 w-full rounded-md bg-[#14531c] hover:bg-[#0f4216] text-white font-semibold"
          disabled={loading || lockoutSeconds > 0}
        >
          {loading
            ? "Veuillez patienter…"
            : isRegisterMode
              ? "Créer un compte bénéficiaire"
              : "Se connecter"}
        </Button>

        <p className="text-center text-sm text-gray-500 pt-1">
          {isRegisterMode ? "Déjà un compte ? " : "Pas encore de compte ? "}
          <button
            type="button"
            className="font-semibold text-[#f97316] hover:text-[#ea580c]"
            onClick={() => {
              setIsRegisterMode((prev) => !prev);
              setLockoutSeconds(0);
            }}
          >
            {isRegisterMode ? "Se connecter" : "Créer un compte"}
          </button>
        </p>
      </form>

      {/* Restaurant CTA */}
      <div className="mt-7">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-[0.22em] text-gray-400">
            <span className="bg-white px-3">Vous êtes un restaurant ?</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="mt-4 h-11 w-full border-[#14531c] text-[#14531c] hover:bg-[#f0faf2] font-semibold text-[13px]"
          onClick={() => navigate(createPageUrl("RegisterRestaurant"))}
        >
          🍽️ Inscrire mon restaurant partenaire
        </Button>
        <p className="mt-1.5 text-center text-[10px] text-[#97a1ad]">
          SIREN vérifié · Documents légaux · Validation sous 24–48h
        </p>
      </div>
    </AuthSplitLayout>
  );
}
