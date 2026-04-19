// @ts-nocheck
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, ShieldCheck, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import AuthSplitLayout from "@/components/auth/AuthSplitLayout";
import { Button } from "@/components/ui/button";
import { backendApi } from "@/api/backendClient";
import { useAuth } from "@/lib/AuthContext";
import { createPageUrl } from "@/utils";

export default function DonorDocumentUpload() {
  const navigate = useNavigate();
  const { user, token, isLoadingAuth } = useAuth();
  const [selectedDocument, setSelectedDocument] = useState(null);

  const {
    data,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["donorDocumentStep", token],
    queryFn: () => backendApi.auth.donorQuizStatus(token),
    enabled: !!token && user?.role === "DONOR",
  });

  const accountStatus = data?.quiz?.accountStatus || user?.accountStatus;
  const documentUploaded = Boolean(data?.quiz?.documentUploaded);
  const uploadedDocumentName = data?.quiz?.document?.originalName || "";

  const uploadMutation = useMutation({
    mutationFn: (file) => backendApi.verification.upload(token, file),
    onSuccess: async (response) => {
      toast.success(response?.message || "Document televerse avec succes.");
      setSelectedDocument(null);
      const latest = await refetch();
      const uploadedNow = Boolean(latest?.data?.quiz?.documentUploaded);
      if (uploadedNow) {
        navigate(createPageUrl("DonorQuiz"), { replace: true });
      } else {
        toast.warning("Document enregistre. Cliquez sur Continuer vers le quiz.");
      }
    },
    onError: (error) => {
      toast.error(error?.message || "Impossible de televerser le document");
    },
  });

  useEffect(() => {
    if (isLoadingAuth) {
      return;
    }

    if (!user) {
      navigate(createPageUrl("Login"), { replace: true });
      return;
    }

    if (user.role !== "DONOR") {
      navigate("/receveur/dashboard", { replace: true });
    }
  }, [isLoadingAuth, navigate, user]);

  useEffect(() => {
    if (!accountStatus) {
      return;
    }

    if (accountStatus === "email_pending") {
      navigate(createPageUrl("OtpVerification"), { replace: true });
      return;
    }

    if (accountStatus === "pending_admin_review") {
      navigate(createPageUrl("DonorPendingReview"), { replace: true });
      return;
    }

    if (accountStatus === "active") {
      navigate("/donneur/dashboard", { replace: true });
      return;
    }

    if (accountStatus === "suspended") {
      navigate(createPageUrl("Login"), { replace: true });
      return;
    }

    if (accountStatus === "email_verified" && documentUploaded) {
      navigate(createPageUrl("DonorQuiz"), { replace: true });
    }
  }, [accountStatus, documentUploaded, navigate]);

  if (isLoadingAuth || !user) {
    return null;
  }

  if (isLoading) {
    return (
      <AuthSplitLayout
        eyebrow="Verification"
        title="Chargement"
        subtitle="Nous verifions l'etat de votre document."
      >
        <div className="h-12 w-12 rounded-full border-4 border-slate-200 border-t-[#14531c] animate-spin" />
      </AuthSplitLayout>
    );
  }

  return (
    <AuthSplitLayout
      eyebrow="Verification"
      title="Etape 1/2: Televerser votre document"
      subtitle="Ajoutez votre piece d'identite. Une fois validee, vous passerez au quiz."
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-[#dbe5d5] bg-[#fafcf8] p-4 space-y-2">
          <div className="flex items-center gap-2 text-[#173923]">
            <ShieldCheck className="w-4 h-4" />
            <p className="text-sm font-semibold">Document d'identite obligatoire</p>
          </div>
          <p className="text-xs text-gray-600">
            Formats acceptes: PDF, JPG, PNG, WEBP (5 Mo max).
          </p>
          {documentUploaded ? (
            <p className="text-xs text-emerald-700">
              Document deja recu: {uploadedDocumentName || "piece d'identite"}
            </p>
          ) : (
            <p className="text-xs text-amber-700">Aucun document televerse pour le moment.</p>
          )}
        </div>

        <input
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          onChange={(event) => {
            const file = event.target.files?.[0] || null;
            setSelectedDocument(file);
          }}
          className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border file:border-[#cfd7c8] file:bg-[#f8fcf6] file:px-3 file:py-2 file:text-sm file:font-medium"
        />

        <Button
          type="button"
          className="h-11 w-full rounded-md bg-[#14531c] hover:bg-[#0f4216] text-white font-semibold"
          onClick={() => {
            if (!selectedDocument) {
              toast.error("Selectionnez un document avant televersement.");
              return;
            }
            uploadMutation.mutate(selectedDocument);
          }}
          disabled={uploadMutation.isPending || !selectedDocument}
        >
          {uploadMutation.isPending ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Televersement...
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <UploadCloud className="w-4 h-4" />
              Televerser et continuer vers le quiz
            </span>
          )}
        </Button>

        {documentUploaded ? (
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-md border-[#cfd7c8]"
            onClick={() => navigate(createPageUrl("DonorQuiz"), { replace: true })}
          >
            Continuer vers le quiz
          </Button>
        ) : null}
      </div>
    </AuthSplitLayout>
  );
}
