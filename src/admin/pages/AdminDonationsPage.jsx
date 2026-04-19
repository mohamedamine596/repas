import React, { useEffect, useMemo, useState } from "react";
import { Flag, UserRound } from "lucide-react";
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
import StatusPill from "../components/StatusPill";
import TableLoadingSkeleton from "../components/TableLoadingSkeleton";
import { useAdminData } from "../AdminContext";
import { CITY_OPTIONS } from "../mockData";

function formatDate(value) {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function AdminDonationsPage() {
  const { donations, receiverLookup, flagDonationAsInappropriate } = useAdminData();

  const [statusFilter, setStatusFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedDonationId, setSelectedDonationId] = useState(null);
  const [loadingTable, setLoadingTable] = useState(true);
  const [confirmFlagOpen, setConfirmFlagOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoadingTable(false), 580);
    return () => clearTimeout(timer);
  }, []);

  const filteredDonations = useMemo(() => {
    return donations.filter((donation) => {
      if (statusFilter !== "all" && donation.status !== statusFilter) {
        return false;
      }
      if (cityFilter !== "all" && donation.city !== cityFilter) {
        return false;
      }

      const publishedDate = new Date(donation.publishedAt);
      if (fromDate) {
        const from = new Date(fromDate);
        if (publishedDate < from) return false;
      }
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        if (publishedDate > to) return false;
      }
      return true;
    });
  }, [donations, statusFilter, cityFilter, fromDate, toDate]);

  const selectedDonation = useMemo(
    () => donations.find((donation) => donation.id === selectedDonationId) || null,
    [donations, selectedDonationId]
  );

  const selectedReceiver = selectedDonation?.receiverId
    ? receiverLookup[selectedDonation.receiverId]
    : null;

  const handleFlagDonation = () => {
    if (!selectedDonation) return;
    flagDonationAsInappropriate(selectedDonation.id);
    toast.success("Signalement cree et avertissement envoye au donneur.");
    setConfirmFlagOpen(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-[#234D1A]">Donations</h2>
        <p className="text-sm text-[#7B6D59]">Pilotage des donations et qualite des annonces.</p>
      </div>

      <div className="bg-white border border-[#E6DCCB] rounded-xl p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-10 rounded-md border border-[#D8CEBC] px-3 text-sm bg-white"
          >
            <option value="all">Tous les statuts</option>
            <option value="disponible">disponible</option>
            <option value="reclame">reclame</option>
            <option value="expire">expire</option>
          </select>

          <select
            value={cityFilter}
            onChange={(event) => setCityFilter(event.target.value)}
            className="h-10 rounded-md border border-[#D8CEBC] px-3 text-sm bg-white"
          >
            <option value="all">Toutes les villes</option>
            {CITY_OPTIONS.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>

          <input
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            className="h-10 rounded-md border border-[#D8CEBC] px-3 text-sm"
          />

          <input
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
            className="h-10 rounded-md border border-[#D8CEBC] px-3 text-sm"
          />
        </div>

        <div className="border border-[#EEE6D8] rounded-xl overflow-hidden">
          {loadingTable ? (
            <TableLoadingSkeleton rows={7} columns={6} />
          ) : (
            <Table>
              <TableHeader className="bg-[#FFF9EF]">
                <TableRow>
                  <TableHead>Donneur</TableHead>
                  <TableHead>Description aliment</TableHead>
                  <TableHead>Quantite</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDonations.map((donation) => (
                  <TableRow
                    key={donation.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedDonationId(donation.id)}
                  >
                    <TableCell className="font-medium text-[#1F2937]">{donation.donorName}</TableCell>
                    <TableCell>{donation.description}</TableCell>
                    <TableCell>{donation.quantity}</TableCell>
                    <TableCell>{donation.city}</TableCell>
                    <TableCell>{formatDate(donation.publishedAt)}</TableCell>
                    <TableCell>
                      <StatusPill value={donation.status}>{donation.status}</StatusPill>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <Sheet
        open={Boolean(selectedDonation)}
        onOpenChange={(open) => {
          if (!open) setSelectedDonationId(null);
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-[540px] bg-[#FFFDF7] border-l border-[#E6DCCB] overflow-auto">
          {selectedDonation ? (
            <>
              <SheetHeader>
                <SheetTitle className="text-[#234D1A]">Detail donation</SheetTitle>
                <SheetDescription>{selectedDonation.description}</SheetDescription>
              </SheetHeader>

              <div className="mt-4 space-y-4 text-sm">
                <div className="rounded-lg border border-[#E8DEC9] bg-white p-3 space-y-1">
                  <p><strong>Donneur:</strong> {selectedDonation.donorName}</p>
                  <p><strong>Quantite:</strong> {selectedDonation.quantity}</p>
                  <p><strong>Ville:</strong> {selectedDonation.city}</p>
                  <p><strong>Date publication:</strong> {formatDate(selectedDonation.publishedAt)}</p>
                  <p><strong>Statut:</strong> <StatusPill value={selectedDonation.status} className="ml-1">{selectedDonation.status}</StatusPill></p>
                </div>

                <div className="rounded-lg border border-[#E8DEC9] bg-white p-3">
                  <p className="font-semibold text-[#1F2937] mb-2">Information receveur</p>
                  {selectedReceiver ? (
                    <div className="space-y-1">
                      <p><strong>Nom:</strong> {selectedReceiver.name}</p>
                      <p><strong>Email:</strong> {selectedReceiver.email}</p>
                      <p><strong>Ville:</strong> {selectedReceiver.city}</p>
                    </div>
                  ) : (
                    <p className="text-[#667085]">Aucun receveur attache pour cette donation.</p>
                  )}
                </div>

                <Button
                  type="button"
                  className="w-full bg-[#A01616] hover:bg-[#860F0F] text-white"
                  onClick={() => setConfirmFlagOpen(true)}
                >
                  <Flag className="w-4 h-4 mr-2" />
                  Signaler comme inapproprie
                </Button>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmFlagOpen} onOpenChange={setConfirmFlagOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer le signalement</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action enverra un avertissement au donneur et ouvrira un signalement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-[#A01616] hover:bg-[#860F0F]" onClick={handleFlagDonation}>
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
