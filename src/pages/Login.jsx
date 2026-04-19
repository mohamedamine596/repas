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
  const [role, setRole] = useState("RECEIVER");
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  const formInputClassName =
    "auth-field mt-2 h-11 border-transparent bg-[#f3f3f1] !text-black placeholder:!text-[#97a1ad] caret-[#14531c] focus-visible:ring-0 focus-visible:border-[#14531c]";
  const formInputStyle = {
    color: "#000000",
    WebkitTextFillColor: "#000000",
    caretColor: "#14531c",
  };

  useEffect(() => {
    if (lockoutSeconds <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setLockoutSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [lockoutSeconds]);

  const handleForgotPassword = () => navigate(createPageUrl("ForgotPassword"));

  const handleSocialSignIn = (provider) => {
    toast.info(`Connexion ${provider} non disponible pour le moment.`);
  };

  const validateClientForm = () => {
    if (!email.trim()) {
      toast.error("L'adresse email est obligatoire.");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error("Entrez une adresse email valide.");
      return false;
    }

    if (password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caracteres.");
      return false;
    }

    if (isRegisterMode && name.trim().length < 2) {
      toast.error("Le nom complet doit contenir au moins 2 caracteres.");
      return false;
    }

    return true;
  };

  const routeAfterSuccessfulLogin = (session) => {
    const roleValue = session?.user?.role;
    const status = session?.user?.accountStatus;

    if (roleValue === "ADMIN") {
      navigate("/admin/dashboard", { replace: true });
      return;
    }

    if (roleValue === "RECEIVER") {
      navigate("/receveur/dashboard", { replace: true });
      return;
    }

    if (roleValue === "DONOR" && status === "active") {
      navigate("/donneur/dashboard", { replace: true });
      return;
    }

    if (roleValue === "DONOR" && status === "email_verified") {
      navigate(createPageUrl("DonorDocumentUpload"), { replace: true });
      return;
    }

    navigate(createPageUrl("Dashboard"), { replace: true });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateClientForm()) {
      return;
    }

    setLoading(true);
    setLockoutSeconds(0);

    try {
      if (isRegisterMode) {
        const normalizedEmail = email.trim().toLowerCase();
        const result = await register({
          name: name.trim(),
          email: normalizedEmail,
          password,
          role,
        });

        window.localStorage.setItem("ctp_pending_email", normalizedEmail);
        const notification = result?.emailNotification;
        if (notification?.delivered) {
          toast.success(result?.message || "Compte cree avec succes. Email OTP envoye.");
        } else if (notification?.skipped) {
          toast.warning("Compte cree, mais l'email OTP n'a pas ete envoye (SMTP non configure).");
        } else if (notification && notification.delivered === false) {
          toast.warning("Compte cree, mais l'email OTP n'a pas pu etre envoye.");
        } else {
          toast.success(result?.message || "Compte cree avec succes.");
        }
        if (result?.otpDebugCode) {
          toast.info(`DEBUG OTP: ${result.otpDebugCode}`);
        }

        navigate(createPageUrl("OtpVerification"), {
          state: { email: normalizedEmail },
          replace: true,
        });
        return;
      }

      const result = await login({ email: email.trim().toLowerCase(), password });
      toast.success("Connexion reussie");
      routeAfterSuccessfulLogin(result);
    } catch (error) {
      const code = error?.data?.code;

      if (code === "ACCOUNT_LOCKED") {
        const remaining = Number(error?.data?.lockoutRemainingSeconds || 0);
        setLockoutSeconds(remaining);
        toast.error(error?.message || "Compte temporairement verrouille.");
        return;
      }

      if (code === "DONOR_EMAIL_PENDING") {
        toast.error("Votre compte donneur est en attente de verification email.");
        return;
      }

      if (code === "EMAIL_OTP_REQUIRED") {
        const normalizedEmail = email.trim().toLowerCase();
        window.localStorage.setItem("ctp_pending_email", normalizedEmail);
        toast.error("Votre email doit etre verifie avant connexion.");
        navigate(createPageUrl("OtpVerification"), {
          state: { email: normalizedEmail },
        });
        return;
      }

      if (code === "DONOR_PENDING_ADMIN_REVIEW") {
        toast.error("Votre compte est en cours de verification admin (24-48h).");
        return;
      }

      if (code === "DONOR_SUSPENDED" || code === "ACCOUNT_SUSPENDED") {
        toast.error(error?.data?.reason || "Votre compte est suspendu.");
        return;
      }

      if (code === "DONOR_QUIZ_REQUIRED") {
        toast.error("Vous devez terminer le quiz de securite alimentaire.");
        return;
      }

      toast.error(error?.message || "Operation echouee");
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
      title={isRegisterMode ? "Creez votre espace" : "Accedez a votre espace"}
      subtitle={
        isRegisterMode
          ? "Inscrivez-vous pour partager vos dons ou trouver de l'aide pres de chez vous."
          : "Connectez-vous pour gerer vos dons ou trouver de l'aide pres de chez vous."
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {lockoutSeconds > 0 && !isRegisterMode ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            Trop de tentatives de connexion. Reessayez dans {lockoutSeconds} secondes.
          </div>
        ) : null}

        {isRegisterMode ? (
          <div>
            <Label className="text-[12px] font-semibold text-[#1d1d1d]">Nom complet</Label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              placeholder="Votre nom complet"
              className={formInputClassName}
              style={formInputStyle}
            />
          </div>
        ) : null}

        {isRegisterMode ? (
          <div>
            <Label className="text-[12px] font-semibold text-[#1d1d1d]">Role</Label>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="auth-field mt-2 w-full h-11 rounded-md border border-transparent bg-[#f3f3f1] px-3 text-sm !text-black outline-none focus:border-[#14531c]"
              style={formInputStyle}
            >
              <option value="RECEIVER">Receveur</option>
              <option value="DONOR">Donneur</option>
            </select>
            {role === "DONOR" ? (
              <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
                Un code OTP puis un quiz de securite alimentaire sont requis avant la verification admin.
              </p>
            ) : null}
          </div>
        ) : null}

        <div>
          <Label className="text-[12px] font-semibold text-[#1d1d1d]">Adresse email</Label>
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            placeholder="nom@exemple.com"
            className={formInputClassName}
            style={formInputStyle}
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label className="text-[12px] font-semibold text-[#1d1d1d]">Mot de passe</Label>
            {!isRegisterMode ? (
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-[11px] font-medium text-[#f97316] hover:text-[#ea580c]"
              >
                Mot de passe oublie ?
              </button>
            ) : null}
          </div>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            placeholder="********"
            className={formInputClassName}
            style={formInputStyle}
          />
        </div>

        <Button
          type="submit"
          className="mt-2 h-11 w-full rounded-md bg-[#14531c] hover:bg-[#0f4216] text-white font-semibold"
          disabled={loading || lockoutSeconds > 0}
        >
          {loading
            ? "Veuillez patienter..."
            : isRegisterMode
              ? "Creer un compte"
              : "Se connecter"}
        </Button>

        <p className="text-center text-sm text-gray-500 pt-1">
          {isRegisterMode ? "Deja un compte ? " : "Pas encore de compte ? "}
          <button
            type="button"
            className="font-semibold text-[#f97316] hover:text-[#ea580c]"
            onClick={() => {
              setIsRegisterMode((prev) => !prev);
              setRole("RECEIVER");
              setLockoutSeconds(0);
            }}
          >
            {isRegisterMode ? "Se connecter" : "Creer un compte"}
          </button>
        </p>
      </form>

      <div className="mt-7">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-[0.22em] text-gray-400">
            <span className="bg-white px-3">Ou continuer avec</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-10 border-gray-200 text-gray-700 bg-[#fafafa] hover:bg-gray-100"
            onClick={() => handleSocialSignIn("Google")}
          >
            <span className="mr-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#4285F4]">
              G
            </span>
            Google
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-10 border-gray-200 text-gray-700 bg-[#fafafa] hover:bg-gray-100"
            onClick={() => handleSocialSignIn("Apple")}
          >
            <span className="mr-2 text-xs font-semibold leading-none">A</span>
            Apple
          </Button>
        </div>
      </div>
    </AuthSplitLayout>
  );
}
