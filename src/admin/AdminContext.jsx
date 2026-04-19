import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { buildInitialAdminState } from "./mockData";

const AdminContext = createContext(null);

const makeActivityEvent = (message) => ({
  id: `ev-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  createdAt: new Date().toISOString(),
  message,
});

export function AdminProvider({ children }) {
  const initial = useMemo(() => buildInitialAdminState(), []);

  const [donors, setDonors] = useState(initial.donors);
  const [receivers] = useState(initial.receivers);
  const [donations, setDonations] = useState(initial.donations);
  const [reports, setReports] = useState(initial.reports);
  const [adminAccounts, setAdminAccounts] = useState(initial.adminAccounts);
  const [quizQuestions, setQuizQuestions] = useState(initial.quizQuestions);
  const [rules, setRules] = useState(initial.rules);
  const [emailTemplates, setEmailTemplates] = useState(initial.emailTemplates);
  const [activityFeed, setActivityFeed] = useState(initial.activityFeed);

  // Replace this helper with real API tracking/event logging when backend endpoints are ready.
  const pushActivity = useCallback((message) => {
    setActivityFeed((prev) => [makeActivityEvent(message), ...prev].slice(0, 60));
  }, []);

  const donorLookup = useMemo(
    () => Object.fromEntries(donors.map((donor) => [donor.id, donor])),
    [donors]
  );

  const receiverLookup = useMemo(
    () => Object.fromEntries(receivers.map((receiver) => [receiver.id, receiver])),
    [receivers]
  );

  const openReportsByDonor = useMemo(() => {
    const map = {};
    reports.forEach((report) => {
      if (report.status === "ouvert") {
        map[report.donorId] = (map[report.donorId] || 0) + 1;
      }
    });
    return map;
  }, [reports]);

  const dashboardStats = useMemo(() => {
    const today = new Date();
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    return {
      totalActiveDonors: donors.filter((donor) => donor.status === "actif").length,
      totalPendingDonors: donors.filter((donor) => donor.status === "en_attente").length,
      donationsToday: donations.filter((donation) => (donation.publishedAt || "").startsWith(todayIso)).length,
      openReports: reports.filter((report) => report.status === "ouvert").length,
    };
  }, [donors, donations, reports]);

  const donationChartData = useMemo(() => {
    const days = [];
    const counts = {};

    for (let offset = 29; offset >= 0; offset -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - offset);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const label = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
      days.push({ key, label });
      counts[key] = 0;
    }

    donations.forEach((donation) => {
      const dayKey = (donation.publishedAt || "").slice(0, 10);
      if (counts[dayKey] !== undefined) {
        counts[dayKey] += 1;
      }
    });

    return days.map((day) => ({
      day: day.label,
      donations: counts[day.key],
    }));
  }, [donations]);

  const getDonorDonationHistory = useCallback(
    (donorId) =>
      donations
        .filter((donation) => donation.donorId === donorId)
        .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)),
    [donations]
  );

  const getReceiverDonationHistory = useCallback(
    (receiverId) =>
      donations
        .filter((donation) => donation.receiverId === receiverId)
        .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)),
    [donations]
  );

  // Swap this mutation with backend API call: PATCH /admin/donors/status
  const activateDonors = useCallback(
    (donorIds) => {
      const ids = new Set(donorIds);
      setDonors((prev) =>
        prev.map((donor) =>
          ids.has(donor.id)
            ? { ...donor, status: "actif", suspensionReason: "" }
            : donor
        )
      );
      pushActivity(`Activation de ${donorIds.length} compte(s) donneur.`);
    },
    [pushActivity]
  );

  // Swap this mutation with backend API call: PATCH /admin/donors/status
  const suspendDonors = useCallback(
    (donorIds, reason = "Suspension manuelle par admin") => {
      const ids = new Set(donorIds);
      setDonors((prev) =>
        prev.map((donor) =>
          ids.has(donor.id)
            ? { ...donor, status: "suspendu", suspensionReason: reason }
            : donor
        )
      );
      pushActivity(`Suspension de ${donorIds.length} compte(s) donneur.`);
    },
    [pushActivity]
  );

  // Swap this action with backend API call: POST /admin/emails/send
  const sendEmailToDonor = useCallback(
    (donorId, subject = "Notification admin") => {
      const donor = donorLookup[donorId];
      if (!donor) return;
      pushActivity(`Email envoye a ${donor.name}: ${subject}`);
    },
    [donorLookup, pushActivity]
  );

  // Swap this action with backend API call: POST /admin/donations/{id}/flag
  const flagDonationAsInappropriate = useCallback(
    (donationId) => {
      const donation = donations.find((item) => item.id === donationId);
      if (!donation) return;

      const nowIso = new Date().toISOString();

      setDonations((prev) =>
        prev.map((item) =>
          item.id === donationId ? { ...item, warningSent: true } : item
        )
      );

      const newReport = {
        id: `rp-${Date.now()}`,
        type: "Donation inappropriee",
        reportedBy: "Equipe Admin",
        donorId: donation.donorId,
        donorName: donation.donorName,
        donationId,
        status: "ouvert",
        detail: "Signalement cree depuis la page Donations par un administrateur.",
        createdAt: nowIso,
      };

      setReports((prev) => [newReport, ...prev]);
      pushActivity(`Signalement cree contre ${donation.donorName} apres verification donation.`);
      sendEmailToDonor(donation.donorId, "Avertissement: donation signalee");
    },
    [donations, pushActivity, sendEmailToDonor]
  );

  // Swap this action with backend API call: PATCH /admin/reports/{id}
  const markReportAsResolved = useCallback(
    (reportId) => {
      setReports((prev) =>
        prev.map((report) =>
          report.id === reportId ? { ...report, status: "resolu" } : report
        )
      );
      pushActivity("Signalement marque comme resolu.");
    },
    [pushActivity]
  );

  // Swap this action with backend API call: POST /admin/reports/{id}/warn
  const warnDonorFromReport = useCallback(
    (reportId) => {
      const report = reports.find((item) => item.id === reportId);
      if (!report) return;
      sendEmailToDonor(report.donorId, "Avertissement suite a signalement");
      pushActivity(`Avertissement envoye a ${report.donorName} depuis la page Signalements.`);
    },
    [reports, sendEmailToDonor, pushActivity]
  );

  const suspendDonorFromReport = useCallback(
    (reportId) => {
      const report = reports.find((item) => item.id === reportId);
      if (!report) return;
      suspendDonors([report.donorId], "Suspension suite a signalement admin");
      pushActivity(`Compte ${report.donorName} suspendu depuis un signalement.`);
    },
    [reports, suspendDonors, pushActivity]
  );

  // Swap these settings updates with backend API calls when endpoints are available.
  const addAdminAccount = useCallback(
    ({ name, email, role }) => {
      setAdminAccounts((prev) => [
        {
          id: `a-${Date.now()}`,
          name,
          email,
          role,
        },
        ...prev,
      ]);
      pushActivity(`Nouveau compte admin cree: ${name}`);
    },
    [pushActivity]
  );

  const removeAdminAccount = useCallback(
    (adminId) => {
      setAdminAccounts((prev) => prev.filter((admin) => admin.id !== adminId));
      pushActivity("Compte admin supprime.");
    },
    [pushActivity]
  );

  const updateQuizQuestions = useCallback((nextQuestions) => {
    setQuizQuestions(nextQuestions);
  }, []);

  const updateRules = useCallback((nextRules) => {
    setRules((prev) => ({ ...prev, ...nextRules }));
  }, []);

  const updateEmailTemplates = useCallback((nextTemplates) => {
    setEmailTemplates((prev) => ({ ...prev, ...nextTemplates }));
  }, []);

  const value = useMemo(
    () => ({
      donors,
      receivers,
      donations,
      reports,
      adminAccounts,
      quizQuestions,
      rules,
      emailTemplates,
      activityFeed,
      donorLookup,
      receiverLookup,
      openReportsByDonor,
      dashboardStats,
      donationChartData,
      getDonorDonationHistory,
      getReceiverDonationHistory,
      activateDonors,
      suspendDonors,
      sendEmailToDonor,
      flagDonationAsInappropriate,
      markReportAsResolved,
      warnDonorFromReport,
      suspendDonorFromReport,
      addAdminAccount,
      removeAdminAccount,
      updateQuizQuestions,
      updateRules,
      updateEmailTemplates,
      pushActivity,
    }),
    [
      donors,
      receivers,
      donations,
      reports,
      adminAccounts,
      quizQuestions,
      rules,
      emailTemplates,
      activityFeed,
      donorLookup,
      receiverLookup,
      openReportsByDonor,
      dashboardStats,
      donationChartData,
      getDonorDonationHistory,
      getReceiverDonationHistory,
      activateDonors,
      suspendDonors,
      sendEmailToDonor,
      flagDonationAsInappropriate,
      markReportAsResolved,
      warnDonorFromReport,
      suspendDonorFromReport,
      addAdminAccount,
      removeAdminAccount,
      updateQuizQuestions,
      updateRules,
      updateEmailTemplates,
      pushActivity,
    ]
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdminData() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdminData must be used inside AdminProvider");
  }
  return context;
}
