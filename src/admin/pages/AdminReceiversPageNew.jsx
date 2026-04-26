/**
 * Page: AdminReceiversPage (Receveurs)
 * Liste des receveurs avec détection des "signaleurs fréquents"
 */
import React, { useState, useMemo, useEffect } from "react";
import { Search, AlertTriangle, X, Phone, MapPin, Calendar, ShieldOff, ShieldCheck, Mail } from "lucide-react";
import { formatDateFrench } from "../mockDataFrench";
import { backendApi } from "@/api/backendClient";
import { useAuth } from "@/lib/AuthContext";

// ---------------------------------------------------------------------------
// User Detail Modal
// ---------------------------------------------------------------------------
function UserDetailModal({ user, onClose, onStatusChange }) {
  const { token } = useAuth();
  const [reason, setReason] = useState("");
  const [showSuspendForm, setShowSuspendForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isSuspended =
    user.accountStatus === "suspended" || user.accountStatus === "suspended_auto";

  async function handleSuspend() {
    if (!reason.trim() || reason.trim().length < 5) {
      setError("Veuillez saisir une raison d'au moins 5 caractères.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await backendApi.admin.suspendUser(token, user.id, reason.trim());
      onStatusChange({ ...user, accountStatus: data?.user?.accountStatus || "suspended" });
      onClose();
    } catch (e) {
      setError(e?.data?.error || "Erreur lors de la suspension.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUnsuspend() {
    setLoading(true);
    setError("");
    try {
      const data = await backendApi.admin.unsuspendUser(token, user.id);
      onStatusChange({ ...user, accountStatus: data?.user?.accountStatus || "active" });
      onClose();
    } catch (e) {
      setError(e?.data?.error || "Erreur lors de la réactivation.");
    } finally {
      setLoading(false);
    }
  }

  const statusLabel =
    user.accountStatus === "active"
      ? "Actif"
      : user.accountStatus === "email_pending"
        ? "En attente (email)"
        : "Suspendu";

  const statusColor =
    user.accountStatus === "active"
      ? "bg-green-100 text-green-800"
      : user.accountStatus === "email_pending"
        ? "bg-yellow-100 text-yellow-800"
        : "bg-red-100 text-red-800";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
      {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">Détail du receveur</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Avatar + Name */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xl flex-shrink-0">
              {user.nom.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
            </div>
            <div>
              <p className="text-xl font-bold text-gray-800">{user.nom}</p>
              <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColor}`}>
                {statusLabel}
              </span>
            </div>
          </div>

          {/* Info grid */}
          <div className="space-y-2.5 text-sm">
            <div className="flex items-center gap-2.5 text-gray-700">
              <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span>{user.email}</span>
            </div>
            {user.telephone && (
              <div className="flex items-center gap-2.5 text-gray-700">
                <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>{user.telephone}</span>
              </div>
            )}
            {user.ville && (
              <div className="flex items-center gap-2.5 text-gray-700">
                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>{user.ville}</span>
              </div>
            )}
            <div className="flex items-center gap-2.5 text-gray-700">
              <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span>
                Inscrit le{" "}
                {new Date(user.dateInscription).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>

          {/* Suspension reason (if any) */}
          {isSuspended && user.suspensionReason && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-800">
              <strong>Raison de suspension :</strong> {user.suspensionReason}
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Suspend form */}
          {showSuspendForm && !isSuspended && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Raison de la suspension <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex : Abus répétés, faux signalements..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              />
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Fermer
          </button>

          {isSuspended ? (
            <button
              onClick={handleUnsuspend}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-60 transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              {loading ? "En cours..." : "Réactiver le compte"}
            </button>
          ) : showSuspendForm ? (
            <>
              <button
                onClick={() => { setShowSuspendForm(false); setError(""); }}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleSuspend}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                <ShieldOff className="w-4 h-4" />
                {loading ? "En cours..." : "Confirmer la suspension"}
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowSuspendForm(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              <ShieldOff className="w-4 h-4" />
              Suspendre
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


function StatusBadge({ isFrequentReporter }) {
  if (isFrequentReporter) {
    return (
      <span
        className="px-2 py-1 rounded text-xs font-medium"
        style={{ backgroundColor: "#fff7ed", color: "#c2410c" }}
      >
        Signaleur fréquent
      </span>
    );
  }

  return (
    <span
      className="px-2 py-1 rounded text-xs font-medium"
      style={{ backgroundColor: "#EAF3DE", color: "#27500A" }}
    >
      Actif
    </span>
  );
}

export default function AdminReceiversPageNew() {
  const [searchQuery, setSearchQuery] = useState("");
  const { token } = useAuth();
  const [receveurs, setReceveurs] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    if (!token) return;
    backendApi.admin
      .listUsers(token, { role: "ROLE_RECEIVER" })
      .then((data) => {
        const users = data?.users || [];
        setReceveurs(
          users.map((u) => ({
            id: u.id,
            nom: u.name || u.fullName || u.email,
            email: u.email,
            ville: u.city || "",
            telephone: u.phone || "",
            dateInscription: u.createdAt,
            reportsEmitted: 0,
            accountStatus: u.accountStatus,
            suspensionReason: u.suspensionReason || "",
          }))
        );
      })
      .catch(() => {});
  }, [token]);

  // Filtered receveurs
  const filteredReceveurs = useMemo(() => {
    if (!searchQuery.trim()) return receveurs;

    const query = searchQuery.toLowerCase();
    return receveurs.filter(
      (r) =>
        r.nom.toLowerCase().includes(query) ||
        r.email.toLowerCase().includes(query) ||
        r.ville.toLowerCase().includes(query),
    );
  }, [receveurs, searchQuery]);

  // Frequent reporters (5+ reports)
  const frequentReporters = useMemo(() => {
    return receveurs.filter((r) => r.reportsEmitted >= 5);
  }, [receveurs]);

  const generateInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-5">
      {/* User Detail Modal */}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onStatusChange={(updated) => {
            setReceveurs((prev) =>
              prev.map((r) => (r.id === updated.id ? { ...r, accountStatus: updated.accountStatus } : r))
            );
          }}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Receveurs</h1>
          <p className="text-sm text-gray-600 mt-1">
            {filteredReceveurs.length} receveur(s) inscrit(s)
          </p>
        </div>
      </div>

      {/* Frequent reporter alert */}
      {frequentReporters.length > 0 && (
        <div
          className="rounded-lg p-4 border-l-4 flex items-start gap-3"
          style={{ backgroundColor: "#fff7ed", borderColor: "#f97316" }}
        >
          <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-orange-900">
              {frequentReporters.map((r, i) => (
                <span key={r.id}>
                  {i > 0 && ", "}
                  <strong>{r.nom}</strong>
                </span>
              ))}{" "}
              {frequentReporters.length === 1 ? "a émis" : "ont émis"} plus de 5
              signalements — profil(s) à surveiller pour abus potentiel.
            </p>
          </div>
        </div>
      )}

      {/* Search bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par nom, email, ville..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Receveur
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Ville
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                  Dons reçus
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                  Signalements émis
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Date inscription
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Statut
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredReceveurs.map((receveur) => {
                const initials = generateInitials(receveur.nom);

                return (
                  <tr
                    key={receveur.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedUser(receveur)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm flex-shrink-0">
                          {initials}
                        </div>
                        <p className="font-medium text-gray-800">
                          {receveur.nom}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-700">
                        {receveur.email}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-700">
                        {receveur.ville}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-medium text-gray-700">
                        {receveur.donationsReceived}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-sm font-medium ${
                          receveur.reportsEmitted >= 5
                            ? "text-orange-600"
                            : "text-gray-700"
                        }`}
                      >
                        {receveur.reportsEmitted}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">
                        {new Date(receveur.dateInscription).toLocaleDateString(
                          "fr-FR",
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        isFrequentReporter={receveur.isFrequentReporter}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-sm text-green-600 hover:text-green-700 font-medium">
                        Détails →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {filteredReceveurs.length === 0 && (
          <div className="py-12 text-center">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">
              Aucun receveur ne correspond à la recherche.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
