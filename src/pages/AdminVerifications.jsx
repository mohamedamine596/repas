import React, { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldCheck, Loader2, Eye, Download } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { backendApi } from "@/api/backendClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STATUS_OPTIONS = ["PENDING", "APPROVED", "REJECTED", "ALL"];

export default function AdminVerifications() {
  const { isAdmin, token } = useAuth();
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [reasons, setReasons] = useState({});
  const [loadingDocumentId, setLoadingDocumentId] = useState("");
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerDocument, setViewerDocument] = useState(null);

  const clearViewerDocument = () => {
    setViewerDocument((previous) => {
      if (previous?.objectUrl) {
        URL.revokeObjectURL(previous.objectUrl);
      }
      return null;
    });
  };

  useEffect(() => {
    return () => {
      if (viewerDocument?.objectUrl) {
        URL.revokeObjectURL(viewerDocument.objectUrl);
      }
    };
  }, [viewerDocument]);

  const {
    data: verifications = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["adminVerifications", token, statusFilter],
    queryFn: async () => {
      const data = await backendApi.admin.listVerifications(token, statusFilter);
      return Array.isArray(data?.verifications) ? data.verifications : [];
    },
    enabled: isAdmin && !!token,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, reason }) =>
      backendApi.admin.reviewVerification(token, id, { status, reason }),
    onSuccess: (_data, vars) => {
      toast.success(
        vars.status === "APPROVED"
          ? "Demande approuvee"
          : "Demande rejetee"
      );
      refetch();
    },
    onError: (error) => {
      toast.error(error?.message || "Action admin impossible");
    },
  });

  const openDocumentInViewer = async (item) => {
    if (!item?.document?.hasFile) {
      toast.error("Aucun document a afficher pour cette demande.");
      return;
    }

    setLoadingDocumentId(item.id);
    try {
      const fileResult = await backendApi.admin.getVerificationDocument(token, item.id);
      const objectUrl = URL.createObjectURL(fileResult.blob);

      setViewerDocument((previous) => {
        if (previous?.objectUrl) {
          URL.revokeObjectURL(previous.objectUrl);
        }
        return {
          objectUrl,
          mimeType: fileResult.contentType || item.document?.mimeType || "",
          fileName: fileResult.filename || item.document?.originalName || "verification-document",
        };
      });
      setViewerOpen(true);
    } catch (error) {
      toast.error(error?.message || "Impossible d'ouvrir le document");
    } finally {
      setLoadingDocumentId("");
    }
  };

  const downloadDocument = async (item) => {
    if (!item?.document?.hasFile) {
      toast.error("Aucun document a telecharger pour cette demande.");
      return;
    }

    setLoadingDocumentId(item.id);
    try {
      const fileResult = await backendApi.admin.getVerificationDocument(token, item.id, { download: true });
      const objectUrl = URL.createObjectURL(fileResult.blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = fileResult.filename || item.document?.originalName || "verification-document";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      toast.success("Telechargement demarre.");
    } catch (error) {
      toast.error(error?.message || "Impossible de telecharger le document");
    } finally {
      setLoadingDocumentId("");
    }
  };

  const downloadFromViewer = () => {
    if (!viewerDocument?.objectUrl) {
      return;
    }
    const anchor = document.createElement("a");
    anchor.href = viewerDocument.objectUrl;
    anchor.download = viewerDocument.fileName || "verification-document";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Acces admin requis</h1>
        <p className="text-gray-500 mt-2">Cette page est reservee aux administrateurs.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#1B5E3B]" />
            Verification des donneurs
          </h1>
          <p className="text-gray-500 mt-1">Approuvez ou rejetez les demandes de verification.</p>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-[#1B5E3B]" />
        </div>
      ) : verifications.length === 0 ? (
        <Card className="border-[#f0e8df]">
          <CardContent className="p-8 text-center text-gray-500">
            Aucune demande pour ce filtre.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {verifications.map((item) => (
            <Card key={item.id} className="border-[#f0e8df]">
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{item.user?.name || item.user?.email}</span>
                  <span className="text-xs font-medium text-gray-500">{item.status}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p><strong>Email:</strong> {item.user?.email}</p>
                <p><strong>Role:</strong> {item.user?.role}</p>
                <p>
                  <strong>Source:</strong>{" "}
                  {item.sourceType === "QUIZ"
                    ? item.document?.hasFile
                      ? "Quiz securite alimentaire + document"
                      : "Quiz securite alimentaire"
                    : "Document"}
                </p>
                {item.sourceType === "QUIZ" ? (
                  <p><strong>Score quiz:</strong> {item.quizScore ?? "-"}/{item.quizTotal ?? 5}</p>
                ) : null}

                <p><strong>Document:</strong> {item.document?.originalName || "-"}</p>
                <p><strong>Type:</strong> {item.document?.mimeType || "-"}</p>
                <p><strong>Taille:</strong> {item.document?.size || 0} octets</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-[#cfd7c8]"
                    onClick={() => openDocumentInViewer(item)}
                    disabled={!item.document?.hasFile || loadingDocumentId === item.id}
                  >
                    {loadingDocumentId === item.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Eye className="w-4 h-4 mr-2" />
                    )}
                    Voir dans la plateforme
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-[#cfd7c8]"
                    onClick={() => downloadDocument(item)}
                    disabled={!item.document?.hasFile || loadingDocumentId === item.id}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Telecharger
                  </Button>
                </div>

                {item.status === "PENDING" && (
                  <div className="space-y-2 pt-2">
                    <Label>Motif du rejet (optionnel)</Label>
                    <Textarea
                      value={reasons[item.id] || ""}
                      onChange={(e) =>
                        setReasons((prev) => ({
                          ...prev,
                          [item.id]: e.target.value,
                        }))
                      }
                      placeholder="Expliquez le rejet si necessaire"
                    />

                    <div className="flex gap-2">
                      <Button
                        className="bg-[#1B5E3B] hover:bg-[#154d30] text-white"
                        onClick={() =>
                          reviewMutation.mutate({
                            id: item.id,
                            status: "APPROVED",
                            reason: "",
                          })
                        }
                        disabled={reviewMutation.isPending || !item.document?.hasFile}
                      >
                        Approuver
                      </Button>

                      <Button
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                        onClick={() =>
                          reviewMutation.mutate({
                            id: item.id,
                            status: "REJECTED",
                            reason: reasons[item.id] || "",
                          })
                        }
                        disabled={reviewMutation.isPending}
                      >
                        Rejeter
                      </Button>
                    </div>

                    {!item.document?.hasFile ? (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                        Approbation bloquee: document d'identite manquant.
                      </p>
                    ) : null}
                  </div>
                )}

                {item.status === "REJECTED" && item.rejectionReason && (
                  <p className="text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                    Motif: {item.rejectionReason}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={viewerOpen}
        onOpenChange={(open) => {
          setViewerOpen(open);
          if (!open) {
            clearViewerDocument();
          }
        }}
      >
        <DialogContent className="w-[95vw] max-w-5xl">
          <DialogHeader>
            <DialogTitle>Apercu du document</DialogTitle>
            <DialogDescription>
              {viewerDocument?.fileName || "Document de verification"}
            </DialogDescription>
          </DialogHeader>

          <div className="h-[70vh] w-full overflow-auto rounded-md border border-slate-200 bg-slate-50 p-2">
            {viewerDocument?.mimeType?.startsWith("image/") ? (
              <img
                src={viewerDocument.objectUrl}
                alt={viewerDocument.fileName || "document"}
                className="mx-auto max-h-full max-w-full object-contain"
              />
            ) : viewerDocument?.mimeType?.includes("pdf") ? (
              <iframe
                title="Document de verification"
                src={viewerDocument.objectUrl}
                className="h-full w-full rounded"
              />
            ) : (
              <div className="h-full flex items-center justify-center text-center text-sm text-slate-600 px-6">
                Ce type de fichier ne peut pas etre previsualise ici. Utilisez Telecharger.
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={downloadFromViewer}>
              <Download className="w-4 h-4 mr-2" />
              Telecharger
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
