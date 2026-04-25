import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AdminShellNew from "./components/AdminShellNew";
import { AdminProvider } from "./AdminContext";
import AdminOverviewPageNew from "./pages/AdminOverviewPageNew";
import AdminRestaurantsPage from "./pages/AdminRestaurantsPage";
import AdminReceiversPageNew from "./pages/AdminReceiversPageNew";
import AdminDonationsPageNew from "./pages/AdminDonationsPageNew";
import AdminReportsPageNew from "./pages/AdminReportsPageNew";
import AdminSettingsPageNew from "./pages/AdminSettingsPageNew";

export default function AdminModule() {
  return (
    <AdminProvider>
      <Routes>
        <Route element={<AdminShellNew />}>
          <Route index element={<AdminOverviewPageNew />} />
          <Route path="overview" element={<AdminOverviewPageNew />} />
          <Route path="dashboard" element={<Navigate to="/admin" replace />} />
          <Route path="restaurants" element={<AdminRestaurantsPage />} />
          <Route path="receveurs" element={<AdminReceiversPageNew />} />
          <Route path="donations" element={<AdminDonationsPageNew />} />
          <Route path="signalements" element={<AdminReportsPageNew />} />
          <Route path="parametres" element={<AdminSettingsPageNew />} />
          {/* Redirect old routes */}
          <Route
            path="users"
            element={<Navigate to="/admin/restaurants" replace />}
          />
          <Route
            path="donors"
            element={<Navigate to="/admin/restaurants" replace />}
          />
          <Route
            path="receivers"
            element={<Navigate to="/admin/receveurs" replace />}
          />
          <Route
            path="reports"
            element={<Navigate to="/admin/signalements" replace />}
          />
          <Route
            path="settings"
            element={<Navigate to="/admin/parametres" replace />}
          />
          <Route
            path="verifications"
            element={<Navigate to="/admin/restaurants" replace />}
          />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminProvider>
  );
}
