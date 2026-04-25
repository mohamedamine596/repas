/**
 * Mock data for Kind Harvest Admin Dashboard
 * All data in French with realistic French companies and locations
 * TODO: Replace with real API calls to backend
 */

function toIsoDaysAgo(daysAgo, hour = 10, minute = 15) {
  const value = new Date();
  value.setDate(value.getDate() - daysAgo);
  value.setHours(hour, minute, 0, 0);
  return value.toISOString();
}

export function generateInitials(name) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Restaurants data - empty array for production, populate via real API
export const MOCK_RESTAURANTS = [];

// Receivers data - empty array for production, populate via real API
export const MOCK_RECEVEURS = [];

// Donations data - empty array for production, populate via real API
export const MOCK_DONATIONS = [];

// Reports data - empty array for production, populate via real API
export const MOCK_REPORTS = [];

// Admin users - empty array for production, populate via real API
export const MOCK_ADMINS = [];

// Email templates - empty array for production, populate via real API
export const MOCK_EMAIL_TEMPLATES = [];

// Auto-suspension threshold (configurable in settings)
export const DEFAULT_AUTO_SUSPEND_THRESHOLD = 3;

// Helper functions for mock API simulation
export function getRestaurantById(id) {
  return MOCK_RESTAURANTS.find((r) => r.id === id);
}

export function getReceveurById(id) {
  return MOCK_RECEVEURS.find((r) => r.id === id);
}

export function getDonationById(id) {
  return MOCK_DONATIONS.find((d) => d.id === id);
}

export function getReportById(id) {
  return MOCK_REPORTS.find((r) => r.id === id);
}

export function getReportsByRestaurant(restaurantId) {
  return MOCK_REPORTS.filter((r) => r.restaurantId === restaurantId);
}

export function getOpenReportsCount() {
  return MOCK_REPORTS.filter((r) => r.status === "ouvert").length;
}

export function getDonationsToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return MOCK_DONATIONS.filter((d) => {
    const donDate = new Date(d.datePublication);
    donDate.setHours(0, 0, 0, 0);
    return donDate.getTime() === today.getTime();
  }).length;
}

export function getActiveRestaurantsCount() {
  return MOCK_RESTAURANTS.filter((r) => r.accountStatus === "active").length;
}

export function getTotalReceiversCount() {
  return MOCK_RECEVEURS.length;
}

// Format date in French
export function formatDateFrench(isoDate) {
  const date = new Date(isoDate);
  const months = [
    "janvier",
    "février",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "août",
    "septembre",
    "octobre",
    "novembre",
    "décembre",
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}
