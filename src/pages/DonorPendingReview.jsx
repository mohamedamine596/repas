// @ts-nocheck
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Clock3, ShieldCheck } from "lucide-react";
import AuthSplitLayout from "@/components/auth/AuthSplitLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import { backendApi } from "@/api/backendClient";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";

export default function DonorPendingReview() {
  const navigate = useNavigate();
  const { user, token, isLoadingAuth } = useAuth();
  const [selectedDocument, setSelectedDocument] = useState(null);

  const {
    data: verificationStatus,
    refetch,
    isLoading: loadingVerification,
  } = useQuery({
    queryKey: ["donorVerificationStatus", user?.id, token],
    queryFn: () => backendApi.verification.status(token),
    enabled: !!token && user?.role === "DONOR",
  });

  const uploadMutation = useMutation({
    mutationFn: (file) => backendApi.verification.upload(token, file),
    onSuccess: async (response) => {
      toast.success(response?.message || "Document televerse avec succes.");
      setSelectedDocument(null);
      await refetch();
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
      return;
    }

    if (user.accountStatus === "active") {
      navigate("/donneur/dashboard", { replace: true });
      return;
    }

    if (user.accountStatus === "suspended") {
      navigate(createPageUrl("Login"), { replace: true });
    }
  }, [isLoadingAuth, navigate, user]);

  if (isLoadingAuth || !user) {
    return null;
  }

  return (
    <AuthSplitLayout
      eyebrow="Verification"
      title="Verification en cours"
      subtitle="Votre compte est en attente de validation par un administrateur."
    >
      <div className="space-y-5 rounded-xl border border-[#dfeadb] bg-[#f8fcf6] p-5">
        <div className="flex items-center gap-3 text-[#1d4f2a]">
          <ShieldCheck className="h-5 w-5" />
          <p className="font-semibold">Votre quiz et votre document sont valides.</p>
        </div>
        <div className="flex items-center gap-3 text-[#1d4f2a]">
          <Clock3 className="h-5 w-5" />
          <p className="font-semibold">Votre compte est en cours de verification (24-48h).</p>
        </div>
        <p className="text-sm text-gray-600">
          Vous recevrez une notification email des qu'une decision est prise. Pendant ce delai, vous pouvez consulter votre espace mais la publication de dons reste desactivee.
        </p>

        <div className="rounded-lg border border-[#dbe5d5] bg-white p-4 space-y-3">
          <p className="text-sm font-semibold text-[#173923]">Piece d'identite</p>
          {loadingVerification ? (
            <p className="text-xs text-gray-600">Verification du document en cours...</p>
          ) : (
            <p className={`text-xs ${verificationStatus?.latestRequest?.documentUploaded ? "text-emerald-700" : "text-amber-700"}`}>
              {verificationStatus?.latestRequest?.documentUploaded
                ? `Document recu: ${verificationStatus?.latestRequest?.document?.originalName || "piece d'identite"}`
                : "Aucun document detecte. Veuillez televerser votre piece d'identite."}
            </p>
          )}

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
            variant="outline"
            className="border-[#cfd7c8]"
            onClick={() => {
              if (!selectedDocument) {
                toast.error("Selectionnez un document avant televersement.");
                return;
              }
              uploadMutation.mutate(selectedDocument);
            }}
            disabled={uploadMutation.isPending || !selectedDocument}
          >
            {uploadMutation.isPending ? "Televersement..." : "Televerser / remplacer le document"}
          </Button>
        </div>
      </div>

      <div className="mt-5">
        <Button
          type="button"
          className="h-11 w-full rounded-md bg-[#14531c] hover:bg-[#0f4216] text-white font-semibold"
          onClick={() => navigate(createPageUrl("Dashboard"))}
        >
          Aller au tableau de bord
        </Button>
      </div>
    </AuthSplitLayout>
  );
}
