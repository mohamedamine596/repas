/**
 * Page: AdminOverviewPage (Vue d'ensemble)
 * Dashboard principal avec statistiques, alertes, graphique et activité récente
 */
import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  TrendingUp,
  Users,
  Apple,
  TriangleAlert,
  Handshake,
} from "lucide-react";
import {
  MOCK_RESTAURANTS,
  MOCK_RECEVEURS,
  MOCK_DONATIONS,
  MOCK_REPORTS,
  getActiveRestaurantsCount,
  getTotalReceiversCount,
  getDonationsToday,
  getOpenReportsCount,
  formatDateFrench,
} from "../mockDataFrench";

function StatCard({ title, value, icon: Icon, colorClass, trend }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className={`text-3xl font-bold ${colorClass}`}>{value}</p>
          {trend && (
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {trend}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClass} bg-opacity-10`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

function AlertBanner({ type, message, linkText, linkTo }) {
  const styles = {
    warning: { bg: "#fff7ed", border: "#f97316", text: "#c2410c", icon: "⚠" },
    danger: { bg: "#fef2f2", border: "#dc2626", text: "#991b1b", icon: "🔴" },
  };

  const style = styles[type] || styles.warning;

  return (
    <div
      className="rounded-lg p-4 border-l-4 flex items-start gap-3"
      style={{ backgroundColor: style.bg, borderColor: style.border }}
    >
      <span className="text-2xl">{style.icon}</span>
      <div className="flex-1">
        <p className="font-medium" style={{ color: style.text }}>
          {message}
        </p>
        {linkText && linkTo && (
          <Link
            to={linkTo}
            className="text-sm font-semibold underline mt-1 inline-block"
            style={{ color: style.text }}
          >
            {linkText}
          </Link>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    active: { bg: "#EAF3DE", text: "#27500A", label: "Actif" },
    suspended_auto: {
      bg: "#FCEBEB",
      text: "#791F1F",
      label: "Suspendu (Auto)",
    },
    ouvert: { bg: "#fff7ed", text: "#c2410c", label: "Ouvert" },
    en_cours: { bg: "#eff6ff", text: "#1e40af", label: "En cours" },
    resolu: { bg: "#EAF3DE", text: "#27500A", label: "Résolu" },
  };

  const style = styles[status] || {
    bg: "#f3f4f6",
    text: "#374151",
    label: status,
  };

  return (
    <span
      className="px-2 py-1 rounded text-xs font-medium"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {style.label}
    </span>
  );
}

export default function AdminOverviewPage() {
  // TODO: Replace with GET /api/admin/stats
  const stats = useMemo(() => {
    return {
      activeRestaurants: getActiveRestaurantsCount(),
      totalReceivers: getTotalReceiversCount(),
      donationsToday: getDonationsToday(),
      openReports: getOpenReportsCount(),
    };
  }, []);

  // Alert banners logic
  const alerts = useMemo(() => {
    const restaurantsWithTwoReports = MOCK_RESTAURANTS.filter(
      (r) => r.reportsOpen === 2,
    ).length;
    const restaurantsAutoSuspended = MOCK_RESTAURANTS.filter(
      (r) => r.accountStatus === "suspended_auto",
    ).length;

    return {
      warning: restaurantsWithTwoReports > 0 ? restaurantsWithTwoReports : null,
      danger: restaurantsAutoSuspended > 0 ? restaurantsAutoSuspended : null,
    };
  }, []);

  // Recent registrations (last 4)
  const recentRegistrations = useMemo(() => {
    return [...MOCK_RESTAURANTS]
      .sort((a, b) => new Date(b.dateInscription) - new Date(a.dateInscription))
      .slice(0, 4);
  }, []);

  // Recent reports (last 4)
  const recentReports = useMemo(() => {
    return [...MOCK_REPORTS]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 4);
  }, []);

  return (
    <div className="space-y-6">
      {/* Alert Banners */}
      {alerts.danger && (
        <AlertBanner
          type="danger"
          message={`Suspension automatique déclenchée pour ${alerts.danger} restaurant(s) — Action requise`}
          linkText="Voir les signalements"
          linkTo="/admin/signalements"
        />
      )}
      {alerts.warning && (
        <AlertBanner
          type="warning"
          message={`${alerts.warning} restaurant(s) ont atteint le seuil d'avertissement`}
          linkText="Voir les signalements"
          linkTo="/admin/signalements"
        />
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Restaurants actifs"
          value={stats.activeRestaurants}
          icon={Users}
          colorClass="text-green-600"
        />
        <StatCard
          title="Receveurs inscrits"
          value={stats.totalReceivers}
          icon={Handshake}
          colorClass="text-blue-600"
        />
        <StatCard
          title="Donations aujourd'hui"
          value={stats.donationsToday}
          icon={Apple}
          colorClass={
            stats.donationsToday > 0 ? "text-orange-600" : "text-gray-600"
          }
        />
        <StatCard
          title="Signalements ouverts"
          value={stats.openReports}
          icon={TriangleAlert}
          colorClass={stats.openReports > 0 ? "text-red-600" : "text-gray-600"}
        />
      </div>

      {/* Activity Chart Placeholder */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              Donations publiées
            </h2>
            <p className="text-sm text-gray-600">14 derniers jours</p>
          </div>
          <span className="text-sm text-green-600 font-medium flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            +24% vs période précédente
          </span>
        </div>
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded border border-gray-200">
          <p className="text-gray-500 text-sm">
            Graphique des donations (Chart.js ou Recharts à intégrer)
          </p>
        </div>
      </div>

      {/* Two-column panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Registrations */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              Inscriptions récentes
            </h2>
            <Link
              to="/admin/restaurants"
              className="text-sm text-green-600 hover:text-green-700 font-medium"
            >
              Voir tout →
            </Link>
          </div>
          <div className="space-y-3">
            {recentRegistrations.map((resto) => (
              <div
                key={resto.id}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div>
                  <p className="font-medium text-gray-800 text-sm">
                    {resto.nom}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDateFrench(resto.dateInscription)}
                  </p>
                </div>
                <StatusBadge status={resto.accountStatus} />
              </div>
            ))}
          </div>
        </div>

        {/* Recent Reports */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              Signalements récents
            </h2>
            <Link
              to="/admin/signalements"
              className="text-sm text-green-600 hover:text-green-700 font-medium"
            >
              Voir tout →
            </Link>
          </div>
          <div className="space-y-3">
            {recentReports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-800 text-sm">
                    {report.restaurantName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDateFrench(report.date)}
                  </p>
                </div>
                <StatusBadge status={report.status} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
