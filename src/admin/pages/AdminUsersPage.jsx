import React, { useEffect, useMemo, useState } from "react";
import { Download, Eye, Mail, ShieldAlert, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Card, CardContent } from "@/components/ui/card";
import TableLoadingSkeleton from "../components/TableLoadingSkeleton";
import StatusPill from "../components/StatusPill";
import { useAdminData } from "../AdminContext";

const ROLE_LABEL = {
  DONOR: "Donneur",
  RECEIVER: "Receveur",
  ADMIN: "Admin",
};

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function escapeCsv(value) {
  const stringValue = String(value ?? "");
  const escaped = stringValue.replace(/"/g, '""');
  return `"${escaped}"`;
}

function getUserSelectionKey(user) {
  return `${user.role}:${user.id}`;
}

export default function AdminUsersPage() {
  const {
    donors,
    receivers,
    adminAccounts,
    getDonorDonationHistory,
    getReceiverDonationHistory,
    activateUsers,
    suspendUsers,
    sendEmailToUsers,
  } = useAdminData();

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedUserKeys, setSelectedUserKeys] = useState(new Set());
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [loadingTable, setLoadingTable] = useState(true);
  const [confirmSuspendOpen, setConfirmSuspendOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoadingTable(false), 560);
    return () => clearTimeout(timer);
  }, []);

  const allUsers = useMemo(() => {
    const donorRows = donors.map((donor) => ({
      id: donor.id,
      role: "DONOR",
      name: donor.name,
      email: donor.email,
      city: donor.city,
      status: donor.status,
      registeredAt: donor.registeredAt,
      phone: donor.phone,
      quizScore: donor.quizScore,
      wrongAnswers: donor.wrongAnswers,
      donationCount: getDonorDonationHistory(donor.id).length,
    }));

    const receiverRows = receivers.map((receiver) => ({
      id: receiver.id,
      role: "RECEIVER",
      name: receiver.name,
      email: receiver.email,
      city: receiver.city,
      status: receiver.status,
      registeredAt: receiver.registeredAt,
      phone: receiver.phone,
      donationCount: getReceiverDonationHistory(receiver.id).length,
      quizScore: null,
      wrongAnswers: [],
    }));

    const adminRows = adminAccounts.map((admin) => ({
      id: admin.id,
      role: "ADMIN",
      name: admin.name,
      email: admin.email,
      city: "-",
      status: "actif",
      registeredAt: null,
      phone: "-",
      donationCount: null,
      quizScore: null,
      wrongAnswers: [],
    }));

    return [...donorRows, ...receiverRows, ...adminRows].sort((a, b) => {
      const aDate = a.registeredAt ? new Date(a.registeredAt).getTime() : 0;
      const bDate = b.registeredAt ? new Date(b.registeredAt).getTime() : 0;
      return bDate - aDate;
    });
  }, [donors, receivers, adminAccounts, getDonorDonationHistory, getReceiverDonationHistory]);

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return allUsers.filter((user) => {
      const matchesSearch =
        !term ||
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term);
      const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
      const matchesStatus = statusFilter === "ALL" || user.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [allUsers, searchTerm, roleFilter, statusFilter]);

  const selectedUser = useMemo(
    () => allUsers.find((user) => user.id === selectedUserId) || null,
    [allUsers, selectedUserId]
  );

  const stats = useMemo(
    () => ({
      totalUsers: allUsers.length,
      donorCount: allUsers.filter((user) => user.role === "DONOR").length,
      receiverCount: allUsers.filter((user) => user.role === "RECEIVER").length,
      adminCount: allUsers.filter((user) => user.role === "ADMIN").length,
    }),
    [allUsers]
  );

  const selectedTargets = useMemo(() => {
    const targets = [];

    selectedUserKeys.forEach((key) => {
      const [role, id] = String(key).split(":");
      if (role && id) {
        targets.push({ role, id });
      }
    });

    return targets;
  }, [selectedUserKeys]);

  const selectedCount = selectedTargets.length;

  const isAllVisibleSelected =
    filteredUsers.length > 0 &&
    filteredUsers.every((user) => selectedUserKeys.has(getUserSelectionKey(user)));

  const toggleSelectAllVisible = () => {
    setSelectedUserKeys((prev) => {
      const next = new Set(prev);

      if (isAllVisibleSelected) {
        filteredUsers.forEach((user) => next.delete(getUserSelectionKey(user)));
      } else {
        filteredUsers.forEach((user) => next.add(getUserSelectionKey(user)));
      }

      return next;
    });
  };

  const toggleSelectUser = (user) => {
    const key = getUserSelectionKey(user);
    setSelectedUserKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedUserKeys(new Set());
  };

  const handleBulkEmail = () => {
    if (selectedCount === 0) {
      toast.error("Selectionnez au moins un utilisateur.");
      return;
    }

    const result = sendEmailToUsers(selectedTargets, "Communication admin Repas");
    if (!result.sent) {
      toast.error("Aucun utilisateur valide dans la selection.");
      return;
    }

    toast.success(`Email envoye a ${result.sent} utilisateur(s).`);
  };

  const handleBulkActivate = () => {
    if (selectedCount === 0) {
      toast.error("Selectionnez au moins un utilisateur.");
      return;
    }

    const result = activateUsers(selectedTargets);
    if (!result.updated) {
      toast.error("Aucun compte activable dans la selection.");
      return;
    }

    const skippedText = result.skippedAdmins ? ` (${result.skippedAdmins} admin ignore(s))` : "";
    toast.success(`Activation de ${result.updated} compte(s) reussie${skippedText}.`);
    clearSelection();
  };

  const openSuspendConfirmation = () => {
    if (selectedCount === 0) {
      toast.error("Selectionnez au moins un utilisateur.");
      return;
    }

    setConfirmSuspendOpen(true);
  };

  const handleBulkSuspend = () => {
    const result = suspendUsers(selectedTargets, "Suspension manuelle depuis admin");
    if (!result.updated) {
      toast.error("Aucun compte suspendable dans la selection.");
      setConfirmSuspendOpen(false);
      return;
    }

    const skippedText = result.skippedAdmins ? ` (${result.skippedAdmins} admin ignore(s))` : "";
    toast.success(`Suspension de ${result.updated} compte(s) reussie${skippedText}.`);
    setConfirmSuspendOpen(false);
    clearSelection();
  };

  const exportCsv = () => {
    if (filteredUsers.length === 0) {
      toast.error("Aucune ligne a exporter.");
      return;
    }

    const headers = [
      "Nom",
      "Email",
      "Role",
      "Ville",
      "Statut",
      "Date inscription",
      "Donations liees",
    ];

    const lines = [
      headers.map(escapeCsv).join(","),
      ...filteredUsers.map((user) =>
        [
          user.name,
          user.email,
          ROLE_LABEL[user.role] || user.role,
          user.city,
          user.status,
          formatDate(user.registeredAt),
          user.donationCount ?? "-",
        ]
          .map(escapeCsv)
          .join(",")
      ),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `repas-admin-utilisateurs-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);

    toast.success("Export CSV genere avec succes.");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#234D1A]">Tous les utilisateurs</h2>
          <p className="text-sm text-[#7B6D59]">
            Vue globale des comptes admin, donneurs et receveurs.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-[#D4C8B3]"
            onClick={handleBulkEmail}
          >
            <Mail className="w-4 h-4 mr-2" />
            Email selection
          </Button>
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
            onClick={openSuspendConfirmation}
          >
            <ShieldAlert className="w-4 h-4 mr-2" />
            Suspendre selection
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-[#D4C8B3]"
            onClick={exportCsv}
          >
            <Download className="w-4 h-4 mr-2" />
            Exporter CSV
          </Button>
        </div>
      </div>

      <div className="text-sm text-[#5E5242]">
        {selectedCount} utilisateur(s) selectionne(s)
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <Card className="border-[#E6DCCB] bg-white shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.1em] text-[#7B6D59]">Total utilisateurs</p>
            <p className="text-2xl font-bold text-[#1F2937] mt-1">{stats.totalUsers}</p>
          </CardContent>
        </Card>
        <Card className="border-[#E6DCCB] bg-white shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.1em] text-[#7B6D59]">Donneurs</p>
            <p className="text-2xl font-bold text-[#1F2937] mt-1">{stats.donorCount}</p>
          </CardContent>
        </Card>
        <Card className="border-[#E6DCCB] bg-white shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.1em] text-[#7B6D59]">Receveurs</p>
            <p className="text-2xl font-bold text-[#1F2937] mt-1">{stats.receiverCount}</p>
          </CardContent>
        </Card>
        <Card className="border-[#E6DCCB] bg-white shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.1em] text-[#7B6D59]">Admins</p>
            <p className="text-2xl font-bold text-[#1F2937] mt-1">{stats.adminCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white border border-[#E6DCCB] rounded-xl p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_180px_180px] gap-3">
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Rechercher par nom ou email"
            className="border-[#D8CEBC]"
          />

          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="h-10 rounded-md border border-[#D8CEBC] px-3 text-sm bg-white"
          >
            <option value="ALL">Tous les roles</option>
            <option value="DONOR">Donneurs</option>
            <option value="RECEIVER">Receveurs</option>
            <option value="ADMIN">Admins</option>
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-10 rounded-md border border-[#D8CEBC] px-3 text-sm bg-white"
          >
            <option value="ALL">Tous les statuts</option>
            <option value="actif">actif</option>
            <option value="en_attente">en_attente</option>
            <option value="suspendu">suspendu</option>
          </select>
        </div>

        <div className="border border-[#EEE6D8] rounded-xl overflow-hidden">
          {loadingTable ? (
            <TableLoadingSkeleton rows={7} columns={7} />
          ) : (
            <Table>
              <TableHeader className="bg-[#FFF9EF]">
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={isAllVisibleSelected}
                      onChange={toggleSelectAllVisible}
                      aria-label="Selectionner toutes les lignes visibles"
                    />
                  </TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Inscription</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow
                    key={user.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedUserId(user.id)}
                  >
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedUserKeys.has(getUserSelectionKey(user))}
                        onChange={() => toggleSelectUser(user)}
                        aria-label={`Selectionner ${user.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium text-[#1F2937]">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{ROLE_LABEL[user.role] || user.role}</TableCell>
                    <TableCell>{user.city}</TableCell>
                    <TableCell>
                      <StatusPill value={user.status}>{user.status}</StatusPill>
                    </TableCell>
                    <TableCell>{formatDate(user.registeredAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        className="border-[#D4C8B3]"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedUserId(user.id);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Voir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <Sheet
        open={Boolean(selectedUser)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedUserId(null);
          }
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-[520px] bg-[#FFFDF7] border-l border-[#E6DCCB] overflow-auto">
          {selectedUser ? (
            <>
              <SheetHeader>
                <SheetTitle className="text-[#234D1A] flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Detail utilisateur
                </SheetTitle>
                <SheetDescription>
                  {selectedUser.name} - {ROLE_LABEL[selectedUser.role] || selectedUser.role}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-4 space-y-4 text-sm">
                <div className="rounded-lg border border-[#E8DEC9] bg-white p-3 space-y-1">
                  <p><strong>Nom:</strong> {selectedUser.name}</p>
                  <p><strong>Email:</strong> {selectedUser.email}</p>
                  <p><strong>Role:</strong> {ROLE_LABEL[selectedUser.role] || selectedUser.role}</p>
                  <p><strong>Ville:</strong> {selectedUser.city}</p>
                  <p><strong>Telephone:</strong> {selectedUser.phone || "-"}</p>
                  <p><strong>Date inscription:</strong> {formatDate(selectedUser.registeredAt)}</p>
                  <p>
                    <strong>Statut:</strong>{" "}
                    <StatusPill value={selectedUser.status} className="ml-1">
                      {selectedUser.status}
                    </StatusPill>
                  </p>
                </div>

                {selectedUser.role === "DONOR" ? (
                  <div className="rounded-lg border border-[#E8DEC9] bg-white p-3 space-y-2">
                    <p className="font-semibold text-[#1F2937]">Informations donneur</p>
                    <p>
                      <strong>Score quiz:</strong> {selectedUser.quizScore}/5
                    </p>
                    <p>
                      <strong>Questions incorrectes:</strong>{" "}
                      {selectedUser.wrongAnswers.length > 0
                        ? selectedUser.wrongAnswers.map((item) => item + 1).join(", ")
                        : "Aucune"}
                    </p>
                    <p>
                      <strong>Donations publiees:</strong> {selectedUser.donationCount}
                    </p>
                  </div>
                ) : null}

                {selectedUser.role === "RECEIVER" ? (
                  <div className="rounded-lg border border-[#E8DEC9] bg-white p-3 space-y-1">
                    <p className="font-semibold text-[#1F2937]">Informations receveur</p>
                    <p>
                      <strong>Donations recues:</strong> {selectedUser.donationCount}
                    </p>
                  </div>
                ) : null}

                {selectedUser.role === "ADMIN" ? (
                  <div className="rounded-lg border border-[#E8DEC9] bg-white p-3 space-y-1">
                    <p className="font-semibold text-[#1F2937]">Informations admin</p>
                    <p>
                      <strong>Acces moderation:</strong> actif
                    </p>
                    <p>
                      <strong>Niveau:</strong> {selectedUser.status === "actif" ? "Operationnel" : "Restreint"}
                    </p>
                  </div>
                ) : null}

                <Button type="button" className="w-full bg-[#2D6A1F] hover:bg-[#245619] text-white">
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Suivi compte
                </Button>
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
              Cette action est destructive et suspendra les comptes selectionnes (hors admins).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-[#A01616] hover:bg-[#860F0F]" onClick={handleBulkSuspend}>
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
