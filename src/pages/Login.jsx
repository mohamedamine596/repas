// @ts-nocheck
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSEO } from "@/hooks/useSEO";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import AuthSplitLayout from "@/components/auth/AuthSplitLayout";

export default function Login() {
  useSEO({
    title: "Connexion & Inscription bénéficiaire",
    description:
      "Connectez-vous ou créez votre compte bénéficiaire gratuit pour accéder aux repas solidaires près de chez vous.",
    url: "https://repas-sable.vercel.app/Login",
  });
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
      if (status === "approved" || status === "active") {
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

        <div className="relative my-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-[0.22em] text-gray-400">
            <span className="bg-white px-3">ou</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="h-11 w-full border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium text-[13px] flex items-center justify-center gap-3"
          onClick={() => {
            const apiUrl =
              import.meta.env.VITE_API_URL || "http://localhost:4000/api";
            window.location.href = `${apiUrl}/auth/google`;
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g fill="none" fillRule="evenodd">
              <path
                d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
                fill="#4285F4"
              />
              <path
                d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
                fill="#34A853"
              />
              <path
                d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
                fill="#FBBC05"
              />
              <path
                d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
                fill="#EA4335"
              />
            </g>
          </svg>
          Continuer avec Google
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
