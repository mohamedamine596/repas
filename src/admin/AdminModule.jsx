import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AdminShell from "./components/AdminShell";
import AdminVerifications from "../pages/AdminVerifications";

export default function AdminModule() {
  return (
    <Routes>
      <Route element={<AdminShell />}>
        <Route index element={<Navigate to="verifications" replace />} />
        <Route path="dashboard" element={<Navigate to="/admin/verifications" replace />} />
        <Route path="overview" element={<Navigate to="/admin/verifications" replace />} />
        <Route path="donors" element={<Navigate to="/admin/verifications?status=PENDING" replace />} />
        <Route path="receivers" element={<Navigate to="/admin/verifications" replace />} />
        <Route path="donations" element={<Navigate to="/admin/verifications" replace />} />
        <Route path="reports" element={<Navigate to="/admin/verifications" replace />} />
        <Route path="settings" element={<Navigate to="/admin/verifications" replace />} />
        <Route path="verifications" element={<AdminVerifications />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin/verifications" replace />} />
    </Routes>
  );
}
