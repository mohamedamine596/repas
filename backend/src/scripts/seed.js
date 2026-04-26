/**
 * seed.js — populate MongoDB with realistic French sample data
 * Run: node --env-file=.env src/scripts/seed.js
 *
 * Creates:
 *  - 1 admin
 *  - 5 receivers
 *  - 4 restaurants (with their restaurant profiles)
 *  - 12 meals (spread across restaurants)
 *
 * Safe to run multiple times — skips users/restaurants that already exist.
 * Password for all seeded accounts: Repas2026!
 */

import { connectDb, disconnectDb } from "../config/mongoose.js";
import UserModel from "../models/User.js";
import RestaurantModel from "../models/Restaurant.js";
import MealModel from "../models/Meal.js";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

const PASSWORD_HASH = await bcrypt.hash("Repas2026!", 12);
const now = new Date().toISOString();

// ─── Helpers ────────────────────────────────────────────────────────────────

function uid() {
  return nanoid();
}

function hoursFromNow(h) {
  return new Date(Date.now() + h * 3600 * 1000).toISOString();
}

function daysAgo(d) {
  return new Date(Date.now() - d * 24 * 3600 * 1000).toISOString();
}

function baseUser(overrides) {
  return {
    id: uid(),
    password: PASSWORD_HASH,
    isPhoneVerified: false,
    emailOtp: {},
    phoneOtp: {},
    passwordReset: { tokenHash: "", expiresAt: null, requestedAt: null, usedAt: null },
    failedLoginCount: 0,
    lockoutUntil: null,
    lastFailedLoginAt: null,
    suspensionReason: "",
    refreshTokens: [],
    bio: "",
    phone: "",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// ─── Seed data ───────────────────────────────────────────────────────────────

const ADMIN = baseUser({
  name: "Admin Repas",
  email: "admin@repas-solidaire.fr",
  role: "ROLE_ADMIN",
  isVerified: true,
  isEmailVerified: true,
  verificationStatus: "APPROVED",
  accountStatus: "active",
  statusHistory: [{ status: "active", at: now, reason: "seed" }],
});

const RECEIVERS = [
  baseUser({
    name: "Amira Benali",
    email: "amira.benali@gmail.com",
    role: "ROLE_RECEIVER",
    isVerified: true,
    isEmailVerified: true,
    verificationStatus: "APPROVED",
    accountStatus: "active",
    bio: "Mère de famille cherchant de l'aide alimentaire à Lyon.",
    phone: "+33 6 12 34 56 78",
    statusHistory: [{ status: "active", at: now, reason: "seed" }],
  }),
  baseUser({
    name: "Karim Dridi",
    email: "karim.dridi@outlook.com",
    role: "ROLE_RECEIVER",
    isVerified: true,
    isEmailVerified: true,
    verificationStatus: "APPROVED",
    accountStatus: "active",
    bio: "Étudiant en master à Paris.",
    phone: "+33 7 23 45 67 89",
    statusHistory: [{ status: "active", at: now, reason: "seed" }],
  }),
  baseUser({
    name: "Fatima Ouhabi",
    email: "fatima.ouhabi@yahoo.fr",
    role: "ROLE_RECEIVER",
    isVerified: true,
    isEmailVerified: true,
    verificationStatus: "APPROVED",
    accountStatus: "active",
    bio: "Retraitée à Marseille.",
    statusHistory: [{ status: "active", at: now, reason: "seed" }],
  }),
  baseUser({
    name: "Lucas Martin",
    email: "lucas.martin@free.fr",
    role: "ROLE_RECEIVER",
    isVerified: true,
    isEmailVerified: true,
    verificationStatus: "APPROVED",
    accountStatus: "active",
    bio: "Demandeur d'emploi à Bordeaux.",
    statusHistory: [{ status: "active", at: now, reason: "seed" }],
  }),
  baseUser({
    name: "Nadia Toumi",
    email: "nadia.toumi@gmail.com",
    role: "ROLE_RECEIVER",
    isVerified: false,
    isEmailVerified: false,
    verificationStatus: "PENDING",
    accountStatus: "email_pending",
    statusHistory: [{ status: "email_pending", at: now, reason: "seed" }],
  }),
];

// Restaurant users (ROLE_RESTAURANT)
const RESTAURANT_USERS = [
  baseUser({
    name: "La Bonne Assiette",
    email: "contact@labonneassiette.fr",
    role: "ROLE_RESTAURANT",
    isVerified: true,
    isEmailVerified: true,
    verificationStatus: "APPROVED",
    accountStatus: "active",
    phone: "+33 1 40 22 33 44",
    statusHistory: [{ status: "active", at: now, reason: "seed" }],
  }),
  baseUser({
    name: "Chez Mounir",
    email: "mounir@chezmounir-resto.fr",
    role: "ROLE_RESTAURANT",
    isVerified: true,
    isEmailVerified: true,
    verificationStatus: "APPROVED",
    accountStatus: "active",
    phone: "+33 4 78 55 66 77",
    statusHistory: [{ status: "active", at: now, reason: "seed" }],
  }),
  baseUser({
    name: "Le Jardin Bio",
    email: "bonjour@lejardibio.fr",
    role: "ROLE_RESTAURANT",
    isVerified: true,
    isEmailVerified: true,
    verificationStatus: "APPROVED",
    accountStatus: "active",
    phone: "+33 5 56 12 34 56",
    statusHistory: [{ status: "active", at: now, reason: "seed" }],
  }),
  baseUser({
    name: "Saveurs du Monde",
    email: "info@saveursdumonde.fr",
    role: "ROLE_RESTAURANT",
    isVerified: false,
    isEmailVerified: true,
    verificationStatus: "PENDING",
    accountStatus: "active",
    phone: "+33 3 21 98 76 54",
    statusHistory: [
      { status: "email_pending", at: daysAgo(3), reason: "register" },
      { status: "active", at: daysAgo(2), reason: "otp_verified" },
    ],
  }),
];

// ─── Restaurant profiles ─────────────────────────────────────────────────────

function makeRestaurant(userId, overrides) {
  return {
    id: uid(),
    userId,
    sirenVerified: true,
    sirenVerifyMethod: "api",
    sirenVerifiedAt: daysAgo(30),
    documents: [],
    averageRating: null,
    ratingCount: 0,
    isFlaggedForReview: false,
    reviewedBy: null,
    reviewedAt: null,
    rejectionReason: "",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// ─── Meals ───────────────────────────────────────────────────────────────────

function makeMeal(restaurantUserId, restaurantName, overrides) {
  const id = uid();
  return {
    id,
    restaurantId: restaurantUserId,
    donorUserId: restaurantUserId,
    donorName: restaurantName,
    donor_name: restaurantName,
    donorEmail: overrides.donorEmail || "",
    donor_email: overrides.donorEmail || "",
    status: "available",
    isReported: false,
    reservedBy: null,
    reserved_by: null,
    reservedByName: null,
    reserved_by_name: null,
    reservedAt: null,
    collectedAt: null,
    auditLog: [],
    createdAt: now,
    updatedAt: now,
    created_date: now,
    updated_date: now,
    preparedAt: daysAgo(0.1),
    ...overrides,
  };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function seed() {
  await connectDb();

  if (mongoose.connection.readyState !== 1) {
    console.error("❌  MongoDB not connected. Check MONGODB_URI in your .env");
    process.exit(1);
  }

  console.log("🌱  Seeding database…");

  // ── Users ──────────────────────────────────────────────────────────────────
  const allUsers = [ADMIN, ...RECEIVERS, ...RESTAURANT_USERS];

  let usersInserted = 0;
  for (const u of allUsers) {
    const exists = await UserModel.findOne({ email: u.email });
    if (exists) {
      console.log(`   ⏭  User already exists: ${u.email}`);
      continue;
    }
    await UserModel.create(u);
    usersInserted++;
    console.log(`   ✅  Created user: ${u.email} (${u.role})`);
  }

  // ── Restaurant profiles ────────────────────────────────────────────────────
  // Re-fetch to get actual DB-assigned _id (in case of first run vs re-run)
  const r1User = await UserModel.findOne({ email: "contact@labonneassiette.fr" });
  const r2User = await UserModel.findOne({ email: "mounir@chezmounir-resto.fr" });
  const r3User = await UserModel.findOne({ email: "bonjour@lejardibio.fr" });
  const r4User = await UserModel.findOne({ email: "info@saveursdumonde.fr" });

  const RESTAURANTS_DATA = [
    makeRestaurant(r1User.id, {
      businessName: "La Bonne Assiette",
      siren: "552032534",
      sirenData: { legalName: "La Bonne Assiette SARL", naf: "56.10A" },
      address: {
        street: "12 Rue de Rivoli",
        city: "Paris",
        postalCode: "75001",
        country: "FR",
        lat: 48.8566,
        lng: 2.3522,
      },
    }),
    makeRestaurant(r2User.id, {
      businessName: "Chez Mounir",
      siren: "301940219",
      sirenData: { legalName: "Chez Mounir SAS", naf: "56.10A" },
      address: {
        street: "45 Cours Lafayette",
        city: "Lyon",
        postalCode: "69003",
        country: "FR",
        lat: 45.7578,
        lng: 4.8320,
      },
    }),
    makeRestaurant(r3User.id, {
      businessName: "Le Jardin Bio",
      siren: "408168003",
      sirenData: { legalName: "Le Jardin Bio EURL", naf: "56.10B" },
      address: {
        street: "8 Rue Sainte-Catherine",
        city: "Bordeaux",
        postalCode: "33000",
        country: "FR",
        lat: 44.8378,
        lng: -0.5792,
      },
    }),
    makeRestaurant(r4User.id, {
      businessName: "Saveurs du Monde",
      siren: "349093731",
      sirenData: { legalName: "Saveurs du Monde SNC", naf: "56.10A" },
      address: {
        street: "22 Rue de la République",
        city: "Marseille",
        postalCode: "13001",
        country: "FR",
        lat: 43.2965,
        lng: 5.3698,
      },
    }),
  ];

  let restoInserted = 0;
  for (const r of RESTAURANTS_DATA) {
    const exists = await RestaurantModel.findOne({ siren: r.siren });
    if (exists) {
      console.log(`   ⏭  Restaurant already exists: ${r.businessName}`);
      continue;
    }
    await RestaurantModel.create(r);
    restoInserted++;
    console.log(`   ✅  Created restaurant: ${r.businessName}`);
  }

  // ── Meals ──────────────────────────────────────────────────────────────────
  const MEALS_DATA = [
    // La Bonne Assiette (Paris)
    makeMeal(r1User.id, "La Bonne Assiette", {
      title: "Plateaux repas du midi — poulet rôti & légumes",
      description: "10 plateaux repas préparés ce matin. Poulet rôti, haricots verts, purée maison. Idéal pour familles.",
      foodType: "Plat chaud",
      food_type: "Plat chaud",
      quantity: "10 plateaux",
      deliveryOption: "pickup",
      delivery_option: "pickup",
      address: "12 Rue de Rivoli, Paris 75001",
      latitude: 48.8566,
      longitude: 2.3522,
      expiresAt: hoursFromNow(4),
      donorEmail: "contact@labonneassiette.fr",
    }),
    makeMeal(r1User.id, "La Bonne Assiette", {
      title: "Viennoiseries du matin — croissants & pains au chocolat",
      description: "30 viennoiseries invendues de ce matin. Croissants, pains au chocolat, pains aux raisins. À récupérer avant 13h.",
      foodType: "Boulangerie / Pâtisserie",
      food_type: "Boulangerie / Pâtisserie",
      quantity: "30 pièces",
      deliveryOption: "pickup",
      delivery_option: "pickup",
      address: "12 Rue de Rivoli, Paris 75001",
      latitude: 48.8566,
      longitude: 2.3522,
      expiresAt: hoursFromNow(2),
      donorEmail: "contact@labonneassiette.fr",
    }),
    makeMeal(r1User.id, "La Bonne Assiette", {
      title: "Soupe de légumes maison — grande quantité",
      description: "20 litres de soupe de légumes (carottes, courgettes, poireaux). En contenants de 1L. Livrée si besoin.",
      foodType: "Soupe / Potage",
      food_type: "Soupe / Potage",
      quantity: "20 litres",
      deliveryOption: "both",
      delivery_option: "both",
      address: "12 Rue de Rivoli, Paris 75001",
      latitude: 48.8566,
      longitude: 2.3522,
      expiresAt: hoursFromNow(8),
      donorEmail: "contact@labonneassiette.fr",
    }),

    // Chez Mounir (Lyon)
    makeMeal(r2User.id, "Chez Mounir", {
      title: "Couscous royal — surplus du service du soir",
      description: "Couscous royal avec merguez, poulet et légumes. Environ 8 portions généreuses. Halal certifié.",
      foodType: "Plat chaud",
      food_type: "Plat chaud",
      quantity: "8 portions",
      deliveryOption: "pickup",
      delivery_option: "pickup",
      address: "45 Cours Lafayette, Lyon 69003",
      latitude: 45.7578,
      longitude: 4.8320,
      expiresAt: hoursFromNow(3),
      donorEmail: "mounir@chezmounir-resto.fr",
    }),
    makeMeal(r2User.id, "Chez Mounir", {
      title: "Tajine d'agneau aux pruneaux",
      description: "6 portions de tajine d'agneau aux pruneaux et amandes. Plat mijoté traditionnel. Halal.",
      foodType: "Plat chaud",
      food_type: "Plat chaud",
      quantity: "6 portions",
      deliveryOption: "delivery",
      delivery_option: "delivery",
      address: "45 Cours Lafayette, Lyon 69003",
      latitude: 45.7578,
      longitude: 4.8320,
      expiresAt: hoursFromNow(5),
      donorEmail: "mounir@chezmounir-resto.fr",
    }),
    makeMeal(r2User.id, "Chez Mounir", {
      title: "Makroud & cornes de gazelle — pâtisseries orientales",
      description: "Assortiment de 40 pâtisseries orientales : makroud, cornes de gazelle, baklawa. Parfaites pour partager.",
      foodType: "Boulangerie / Pâtisserie",
      food_type: "Boulangerie / Pâtisserie",
      quantity: "40 pièces",
      deliveryOption: "pickup",
      delivery_option: "pickup",
      address: "45 Cours Lafayette, Lyon 69003",
      latitude: 45.7578,
      longitude: 4.8320,
      expiresAt: hoursFromNow(12),
      donorEmail: "mounir@chezmounir-resto.fr",
    }),

    // Le Jardin Bio (Bordeaux)
    makeMeal(r3User.id, "Le Jardin Bio", {
      title: "Buddha bowls végétaliens — invendus du déjeuner",
      description: "5 buddha bowls complets : quinoa, pois chiches rôtis, avocat, légumes de saison, sauce tahini. 100% bio et vegan.",
      foodType: "Végétarien / Vegan",
      food_type: "Végétarien / Vegan",
      quantity: "5 bowls",
      deliveryOption: "pickup",
      delivery_option: "pickup",
      address: "8 Rue Sainte-Catherine, Bordeaux 33000",
      latitude: 44.8378,
      longitude: -0.5792,
      expiresAt: hoursFromNow(3),
      donorEmail: "bonjour@lejardibio.fr",
    }),
    makeMeal(r3User.id, "Le Jardin Bio", {
      title: "Paniers de légumes bio — fin de marché",
      description: "15 paniers de légumes bio variés : tomates, courgettes, poivrons, salade, carottes. Légumes invendus du marché.",
      foodType: "Fruits & Légumes",
      food_type: "Fruits & Légumes",
      quantity: "15 paniers",
      deliveryOption: "pickup",
      delivery_option: "pickup",
      address: "8 Rue Sainte-Catherine, Bordeaux 33000",
      latitude: 44.8378,
      longitude: -0.5792,
      expiresAt: hoursFromNow(24),
      donorEmail: "bonjour@lejardibio.fr",
    }),
    makeMeal(r3User.id, "Le Jardin Bio", {
      title: "Tartes aux légumes sans gluten",
      description: "8 tartes aux légumes de saison, pâte sans gluten. Garnies de ratatouille et fromage de chèvre. Idéal pour intolérants.",
      foodType: "Sans gluten",
      food_type: "Sans gluten",
      quantity: "8 tartes",
      deliveryOption: "both",
      delivery_option: "both",
      address: "8 Rue Sainte-Catherine, Bordeaux 33000",
      latitude: 44.8378,
      longitude: -0.5792,
      expiresAt: hoursFromNow(6),
      donorEmail: "bonjour@lejardibio.fr",
    }),

    // Saveurs du Monde (Marseille)
    makeMeal(r4User.id, "Saveurs du Monde", {
      title: "Riz cantonnais & nems — surplus du soir",
      description: "12 portions de riz cantonnais accompagnées de 24 nems. Préparation fraîche du jour. Disponible au retrait.",
      foodType: "Plat chaud",
      food_type: "Plat chaud",
      quantity: "12 portions + 24 nems",
      deliveryOption: "pickup",
      delivery_option: "pickup",
      address: "22 Rue de la République, Marseille 13001",
      latitude: 43.2965,
      longitude: 5.3698,
      expiresAt: hoursFromNow(4),
      donorEmail: "info@saveursdumonde.fr",
    }),
    makeMeal(r4User.id, "Saveurs du Monde", {
      title: "Curry de légumes végétarien — 10 portions",
      description: "Curry de légumes aux épices douces (pommes de terre, pois chiches, épinards, lait de coco). Végétarien. Servi avec du riz.",
      foodType: "Végétarien / Vegan",
      food_type: "Végétarien / Vegan",
      quantity: "10 portions",
      deliveryOption: "both",
      delivery_option: "both",
      address: "22 Rue de la République, Marseille 13001",
      latitude: 43.2965,
      longitude: 5.3698,
      expiresAt: hoursFromNow(5),
      donorEmail: "info@saveursdumonde.fr",
    }),
    makeMeal(r4User.id, "Saveurs du Monde", {
      title: "Sandwichs variés — invendus boulangerie",
      description: "25 sandwichs variés : jambon-beurre, thon-crudités, poulet-avocats. Emballés individuellement. Péremption ce soir.",
      foodType: "Sandwich / Snack",
      food_type: "Sandwich / Snack",
      quantity: "25 sandwichs",
      deliveryOption: "pickup",
      delivery_option: "pickup",
      address: "22 Rue de la République, Marseille 13001",
      latitude: 43.2965,
      longitude: 5.3698,
      expiresAt: hoursFromNow(6),
      donorEmail: "info@saveursdumonde.fr",
    }),
  ];

  let mealsInserted = 0;
  for (const m of MEALS_DATA) {
    const exists = await MealModel.findOne({ title: m.title, donorUserId: m.donorUserId });
    if (exists) {
      console.log(`   ⏭  Meal already exists: "${m.title}"`);
      continue;
    }
    await MealModel.create(m);
    mealsInserted++;
    console.log(`   ✅  Created meal: "${m.title}"`);
  }

  console.log("\n✨  Seed complete!");
  console.log(`   Users inserted  : ${usersInserted}`);
  console.log(`   Restaurants     : ${restoInserted}`);
  console.log(`   Meals inserted  : ${mealsInserted}`);
  console.log("\n📋  Accounts (password: Repas2026!):");
  console.log("   admin@repas-solidaire.fr     → ADMIN");
  console.log("   contact@labonneassiette.fr   → RESTAURANT (Paris)");
  console.log("   mounir@chezmounir-resto.fr   → RESTAURANT (Lyon)");
  console.log("   bonjour@lejardibio.fr        → RESTAURANT (Bordeaux)");
  console.log("   info@saveursdumonde.fr       → RESTAURANT (Marseille)");
  console.log("   amira.benali@gmail.com       → RECEIVER");
  console.log("   karim.dridi@outlook.com      → RECEIVER");
  console.log("   fatima.ouhabi@yahoo.fr       → RECEIVER");
  console.log("   lucas.martin@free.fr         → RECEIVER");

  await disconnectDb();
}

// Need to import mongoose for the connection check
import mongoose from "mongoose";
seed().catch((err) => {
  console.error("❌  Seed failed:", err.message);
  process.exit(1);
});
