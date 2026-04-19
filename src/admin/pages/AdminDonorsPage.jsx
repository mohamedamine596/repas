import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Mail, ShieldAlert, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  SheetHeader,
  SheetTitle,
  SheetDescription,
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

export default function AdminDonorsPage() {
  const [searchParams] = useSearchParams();
  const defaultStatus = searchParams.get("status") || "all";

  const {
    donors,
    openReportsByDonor,
    rules,
    getDonorDonationHistory,
    activateDonors,
    suspendDonors,
    sendEmailToDonor,
  } = useAdminData();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState(defaultStatus);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectedDonorId, setSelectedDonorId] = useState(null);
  const [showIdPhoto, setShowIdPhoto] = useState(false);
  const [loadingTable, setLoadingTable] = useState(true);
  const [confirmSuspendOpen, setConfirmSuspendOpen] = useState(false);
  const [suspendTargetIds, setSuspendTargetIds] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => setLoadingTable(false), 650);
    return () => clearTimeout(timer);
  }, []);

  const filteredDonors = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return donors.filter((donor) => {
      const matchesStatus = statusFilter === "all" || donor.status === statusFilter;
      const matchesSearch =
        !term ||
        donor.name.toLowerCase().includes(term) ||
        donor.email.toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [donors, searchTerm, statusFilter]);

  const selectedDonor = useMemo(
    () => donors.find((donor) => donor.id === selectedDonorId) || null,
    [donors, selectedDonorId]
  );

  const donorHistory = useMemo(
    () => (selectedDonor ? getDonorDonationHistory(selectedDonor.id) : []),
    [selectedDonor, getDonorDonationHistory]
  );

  const isAllVisibleSelected =
    filteredDonors.length > 0 && filteredDonors.every((donor) => selectedIds.has(donor.id));

  const toggleSelectAll = () => {
    if (isAllVisibleSelected) {
      const next = new Set(selectedIds);
      filteredDonors.forEach((donor) => next.delete(donor.id));
      setSelectedIds(next);
      return;
    }

    const next = new Set(selectedIds);
    filteredDonors.forEach((donor) => next.add(donor.id));
    setSelectedIds(next);
  };

  const toggleSelectOne = (donorId) => {
    const next = new Set(selectedIds);
    if (next.has(donorId)) {
      next.delete(donorId);
    } else {
      next.add(donorId);
    }
    setSelectedIds(next);
  };

  const handleBulkActivate = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      toast.error("Selectionnez au moins un donneur.");
      return;
    }
    activateDonors(ids);
    toast.success("Compte active avec succes.");
  };

  const askSuspend = (ids) => {
    if (ids.length === 0) {
      toast.error("Selectionnez au moins un donneur.");
      return;
    }
    setSuspendTargetIds(ids);
    setConfirmSuspendOpen(true);
  };

  const confirmSuspend = () => {
    suspendDonors(suspendTargetIds, "Suspension manuelle depuis l'admin dashboard");
    toast.success("Compte suspendu avec succes.");
    setConfirmSuspendOpen(false);
    setSuspendTargetIds([]);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#234D1A]">Donneurs</h2>
          <p className="text-sm text-[#7B6D59]">Validation, moderation et suivi des comptes donneurs.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-[#D4C8B3]"
            onClick={handleBulkActivate}
          >
            <ShieldCheck className="w-4 h-4 mr-2" />
            Activer selection
          </Button>
          <Button
            type="button"
            className="bg-[#A01616] hover:bg-[#860F0F] text-white"
            onClick={() => askSuspend(Array.from(selectedIds))}
          >
            <ShieldAlert className="w-4 h-4 mr-2" />
            Suspendre selection
          </Button>
        </div>
      </div>

      <div className="bg-white border border-[#E6DCCB] rounded-xl p-4 space-y-3 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3">
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Rechercher par nom ou email"
            className="border-[#D8CEBC]"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-10 rounded-md border border-[#D8CEBC] px-3 text-sm bg-white"
          >
            <option value="all">Tous les statuts</option>
            <option value="actif">actif</option>
            <option value="en_attente">en_attente</option>
            <option value="suspendu">suspendu</option>
          </select>
        </div>

        <div className="border border-[#EEE6D8] rounded-xl overflow-hidden">
          {loadingTable ? (
            <TableLoadingSkeleton rows={7} columns={8} />
          ) : (
            <Table>
              <TableHeader className="bg-[#FFF9EF]">
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={isAllVisibleSelected}
                      onChange={toggleSelectAll}
                      aria-label="Selectionner tout"
                    />
                  </TableHead>
                  <TableHead>Photo</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Score quiz</TableHead>
                  <TableHead>Date inscription</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDonors.map((donor) => {
                  const openReports = openReportsByDonor[donor.id] || 0;
                  const showRecommendation =
                    donor.status !== "suspendu" &&
                    openReports >= rules.autoSuspensionOpenReports;

                  return (
                    <TableRow
                      key={donor.id}
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedDonorId(donor.id);
                        setShowIdPhoto(false);
                      }}
                    >
                      <TableCell onClick={(event) => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(donor.id)}
                          onChange={() => toggleSelectOne(donor.id)}
                          aria-label={`Selectionner ${donor.name}`}
                        />
                      </TableCell>
                      <TableCell>
                        <img
                          src={donor.photoUrl}
                          alt={donor.name}
                          className="w-10 h-10 rounded-full object-cover border border-[#E6DCCB]"
                        />
                      </TableCell>
                      <TableCell className="font-medium text-[#1F2937]">{donor.name}</TableCell>
                      <TableCell>{donor.email}</TableCell>
                      <TableCell>{donor.city}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <StatusPill value={showRecommendation ? "recommendation" : donor.status}>
                            {showRecommendation ? "suspension recommandee" : donor.status}
                          </StatusPill>
                          {showRecommendation ? (
                            <span className="text-[11px] text-[#A01616]">
                              {openReports} signalements ouverts
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>{donor.quizScore}/5</TableCell>
                      <TableCell>{formatDate(donor.registeredAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          className="border-[#D4C8B3]"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedDonorId(donor.id);
                            setShowIdPhoto(false);
                          }}
                        >
                          Voir
                        </Button>
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
        open={Boolean(selectedDonor)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedDonorId(null);
            setShowIdPhoto(false);
          }
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-[560px] bg-[#FFFDF7] border-l border-[#E6DCCB] overflow-auto">
          {selectedDonor ? (
            <>
              <SheetHeader>
                <SheetTitle className="text-[#234D1A]">Profil donneur</SheetTitle>
                <SheetDescription>{selectedDonor.name} - {selectedDonor.email}</SheetDescription>
              </SheetHeader>

              <div className="mt-4 space-y-4 text-sm">
                <div className="rounded-lg border border-[#E8DEC9] bg-white p-3 flex items-center gap-3">
                  <img src={selectedDonor.photoUrl} alt={selectedDonor.name} className="w-14 h-14 rounded-full object-cover" />
                  <div>
                    <p className="font-semibold text-[#1F2937]">{selectedDonor.name}</p>
                    <p className="text-[#667085]">{selectedDonor.city} - {selectedDonor.phone}</p>
                    <StatusPill value={selectedDonor.status} className="mt-2">{selectedDonor.status}</StatusPill>
                  </div>
                </div>

                {(openReportsByDonor[selectedDonor.id] || 0) >= rules.autoSuspensionOpenReports ? (
                  <div className="rounded-lg border border-[#F5B7B7] bg-[#FDE7E7] px-3 py-2 text-[#A01616] text-xs font-semibold">
                    Suspension recommandee: {(openReportsByDonor[selectedDonor.id] || 0)} signalements ouverts.
                  </div>
                ) : null}

                <div className="rounded-lg border border-[#E8DEC9] bg-white p-3">
                  <p className="font-semibold text-[#1F2937] mb-2">Piece d'identite</p>
                  <img
                    src={selectedDonor.idPhotoUrl}
                    alt="Piece d'identite"
                    className={`w-full h-[180px] object-cover rounded-md border border-[#E7DDCB] ${showIdPhoto ? "blur-0" : "blur-sm"}`}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-2 border-[#D4C8B3]"
                    onClick={() => setShowIdPhoto((prev) => !prev)}
                  >
                    {showIdPhoto ? "Masquer" : "Cliquer pour voir"}
                  </Button>
                </div>

                <div className="rounded-lg border border-[#E8DEC9] bg-white p-3">
                  <p className="font-semibold text-[#1F2937] mb-2">Resultat quiz</p>
                  <p className="text-[#344054]">Score: <strong>{selectedDonor.quizScore}/5</strong></p>
                  <p className="text-[#667085] mt-1">Questions incorrectes:</p>
                  {selectedDonor.wrongAnswers.length > 0 ? (
                    <ul className="list-disc pl-5 text-[#344054] mt-1">
                      {selectedDonor.wrongAnswers.map((indexValue) => (
                        <li key={`${selectedDonor.id}-wrong-${indexValue}`}>
                          Question {indexValue + 1}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[#344054] mt-1">Aucune erreur.</p>
                  )}
                </div>

                <div className="rounded-lg border border-[#E8DEC9] bg-white p-3">
                  <p className="font-semibold text-[#1F2937] mb-2">Historique donations</p>
                  <ul className="space-y-2 max-h-[180px] overflow-auto pr-1">
                    {donorHistory.map((donation) => (
                      <li key={donation.id} className="border border-[#EEE6D8] rounded-md p-2">
                        <p className="font-medium text-[#344054]">{donation.description}</p>
                        <p className="text-xs text-[#667085]">
                          {donation.quantity} - {donation.city} - {formatDate(donation.publishedAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Button
                    type="button"
                    className="bg-[#2D6A1F] hover:bg-[#245619] text-white"
                    onClick={() => {
                      activateDonors([selectedDonor.id]);
                      toast.success("Compte active avec succes.");
                    }}
                  >
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Activer le compte
                  </Button>

                  <Button
                    type="button"
                    className="bg-[#A01616] hover:bg-[#860F0F] text-white"
                    onClick={() => askSuspend([selectedDonor.id])}
                  >
                    <ShieldAlert className="w-4 h-4 mr-2" />
                    Suspendre
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="border-[#D4C8B3]"
                    onClick={() => {
                      sendEmailToDonor(selectedDonor.id, "Message depuis la moderation");
                      toast.success("Email envoye.");
                    }}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Envoyer un email
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
              Cette action est destructive et bloquera les comptes selectionnes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-[#A01616] hover:bg-[#860F0F]" onClick={confirmSuspend}>
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
