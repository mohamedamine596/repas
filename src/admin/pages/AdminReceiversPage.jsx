import React, { useEffect, useMemo, useState } from "react";
import { UserRound } from "lucide-react";
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
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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

export default function AdminReceiversPage() {
  const { receivers, getReceiverDonationHistory } = useAdminData();
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingTable, setLoadingTable] = useState(true);
  const [selectedReceiverId, setSelectedReceiverId] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoadingTable(false), 520);
    return () => clearTimeout(timer);
  }, []);

  const filteredReceivers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return receivers.filter((receiver) => {
      if (!term) return true;
      return (
        receiver.name.toLowerCase().includes(term) ||
        receiver.email.toLowerCase().includes(term)
      );
    });
  }, [receivers, searchTerm]);

  const selectedReceiver = useMemo(
    () => receivers.find((receiver) => receiver.id === selectedReceiverId) || null,
    [receivers, selectedReceiverId]
  );

  const receiverHistory = useMemo(
    () => (selectedReceiver ? getReceiverDonationHistory(selectedReceiver.id) : []),
    [selectedReceiver, getReceiverDonationHistory]
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-[#234D1A]">Receveurs</h2>
        <p className="text-sm text-[#7B6D59]">Suivi des profils receveurs et historique de recuperation.</p>
      </div>

      <div className="bg-white border border-[#E6DCCB] rounded-xl p-4 shadow-sm space-y-3">
        <Input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Rechercher par nom ou email"
          className="border-[#D8CEBC]"
        />

        <div className="border border-[#EEE6D8] rounded-xl overflow-hidden">
          {loadingTable ? (
            <TableLoadingSkeleton rows={6} columns={6} />
          ) : (
            <Table>
              <TableHeader className="bg-[#FFF9EF]">
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead>Date inscription</TableHead>
                  <TableHead>Donations recues</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReceivers.map((receiver) => {
                  const totalReceived = getReceiverDonationHistory(receiver.id).length;
                  return (
                    <TableRow
                      key={receiver.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedReceiverId(receiver.id)}
                    >
                      <TableCell className="font-medium text-[#1F2937]">{receiver.name}</TableCell>
                      <TableCell>{receiver.email}</TableCell>
                      <TableCell>{receiver.city}</TableCell>
                      <TableCell>{formatDate(receiver.registeredAt)}</TableCell>
                      <TableCell>{totalReceived}</TableCell>
                      <TableCell>
                        <StatusPill value={receiver.status === "suspendu" ? "suspendu" : "actif"}>
                          {receiver.status}
                        </StatusPill>
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
        open={Boolean(selectedReceiver)}
        onOpenChange={(open) => {
          if (!open) setSelectedReceiverId(null);
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-[520px] bg-[#FFFDF7] border-l border-[#E6DCCB] overflow-auto">
          {selectedReceiver ? (
            <>
              <SheetHeader>
                <SheetTitle className="text-[#234D1A]">Profil receveur</SheetTitle>
                <SheetDescription>{selectedReceiver.name} - {selectedReceiver.email}</SheetDescription>
              </SheetHeader>

              <div className="mt-4 space-y-4 text-sm">
                <div className="rounded-lg border border-[#E8DEC9] bg-white p-3 flex items-center gap-3">
                  <span className="w-12 h-12 rounded-full bg-[#EAF3E5] text-[#2D6A1F] flex items-center justify-center">
                    <UserRound className="w-6 h-6" />
                  </span>
                  <div>
                    <p className="font-semibold text-[#1F2937]">{selectedReceiver.name}</p>
                    <p className="text-[#667085]">{selectedReceiver.city} - {selectedReceiver.phone}</p>
                    <StatusPill value={selectedReceiver.status === "suspendu" ? "suspendu" : "actif"} className="mt-2">
                      {selectedReceiver.status}
                    </StatusPill>
                  </div>
                </div>

                <div className="rounded-lg border border-[#E8DEC9] bg-white p-3">
                  <p className="font-semibold text-[#1F2937] mb-2">Historique des donations recues</p>
                  <ul className="space-y-2 max-h-[280px] overflow-auto pr-1">
                    {receiverHistory.map((donation) => (
                      <li key={donation.id} className="border border-[#EEE6D8] rounded-md p-2">
                        <p className="font-medium text-[#344054]">{donation.description}</p>
                        <p className="text-xs text-[#667085]">
                          Donneur: {donation.donorName} - {donation.quantity} - {formatDate(donation.publishedAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
