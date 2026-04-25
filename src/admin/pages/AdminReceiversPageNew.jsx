/**
 * Page: AdminReceiversPage (Receveurs)
 * Liste des receveurs avec détection des "signaleurs fréquents"
 */
import React, { useState, useMemo } from "react";
import { Search, AlertTriangle } from "lucide-react";
import { MOCK_RECEVEURS, formatDateFrench } from "../mockDataFrench";

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

  // TODO: Replace with GET /api/admin/receveurs
  const receveurs = MOCK_RECEVEURS;

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
      {/* Header */}
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
                    onClick={() =>
                      alert(`Détail: ${receveur.nom} - À implémenter`)
                    }
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
