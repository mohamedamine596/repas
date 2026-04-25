import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AdminShell from "./components/AdminShell";
import { AdminProvider } from "./AdminContext";
import AdminOverviewPage from "./pages/AdminOverviewPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminDonorsPage from "./pages/AdminDonorsPage";
import AdminReceiversPage from "./pages/AdminReceiversPage";
import AdminDonationsPage from "./pages/AdminDonationsPage";
import AdminReportsPage from "./pages/AdminReportsPage";
import AdminSettingsPage from "./pages/AdminSettingsPage";

export default function AdminModule() {
  return (
    <AdminProvider>
      <Routes>
        <Route element={<AdminShell />}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="dashboard" element={<Navigate to="/admin/overview" replace />} />
          <Route path="overview" element={<AdminOverviewPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="donors" element={<AdminDonorsPage />} />
          <Route path="receivers" element={<AdminReceiversPage />} />
          <Route path="donations" element={<AdminDonationsPage />} />
          <Route path="reports" element={<AdminReportsPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="verifications" element={<Navigate to="/admin/donors?status=en_attente" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin/overview" replace />} />
      </Routes>
    </AdminProvider>
  );
}
