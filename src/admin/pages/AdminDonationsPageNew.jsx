/**
 * Page: AdminDonationsPage
 * Liste des donations avec filtres par statut et option "Signalées uniquement"
 */
import React, { useState, useMemo } from "react";
import { Filter, AlertTriangle } from "lucide-react";
import { MOCK_DONATIONS, formatDateFrench } from "../mockDataFrench";

function StatusBadge({ status }) {
  const styles = {
    disponible: { bg: "#EAF3DE", text: "#27500A", label: "Disponible" },
    reclame: { bg: "#E6F1FB", text: "#0C447C", label: "Réclamé" },
    expire: { bg: "#f3f4f6", text: "#6b7280", label: "Expiré" },
    signale: { bg: "#fff7ed", text: "#c2410c", label: "Signalé" },
  };

  const style = styles[status] || styles.disponible;

  return (
    <span
      className="px-2 py-1 rounded text-xs font-medium"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {style.label}
    </span>
  );
}

export default function AdminDonationsPageNew() {
  const [filterStatus, setFilterStatus] = useState("toutes");
  const [showOnlySignaled, setShowOnlySignaled] = useState(false);

  // TODO: Replace with GET /api/admin/donations
  const donations = MOCK_DONATIONS;

  // Filtered donations
  const filteredDonations = useMemo(() => {
    let result = donations;

    // Status filter
    if (filterStatus !== "toutes") {
      result = result.filter((d) => d.status === filterStatus);
    }

    // Signaled only toggle
    if (showOnlySignaled) {
      result = result.filter((d) => d.status === "signale");
    }

    return result;
  }, [donations, filterStatus, showOnlySignaled]);

  // Count by status
  const statusCounts = useMemo(() => {
    return {
      toutes: donations.length,
      disponible: donations.filter((d) => d.status === "disponible").length,
      reclame: donations.filter((d) => d.status === "reclame").length,
      expire: donations.filter((d) => d.status === "expire").length,
      signale: donations.filter((d) => d.status === "signale").length,
    };
  }, [donations]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Donations</h1>
        <p className="text-sm text-gray-600 mt-1">
          {filteredDonations.length} donation(s) affichée(s)
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between gap-4">
          {/* Status pills */}
          <div className="flex gap-2 flex-wrap">
            {["toutes", "disponible", "reclame", "expire"].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  filterStatus === status
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {status.charAt(0).toUpperCase() +
                  status.slice(1).replace("_", " ")}{" "}
                ({statusCounts[status]})
              </button>
            ))}
          </div>

          {/* Signaled only toggle */}
          <button
            onClick={() => setShowOnlySignaled(!showOnlySignaled)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showOnlySignaled
                ? "bg-orange-100 text-orange-700 border-2 border-orange-500"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Filter className="w-4 h-4" />
            Signalées uniquement ({statusCounts.signale})
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Restaurant
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Description aliment
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Quantité
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Ville
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Date publication
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
              {filteredDonations.map((donation) => (
                <tr
                  key={donation.id}
                  className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                    donation.status === "signale" ? "bg-orange-50" : ""
                  }`}
                  onClick={() =>
                    alert(`Détail donation ${donation.id} - À implémenter`)
                  }
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800 text-sm">
                      {donation.restaurantName}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-700">
                      {donation.description}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-700">
                      {donation.quantite}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-700">
                      {donation.ville}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">
                      {new Date(donation.datePublication).toLocaleDateString(
                        "fr-FR",
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={donation.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          confirm(
                            "Êtes-vous sûr de vouloir retirer cette donation ? Le restaurant sera notifié.",
                          )
                        ) {
                          alert("Retirer donation - À implémenter");
                        }
                      }}
                      className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Retirer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {filteredDonations.length === 0 && (
          <div className="py-12 text-center">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">
              Aucune donation ne correspond aux filtres.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
