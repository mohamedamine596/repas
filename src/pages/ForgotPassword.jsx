// @ts-nocheck
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { backendApi } from "@/api/backendClient";
import AuthSplitLayout from "@/components/auth/AuthSplitLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPageUrl } from "@/utils";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formInputClassName =
    "mt-2 h-11 border-transparent bg-[#f3f3f1] !text-black placeholder:!text-[#97a1ad] caret-[#14531c] focus-visible:ring-0 focus-visible:border-[#14531c]";
  const formInputStyle = {
    color: "#000000",
    WebkitTextFillColor: "#000000",
    caretColor: "#14531c",
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!email.trim()) {
      toast.error("Entrez votre adresse email.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await backendApi.auth.forgotPassword({ email: email.trim().toLowerCase() });

      const notification = result?.emailNotification;
      if (notification?.delivered) {
        toast.success(result?.message || "Si le compte existe, un email a ete envoye.");
      } else if (notification?.skipped) {
        toast.warning("Email non envoye: SMTP non configure sur le backend.");
      } else if (notification && notification.delivered === false) {
        toast.warning("Impossible d'envoyer l'email de reinitialisation pour le moment.");
      } else {
        toast.success(result?.message || "Si le compte existe, un email a ete envoye.");
      }

      if (result?.resetDebugToken) {
        toast.info(`DEBUG token: ${result.resetDebugToken}`);
      }
      navigate(createPageUrl("Login"), { replace: true });
    } catch (error) {
      toast.error(error?.message || "Impossible d'envoyer l'email de reinitialisation");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthSplitLayout
      eyebrow="Securite"
      title="Mot de passe oublie"
      subtitle="Entrez votre email pour recevoir un lien de reinitialisation."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
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

        <Button
          type="submit"
          className="h-11 w-full rounded-md bg-[#14531c] hover:bg-[#0f4216] text-white font-semibold"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Envoi en cours..." : "Envoyer le lien"}
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
