import React, { useEffect, useMemo, useState } from "react";
import { MailWarning, ShieldAlert, ShieldCheck, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import TableLoadingSkeleton from "../components/TableLoadingSkeleton";
import StatusPill from "../components/StatusPill";
import { useAdminData } from "../AdminContext";

function formatDate(value) {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function AdminReportsPage() {
  const {
    reports,
    donorLookup,
    openReportsByDonor,
    rules,
    warnDonorFromReport,
    suspendDonorFromReport,
    markReportAsResolved,
  } = useAdminData();

  const [statusFilter, setStatusFilter] = useState("all");
  const [loadingTable, setLoadingTable] = useState(true);
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [confirmSuspendOpen, setConfirmSuspendOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoadingTable(false), 520);
    return () => clearTimeout(timer);
  }, []);

  const filteredReports = useMemo(() => {
    if (statusFilter === "all") return reports;
    return reports.filter((report) => report.status === statusFilter);
  }, [reports, statusFilter]);

  const selectedReport = useMemo(
    () => reports.find((report) => report.id === selectedReportId) || null,
    [reports, selectedReportId]
  );

  const selectedDonor = selectedReport ? donorLookup[selectedReport.donorId] : null;
  const selectedDonorOpenReports = selectedReport
    ? openReportsByDonor[selectedReport.donorId] || 0
    : 0;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-[#234D1A]">Signalements</h2>
        <p className="text-sm text-[#7B6D59]">Traitement des incidents et moderation des donneurs.</p>
      </div>

      <div className="bg-white border border-[#E6DCCB] rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex justify-end">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-10 rounded-md border border-[#D8CEBC] px-3 text-sm bg-white"
          >
            <option value="all">Tous les statuts</option>
            <option value="ouvert">ouvert</option>
            <option value="resolu">resolu</option>
          </select>
        </div>

        <div className="border border-[#EEE6D8] rounded-xl overflow-hidden">
          {loadingTable ? (
            <TableLoadingSkeleton rows={6} columns={6} />
          ) : (
            <Table>
              <TableHeader className="bg-[#FFF9EF]">
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Signale par</TableHead>
                  <TableHead>Contre</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Alerte</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => {
                  const donor = donorLookup[report.donorId];
                  const openCount = openReportsByDonor[report.donorId] || 0;
                  const showRecommendation =
                    donor?.status !== "suspendu" &&
                    openCount >= rules.autoSuspensionOpenReports;

                  return (
                    <TableRow
                      key={report.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedReportId(report.id)}
                    >
                      <TableCell className="font-medium text-[#1F2937]">{report.type}</TableCell>
                      <TableCell>{report.reportedBy}</TableCell>
                      <TableCell>{report.donorName}</TableCell>
                      <TableCell>{formatDate(report.createdAt)}</TableCell>
                      <TableCell>
                        <StatusPill value={report.status}>{report.status}</StatusPill>
                      </TableCell>
                      <TableCell>
                        {showRecommendation ? (
                          <StatusPill value="recommendation">Suspension recommandee</StatusPill>
                        ) : (
                          <span className="text-xs text-[#8B7A64]">Aucune</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <Sheet
        open={Boolean(selectedReport)}
        onOpenChange={(open) => {
          if (!open) setSelectedReportId(null);
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-[560px] bg-[#FFFDF7] border-l border-[#E6DCCB] overflow-auto">
          {selectedReport ? (
            <>
              <SheetHeader>
                <SheetTitle className="text-[#234D1A]">Detail signalement</SheetTitle>
                <SheetDescription>
                  {selectedReport.type} - contre {selectedReport.donorName}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-4 space-y-4 text-sm">
                <div className="rounded-lg border border-[#E8DEC9] bg-white p-3 space-y-1">
                  <p><strong>Type:</strong> {selectedReport.type}</p>
                  <p><strong>Signale par:</strong> {selectedReport.reportedBy}</p>
                  <p><strong>Donneur cible:</strong> {selectedReport.donorName}</p>
                  <p><strong>Date:</strong> {formatDate(selectedReport.createdAt)}</p>
                  <p><strong>Statut:</strong> <StatusPill value={selectedReport.status} className="ml-1">{selectedReport.status}</StatusPill></p>
                </div>

                <div className="rounded-lg border border-[#E8DEC9] bg-white p-3">
                  <p className="font-semibold text-[#1F2937] mb-1">Detail</p>
                  <p className="text-[#344054] leading-relaxed">{selectedReport.detail}</p>
                </div>

                {selectedDonorOpenReports >= rules.autoSuspensionOpenReports && selectedDonor?.status !== "suspendu" ? (
                  <div className="rounded-lg border border-[#F5B7B7] bg-[#FDE7E7] p-3 text-[#A01616] text-sm font-semibold">
                    Suspension recommandee: ce donneur atteint {selectedDonorOpenReports} signalements ouverts.
                  </div>
                ) : null}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-[#D4C8B3]"
                    onClick={() => {
                      warnDonorFromReport(selectedReport.id);
                      toast.success("Avertissement envoye au donneur.");
                    }}
                  >
                    <MailWarning className="w-4 h-4 mr-2" />
                    Avertir le donneur
                  </Button>

                  <Button
                    type="button"
                    className="bg-[#A01616] hover:bg-[#860F0F] text-white"
                    onClick={() => setConfirmSuspendOpen(true)}
                  >
                    <ShieldAlert className="w-4 h-4 mr-2" />
                    Suspendre le donneur
                  </Button>

                  <Button
                    type="button"
                    className="bg-[#2D6A1F] hover:bg-[#245619] text-white"
                    onClick={() => {
                      markReportAsResolved(selectedReport.id);
                      toast.success("Signalement marque comme resolu.");
                    }}
                  >
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Marquer comme resolu
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmSuspendOpen} onOpenChange={setConfirmSuspendOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suspension</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est destructive et suspendra immediatement le compte donneur.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#A01616] hover:bg-[#860F0F]"
              onClick={() => {
                if (!selectedReport) return;
                suspendDonorFromReport(selectedReport.id);
                toast.success("Donneur suspendu avec succes.");
                setConfirmSuspendOpen(false);
              }}
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
