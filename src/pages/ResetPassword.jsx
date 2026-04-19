// @ts-nocheck
import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { backendApi } from "@/api/backendClient";
import AuthSplitLayout from "@/components/auth/AuthSplitLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPageUrl } from "@/utils";

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const token = (searchParams.get("token") || "").trim();
  const email = (searchParams.get("email") || "").trim().toLowerCase();

  const formInputClassName =
    "mt-2 h-11 border-transparent bg-[#f3f3f1] !text-black placeholder:!text-[#97a1ad] caret-[#14531c] focus-visible:ring-0 focus-visible:border-[#14531c]";
  const formInputStyle = {
    color: "#000000",
    WebkitTextFillColor: "#000000",
    caretColor: "#14531c",
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!token || !email) {
      toast.error("Lien invalide. Demandez un nouveau lien de reinitialisation.");
      return;
    }

    if (password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }

    setIsSubmitting(true);
    try {
      await backendApi.auth.resetPassword({ email, token, password });
      toast.success("Mot de passe reinitialise avec succes.");
      navigate(createPageUrl("Login"), { replace: true });
    } catch (error) {
      toast.error(error?.message || "Echec de la reinitialisation");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthSplitLayout
      eyebrow="Securite"
      title="Nouveau mot de passe"
      subtitle="Choisissez un nouveau mot de passe pour votre compte."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Label className="text-[12px] font-semibold text-[#1d1d1d]">Nouveau mot de passe</Label>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            placeholder="Minimum 8 caracteres"
            className={formInputClassName}
            style={formInputStyle}
          />
        </div>

        <div>
          <Label className="text-[12px] font-semibold text-[#1d1d1d]">Confirmer le mot de passe</Label>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            placeholder="Retapez le mot de passe"
            className={formInputClassName}
            style={formInputStyle}
          />
        </div>

        <Button
          type="submit"
          className="h-11 w-full rounded-md bg-[#14531c] hover:bg-[#0f4216] text-white font-semibold"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Mise a jour..." : "Mettre a jour"}
        </Button>

        <button
          type="button"
          className="w-full text-sm font-semibold text-[#f97316] hover:text-[#ea580c]"
          onClick={() => navigate(createPageUrl("Login"))}
        >
          Retour a la connexion
        </button>
      </form>
    </AuthSplitLayout>
  );
}
