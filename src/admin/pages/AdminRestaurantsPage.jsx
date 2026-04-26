/**
 * Page: AdminRestaurantsPage
 * Liste des restaurants partenaires avec filtres, recherche et détails
 * Affiche les signalements avec code couleur (orange/rouge)
 */
import React, { useState, useMemo, useEffect } from "react";
import { Search, Download, AlertTriangle } from "lucide-react";
import {
  formatDateFrench,
  generateInitials,
} from "../mockDataFrench";
import { backendApi } from "@/api/backendClient";
import { useAuth } from "@/lib/AuthContext";

function StatusBadge({ status }) {
  const styles = {
    active: { bg: "#EAF3DE", text: "#27500A", label: "Actif" },
    suspended: { bg: "#FCEBEB", text: "#791F1F", label: "Suspendu" },
    suspended_auto: {
      bg: "#FCEBEB",
      text: "#791F1F",
      label: "Suspendu (Auto)",
    },
  };

  const style = styles[status] || styles.active;

  return (
    <span
      className="px-2 py-1 rounded text-xs font-medium"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {style.label}
    </span>
  );
}

function ReportCountBadge({ count, openCount }) {
  if (count === 0) {
    return <span className="text-gray-500 text-sm">{count}</span>;
  }

  if (openCount >= 3) {
    return (
      <span className="font-bold text-red-600 text-sm flex items-center gap-1">
        🔴 {openCount}
      </span>
    );
  }

  if (openCount === 2) {
    return (
      <span className="font-bold text-orange-600 text-sm flex items-center gap-1">
        ⚠⚠ {openCount}
      </span>
    );
  }

  if (openCount === 1) {
    return (
      <span className="font-medium text-orange-500 text-sm flex items-center gap-1">
        ⚠ {openCount}
      </span>
    );
  }

  return <span className="text-gray-600 text-sm">{count}</span>;
}

export default function AdminRestaurantsPage() {
  const [filterStatus, setFilterStatus] = useState("tous");
  const [searchQuery, setSearchQuery] = useState("");
  const { token } = useAuth();
  const [restaurants, setRestaurants] = useState([]);

  useEffect(() => {
    if (!token) return;
    backendApi.admin
      .listUsers(token, { role: "ROLE_RESTAURANT" })
      .then((data) => {
        const users = data?.users || [];
        if (users.length === 0) return;
        setRestaurants(
          users.map((u) => ({
            id: u.id,
            nom: u.name || u.fullName || u.email,
            email: u.email,
            ville: u.city || "",
            telephone: u.phone || "",
            siren: u.siren || "",
            dateInscription: u.createdAt,
            accountStatus: u.accountStatus,
            totalReports: 0,
            openReports: 0,
          }))
        );
      })
      .catch(() => {});
  }, [token]);

  // Filtered restaurants
  const filteredRestaurants = useMemo(() => {
    let result = restaurants;

    // Status filter
    if (filterStatus === "actifs") {
      result = result.filter((r) => r.accountStatus === "active");
    } else if (filterStatus === "suspendus") {
      result = result.filter(
        (r) =>
          r.accountStatus === "suspended" ||
          r.accountStatus === "suspended_auto",
      );
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.nom.toLowerCase().includes(query) ||
          r.siren.includes(query) ||
          r.email.toLowerCase().includes(query) ||
          r.ville.toLowerCase().includes(query),
      );
    }

    return result;
  }, [restaurants, filterStatus, searchQuery]);

  // Count by status
  const statusCounts = useMemo(() => {
    return {
      tous: restaurants.length,
      actifs: restaurants.filter((r) => r.accountStatus === "active").length,
      suspendus: restaurants.filter(
        (r) =>
          r.accountStatus === "suspended" ||
          r.accountStatus === "suspended_auto",
      ).length,
    };
  }, [restaurants]);

  const handleExportCSV = () => {
    // TODO: Implement CSV export
    alert("Export CSV à implémenter");
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Restaurants partenaires
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {filteredRestaurants.length} restaurant(s) affiché(s)
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Exporter CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between gap-4">
          {/* Status pills */}
          <div className="flex gap-2">
            {["tous", "actifs", "suspendus"].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  filterStatus === status
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)} (
                {statusCounts[status]})
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par nom, SIREN, email, ville..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
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
                  SIREN
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Ville
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                  Donations
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                  Signalements
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
              {filteredRestaurants.map((restaurant) => {
                const initials = generateInitials(restaurant.nom);
                const reportsOpen = restaurant.reportsOpen || 0;
                let rowStyle = {};

                // Visual rules for report counts
                if (reportsOpen >= 3) {
                  rowStyle = {
                    borderLeft: "3px solid #dc2626",
                    backgroundColor: "#fef2f2",
                  };
                } else if (reportsOpen === 2) {
                  rowStyle = {
                    borderLeft: "3px solid #f97316",
                    backgroundColor: "#fff7ed",
                  };
                } else if (reportsOpen === 1) {
                  rowStyle = {
                    borderLeft: "3px solid #f97316",
                  };
                }

                return (
                  <tr
                    key={restaurant.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    style={rowStyle}
                    onClick={() =>
                      alert(`Detail: ${restaurant.nom} - À implémenter`)
                    }
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold text-sm flex-shrink-0">
                          {initials}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">
                            {restaurant.nom}
                          </p>
                          <p className="text-xs text-gray-500">
                            {restaurant.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-gray-700">
                        {restaurant.siren}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-700">
                        {restaurant.ville}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-medium text-gray-700">
                        {restaurant.donationsTotal}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ReportCountBadge
                        count={restaurant.reportsCount}
                        openCount={reportsOpen}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={restaurant.accountStatus} />
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
        {filteredRestaurants.length === 0 && (
          <div className="py-12 text-center">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">
              Aucun restaurant ne correspond aux filtres.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
