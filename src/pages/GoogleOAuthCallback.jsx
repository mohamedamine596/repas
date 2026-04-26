// @ts-nocheck
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { setAccessToken } from "@/api/backendClient";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";

export default function GoogleOAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { checkAppState } = useAuth();

  useEffect(() => {
    const token = searchParams.get("token");
    const error = searchParams.get("error");

    if (error) {
      const messages = {
        google_denied: "Connexion Google annulée.",
        google_no_email: "Impossible de récupérer l'email depuis Google.",
        google_wrong_role: "Ce compte Google est lié à un restaurant. Utilisez la connexion email.",
        account_suspended: "Votre compte est suspendu. Contactez l'administration.",
        google_failed: "La connexion avec Google a échoué. Réessayez.",
      };
      toast.error(messages[error] || "Erreur lors de la connexion Google.");
      navigate(createPageUrl("Login"), { replace: true });
      return;
    }

    if (!token) {
      toast.error("Token manquant. Réessayez.");
      navigate(createPageUrl("Login"), { replace: true });
      return;
    }

    setAccessToken(token);
    toast.success("Connexion avec Google réussie !");

    // Re-bootstrap the auth context so user state is populated
    if (checkAppState) {
      checkAppState().then(() => {
        navigate("/receveur/dashboard", { replace: true });
      });
    } else {
      navigate("/receveur/dashboard", { replace: true });
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#efefec]">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-[#14531c] rounded-full animate-spin" />
    </div>
  );
}
