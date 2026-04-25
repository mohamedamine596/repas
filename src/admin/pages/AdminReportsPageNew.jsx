/**
 * Page: AdminReportsPage (Signalements) - CORE SAFETY PAGE
 * Gestion des signalements avec actions admin (avertir, suspendre, résoudre)
 * Auto-suspension visible avec bannière rouge et fond de ligne
 */
import React, { useState, useMemo } from "react";
import { AlertTriangle, MessageSquare } from "lucide-react";
import {
  MOCK_REPORTS,
  MOCK_RESTAURANTS,
  formatDateFrench,
  DEFAULT_AUTO_SUSPEND_THRESHOLD,
} from "../mockDataFrench";

function MotifBadge({ motif, label }) {
  const styles = {
    aliment_avarie: { bg: "#fef2f2", text: "#991b1b" },
    peremption_depassee: { bg: "#fef2f2", text: "#991b1b" },
    hygiene: { bg: "#fff7ed", text: "#c2410c" },
    informations_incorrectes: { bg: "#eff6ff", text: "#1e40af" },
    autre: { bg: "#f3f4f6", text: "#374151" },
  };

  const style = styles[motif] || styles.autre;

  return (
    <span
      className="px-2 py-1 rounded text-xs font-medium"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {label}
    </span>
  );
}

function StatusBadge({ status }) {
  const styles = {
    ouvert: { bg: "#fff7ed", text: "#c2410c", label: "Ouvert" },
    en_cours: { bg: "#eff6ff", text: "#1e40af", label: "En cours" },
    resolu: { bg: "#EAF3DE", text: "#27500A", label: "Résolu" },
    classe_sans_suite: {
      bg: "#f3f4f6",
      text: "#6b7280",
      label: "Classé sans suite",
    },
  };

  const style = styles[status] || styles.ouvert;

  return (
    <span
      className="px-2 py-1 rounded text-xs font-medium"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {style.label}
    </span>
  );
}

function SummaryCard({ title, value, colorClass }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-sm text-gray-600 mb-1">{title}</p>
      <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
    </div>
  );
}

export default function AdminReportsPage() {
  const [filterStatus, setFilterStatus] = useState("tous");

  // TODO: Replace with GET /api/admin/reports
  const reports = MOCK_REPORTS;

  // Summary stats
  const stats = useMemo(() => {
    const openCount = reports.filter((r) => r.status === "ouvert").length;
    const thisWeek = reports.filter((r) => {
      const reportDate = new Date(r.date);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return reportDate >= weekAgo;
    }).length;
    const autoSuspensions = MOCK_RESTAURANTS.filter(
      (r) => r.accountStatus === "suspended_auto",
    ).length;

    return { openCount, thisWeek, autoSuspensions };
  }, [reports]);

  // Auto-suspended restaurants
  const autoSuspendedRestaurants = useMemo(() => {
    return MOCK_RESTAURANTS.filter((r) => r.accountStatus === "suspended_auto");
  }, []);

  // Filtered reports
  const filteredReports = useMemo(() => {
    if (filterStatus === "tous") return reports;
    return reports.filter((r) => r.status === filterStatus);
  }, [reports, filterStatus]);

  // Group reports by restaurant to show visual rules
  const reportsWithRestaurantData = useMemo(() => {
    return filteredReports.map((report) => {
      const restaurant = MOCK_RESTAURANTS.find(
        (r) => r.id === report.restaurantId,
      );
      return {
        ...report,
        restaurantReportsCount: restaurant?.reportsOpen || 0,
      };
    });
  }, [filteredReports]);

  const handleAction = (action, reportId) => {
    // TODO: Implement action handlers
    alert(`Action "${action}" sur signalement ${reportId} - À implémenter`);
  };

  return (
    <div className="space-y-5">
      {/* Auto-suspension alert banner */}
      {autoSuspendedRestaurants.length > 0 && (
        <div
          className="rounded-lg p-4 border-l-4 flex items-start gap-3"
          style={{ backgroundColor: "#fef2f2", borderColor: "#dc2626" }}
        >
          <span className="text-2xl">🔴</span>
          <div>
            <p className="font-medium text-red-900">
              Suspension automatique :{" "}
              {autoSuspendedRestaurants.map((r, i) => (
                <span key={r.id}>
                  {i > 0 && ", "}
                  <strong>{r.nom}</strong>
                </span>
              ))}{" "}
              {autoSuspendedRestaurants.length === 1
                ? "a été suspendue"
                : "ont été suspendus"}{" "}
              après {DEFAULT_AUTO_SUSPEND_THRESHOLD} signalements.
            </p>
          </div>
        </div>
      )}

      {/* Summary bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          title="Ouverts"
          value={stats.openCount}
          colorClass="text-red-600"
        />
        <SummaryCard
          title="Cette semaine"
          value={stats.thisWeek}
          colorClass="text-orange-600"
        />
        <SummaryCard
          title="Suspensions auto"
          value={stats.autoSuspensions}
          colorClass="text-red-600"
        />
      </div>

      {/* Filter pills */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex gap-2">
          {["tous", "ouvert", "en_cours", "resolu", "classe_sans_suite"].map(
            (status) => {
              const count =
                status === "tous"
                  ? reports.length
                  : reports.filter((r) => r.status === status).length;
              const label = {
                tous: "Tous",
                ouvert: "Ouverts",
                en_cours: "En cours",
                resolu: "Résolus",
                classe_sans_suite: "Classés",
              }[status];

              return (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    filterStatus === status
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {label} ({count})
                </button>
              );
            },
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Restaurant signalé
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Motif
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Signalé par
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Date
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
              {reportsWithRestaurantData.map((report) => {
                let rowStyle = {};

                // Visual rules based on restaurant's total open reports
                if (report.restaurantReportsCount >= 3) {
                  rowStyle = {
                    borderLeft: "3px solid #dc2626",
                    backgroundColor: "#fef2f2",
                  };
                } else if (report.restaurantReportsCount === 2) {
                  rowStyle = {
                    borderLeft: "3px solid #f97316",
                  };
                }

                return (
                  <tr
                    key={report.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    style={rowStyle}
                    onClick={() =>
                      alert(`Détail signalement ${report.id} - À implémenter`)
                    }
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-800 text-sm">
                          {report.restaurantName}
                        </p>
                        {report.restaurantReportsCount >= 3 && (
                          <p className="text-xs text-red-600 font-semibold mt-1">
                            🔴 {report.restaurantReportsCount} signalements
                            ouverts
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <MotifBadge
                        motif={report.motif}
                        label={report.motifLabel}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-700">
                        {report.reporterName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {report.reporterEmail}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">
                        {new Date(report.date).toLocaleDateString("fr-FR")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={report.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAction("avertir", report.id);
                          }}
                          className="text-xs px-2 py-1 rounded border border-orange-500 text-orange-600 hover:bg-orange-50 transition-colors"
                          title="Avertir"
                        >
                          ⚠
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAction("suspendre", report.id);
                          }}
                          className="text-xs px-2 py-1 rounded border border-red-500 text-red-600 hover:bg-red-50 transition-colors"
                          title="Suspendre"
                        >
                          🔴
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAction("resoudre", report.id);
                          }}
                          className="text-xs px-2 py-1 rounded border border-green-500 text-green-600 hover:bg-green-50 transition-colors"
                          title="Résoudre"
                        >
                          ✅
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {filteredReports.length === 0 && (
          <div className="py-12 text-center">
            <MessageSquare className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <p className="text-green-600 font-medium">
              Aucun signalement {filterStatus !== "tous" && filterStatus} — tout
              est en ordre ✓
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
