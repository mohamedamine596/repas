// @ts-nocheck
import React from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Mail, CheckCircle } from "lucide-react";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import AuthSplitLayout from "@/components/auth/AuthSplitLayout";

export default function RestaurantPendingReview() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const STEPS = [
    { label: "Inscription & vérification SIREN", done: true },
    { label: "Vérification email (OTP)", done: true },
    { label: "Documents légaux déposés", done: true },
    {
      label: "Validation par notre équipe (24–48h)",
      done: false,
      active: true,
    },
    { label: "Compte activé — publication de repas", done: false },
  ];

  return (
    <AuthSplitLayout
      eyebrow="Dossier en cours"
      title="Votre dossier est en examen"
      subtitle="Notre équipe vérifie vos documents. Vous recevrez un email dès qu'une décision est prise."
      heroTitle={"Merci pour\nvotre engagement."}
      heroSubtitle="Chaque restaurant partenaire contribue à réduire le gaspillage alimentaire tout en aidant les personnes dans le besoin."
    >
      <div className="space-y-5">
        {/* Timeline */}
        <div className="space-y-2">
          {STEPS.map((s, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                  s.done
                    ? "bg-[#14531c] text-white"
                    : s.active
                      ? "border-2 border-[#14531c] bg-white"
                      : "border-2 border-[#dde0d9] bg-white"
                }`}
              >
                {s.done ? (
                  <CheckCircle size={12} />
                ) : s.active ? (
                  <div className="w-2 h-2 rounded-full bg-[#14531c] animate-pulse" />
                ) : null}
              </div>
              <span
                className={`text-[12px] ${
                  s.done
                    ? "text-[#14531c] font-medium"
                    : s.active
                      ? "text-[#1d1d1d] font-semibold"
                      : "text-[#97a1ad]"
                }`}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Info box */}
        <div className="rounded-lg border border-[#d4edda] bg-[#f0faf2] p-4 space-y-2">
          <div className="flex items-center gap-2 text-[#14531c]">
            <Clock size={16} />
            <span className="text-[13px] font-semibold">
              Délai estimé : 24 à 48h ouvrées
            </span>
          </div>
          <p className="text-[12px] text-[#4a7c59]">
            Notre équipe vérifie la conformité de vos documents (Kbis,
            certificat d'hygiène, rapport sanitaire). Si un document est
            manquant ou expiré, vous recevrez un email avec les instructions.
          </p>
        </div>

        {/* Contact */}
        <div className="flex items-start gap-2 text-[12px] text-[#97a1ad]">
          <Mail size={14} className="mt-0.5 shrink-0" />
          <span>
            Une question ?{" "}
            <a
              href="mailto:support@kindharvest.fr"
              className="text-[#14531c] hover:underline"
            >
              support@kindharvest.fr
            </a>
          </span>
        </div>

        {user && (
          <p className="text-[11px] text-[#97a1ad]">
            Connecté en tant que <strong>{user.name}</strong> ({user.email})
          </p>
        )}

        <Button
          variant="outline"
          className="w-full h-10 text-[13px]"
          onClick={() => {
            logout();
            navigate(createPageUrl("Login"), { replace: true });
          }}
        >
          Se déconnecter
        </Button>
      </div>
    </AuthSplitLayout>
  );
}
