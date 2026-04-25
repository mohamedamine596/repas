// @ts-nocheck
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { UploadCloud, FileCheck2, AlertCircle } from "lucide-react";
import AuthSplitLayout from "@/components/auth/AuthSplitLayout";
import { Button } from "@/components/ui/button";
import { backendApi } from "@/api/backendClient";
import { useAuth } from "@/lib/AuthContext";
import { createPageUrl } from "@/utils";

const REQUIRED_DOCS = [
  {
    key: "kbis",
    label: "Extrait Kbis",
    hint: "Document officiel d'immatriculation, daté de moins de 3 mois.",
    icon: "📋",
  },
  {
    key: "hygiene_cert",
    label: "Certificat d'hygiène alimentaire",
    hint: "Attestation de formation HACCP du responsable.",
    icon: "🍽️",
  },
  {
    key: "inspection_cert",
    label: "Rapport d'inspection sanitaire",
    hint: "Dernier rapport de contrôle sanitaire de l'établissement.",
    icon: "✅",
  },
];

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPTED = ["application/pdf", "image/jpeg", "image/png"];

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function FileZone({ doc, file, onSelect }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) validate(dropped);
  };

  const validate = (f) => {
    if (!ACCEPTED.includes(f.type)) {
      toast.error(`${doc.label} : format non accepté. PDF, JPG ou PNG requis.`);
      return;
    }
    if (f.size > MAX_SIZE_BYTES) {
      toast.error(`${doc.label} : fichier trop grand (max 5 Mo).`);
      return;
    }
    onSelect(f);
  };

  return (
    <div
      className={`relative rounded-lg border-2 border-dashed transition-colors p-4 cursor-pointer ${
        file
          ? "border-[#14531c] bg-[#f0faf2]"
          : dragOver
            ? "border-[#14531c] bg-[#f3f9f4]"
            : "border-[#dde0d9] bg-[#f8f8f6] hover:border-[#14531c]"
      }`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) validate(f);
        }}
      />
      <div className="flex items-start gap-3">
        <span className="text-2xl select-none">{doc.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-[#1d1d1d]">
            {doc.label}
          </p>
          <p className="text-[11px] text-[#97a1ad] mt-0.5">{doc.hint}</p>
          {file ? (
            <p className="mt-1.5 text-[11px] font-medium text-[#14531c] truncate">
              <FileCheck2 size={12} className="inline mr-1" />
              {file.name} ({formatBytes(file.size)})
            </p>
          ) : (
            <p className="mt-1.5 text-[11px] text-[#97a1ad]">
              <UploadCloud size={12} className="inline mr-1" />
              Cliquez ou déposez votre fichier ici (PDF, JPG, PNG · max 5 Mo)
            </p>
          )}
        </div>
        {file && (
          <button
            type="button"
            className="shrink-0 text-[#97a1ad] hover:text-red-500 text-lg leading-none"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(null);
            }}
            title="Supprimer"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

export default function RestaurantDocumentUpload() {
  const navigate = useNavigate();
  const { user, isLoadingAuth } = useAuth();
  const [files, setFiles] = useState({
    kbis: null,
    hygiene_cert: null,
    inspection_cert: null,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isLoadingAuth) return;
    if (!user) {
      navigate(createPageUrl("Login"), { replace: true });
      return;
    }
    if (user.role !== "ROLE_RESTAURANT") {
      navigate("/receveur/dashboard", { replace: true });
      return;
    }
    // Already pending review or approved — redirect
    if (user.accountStatus === "pending_admin_review") {
      navigate(createPageUrl("RestaurantPendingReview"), { replace: true });
      return;
    }
    if (user.accountStatus === "approved") {
      navigate("/restaurant/dashboard", { replace: true });
    }
  }, [isLoadingAuth, user, navigate]);

  const allSelected = REQUIRED_DOCS.every((d) => files[d.key]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!allSelected) {
      toast.error("Veuillez sélectionner les 3 documents requis.");
      return;
    }

    const formData = new FormData();
    REQUIRED_DOCS.forEach((d) => formData.append(d.key, files[d.key]));

    setLoading(true);
    try {
      const result = await backendApi.restaurants.uploadDocuments(formData);
      toast.success(
        result?.message ||
          "Documents envoyés. Votre dossier est en cours d'examen.",
      );
      navigate(createPageUrl("RestaurantPendingReview"), { replace: true });
    } catch (error) {
      const msg =
        error?.data?.error || error?.message || "Envoi échoué. Réessayez.";
      toast.error(msg);
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
      eyebrow="Étape 2 sur 3"
      title="Documents légaux"
      subtitle="Ces 3 documents permettent à notre équipe de valider votre établissement avant activation."
      heroTitle={"Confiance &\nsécurité alimentaire."}
      heroSubtitle="Seuls les restaurants ayant fourni leurs documents légaux peuvent publier des repas sur notre plateforme."
    >
      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-6">
        {["Vérification email", "Documents", "Validation admin"].map(
          (label, idx) => (
            <React.Fragment key={label}>
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                    idx < 1
                      ? "bg-[#14531c] text-white"
                      : idx === 1
                        ? "bg-[#14531c] text-white"
                        : "bg-[#e8e8e5] text-[#97a1ad]"
                  }`}
                >
                  {idx < 1 ? "✓" : idx + 1}
                </div>
                <span
                  className={`text-[11px] font-medium ${idx <= 1 ? "text-[#14531c]" : "text-[#97a1ad]"}`}
                >
                  {label}
                </span>
              </div>
              {idx < 2 && (
                <div
                  className={`flex-1 h-px ${idx < 1 ? "bg-[#14531c]" : "bg-[#e8e8e5]"}`}
                />
              )}
            </React.Fragment>
          ),
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {REQUIRED_DOCS.map((doc) => (
          <FileZone
            key={doc.key}
            doc={doc}
            file={files[doc.key]}
            onSelect={(f) => setFiles((prev) => ({ ...prev, [doc.key]: f }))}
          />
        ))}

        {!allSelected && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
            <AlertCircle size={13} className="mt-0.5 shrink-0" />
            <span>
              Les 3 documents sont obligatoires. Ils seront vérifiés par notre
              équipe dans un délai de 24 à 48h.
            </span>
          </div>
        )}

        <Button
          type="submit"
          disabled={loading || !allSelected}
          className="mt-2 h-11 w-full rounded-md bg-[#14531c] hover:bg-[#0f4216] text-white font-semibold disabled:opacity-50"
        >
          {loading ? "Envoi en cours…" : "Soumettre mes documents →"}
        </Button>
      </form>
    </AuthSplitLayout>
  );
}
