import express from "express";
import Joi from "joi";
import { nanoid } from "nanoid";
import { requireAuth, requireVerifiedDonor } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { readDb, writeDb } from "../utils/db.js";
import { USER_ROLES } from "../constants/auth.js";

const router = express.Router();

const createMealSchema = Joi.object({
  title: Joi.string().trim().min(2).max(150).required(),
  food_type: Joi.string().trim().required(),
  description: Joi.string().trim().min(3).max(1000).required(),
  quantity: Joi.string().trim().required(),
  available_date: Joi.string().allow(null, ""),
  delivery_option: Joi.string().valid("pickup", "delivery", "both").required(),
  address: Joi.string().trim().min(3).max(300).required(),
  latitude: Joi.number().allow(null),
  longitude: Joi.number().allow(null),
  photo_url: Joi.string().allow("").max(6_000_000),
  status: Joi.string().valid("available", "reserved", "collected", "delivered", "expired").default("available"),
});

function applyFilters(items, filters) {
  return items.filter((item) =>
    Object.entries(filters).every(([key, value]) => {
      if (value === undefined || value === null || value === "") return true;
      return String(item[key]) === String(value);
    })
  );
}

router.get("/", (req, res) => {
  const db = readDb();
  const { sort = "-created_date", limit = "100", ...filters } = req.query;

  let meals = applyFilters(db.meals, filters);

  const sortKey = String(sort).replace(/^-/, "");
  const isDesc = String(sort).startsWith("-");
  meals = meals.sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (av === bv) return 0;
    if (isDesc) return av > bv ? -1 : 1;
    return av > bv ? 1 : -1;
  });

  const n = Number(limit);
  if (Number.isFinite(n) && n > 0) {
    meals = meals.slice(0, n);
  }

  return res.json({ meals });
});

router.get("/:id", (req, res) => {
  const db = readDb();
  const meal = db.meals.find((m) => m.id === req.params.id);
  if (!meal) {
    return res.status(404).json({ error: "Meal not found" });
  }
  return res.json({ meal });
});

router.post("/", requireAuth, requireVerifiedDonor, validate(createMealSchema), (req, res) => {
  const payload = req.body || {};

  const db = readDb();
  const user = db.users.find((u) => u.id === req.user.id);

  const meal = {
    id: nanoid(),
    title: String(payload.title),
    food_type: String(payload.food_type),
    description: String(payload.description),
    quantity: String(payload.quantity),
    available_date: payload.available_date || null,
    delivery_option: String(payload.delivery_option),
    address: String(payload.address),
    latitude: payload.latitude ?? null,
    longitude: payload.longitude ?? null,
    photo_url: payload.photo_url || "",
    status: payload.status || "available",
    donor_name: user?.name || req.user.name,
    donor_email: req.user.email,
    reserved_by: null,
    reserved_by_name: null,
    created_date: new Date().toISOString()
  };

  db.meals.push(meal);
  writeDb(db);

  return res.status(201).json({ meal });
});

router.patch("/:id", requireAuth, (req, res) => {
  const db = readDb();
  const meal = db.meals.find((m) => m.id === req.params.id);

  if (!meal) {
    return res.status(404).json({ error: "Meal not found" });
  }

  const payload = req.body || {};
  const isOwner = meal.donor_email === req.user.email;
  const now = new Date().toISOString();

  if (!isOwner) {
    if (req.user.role !== USER_ROLES.RECEIVER) {
      return res.status(403).json({ error: "Only receivers can reserve donations" });
    }

    if (meal.status !== "available") {
      return res.status(409).json({ error: "Meal is not available for reservation" });
    }

    meal.status = "reserved";
    meal.reserved_by = req.user.email;
    meal.reserved_by_name = req.user.name;
    meal.updated_date = now;

    writeDb(db);
    return res.json({ meal });
  }

  const ownerAllowedFields = [
    "title",
    "food_type",
    "description",
    "quantity",
    "available_date",
    "delivery_option",
    "address",
    "latitude",
    "longitude",
    "photo_url",
    "status",
  ];

  for (const key of ownerAllowedFields) {
    if (payload[key] !== undefined) {
      meal[key] = payload[key];
    }
  }

  if (payload.status === "available") {
    meal.reserved_by = null;
    meal.reserved_by_name = null;
  }

  meal.updated_date = now;
  writeDb(db);

  return res.json({ meal });
});

router.delete("/:id", requireAuth, (req, res) => {
  const db = readDb();
  const idx = db.meals.findIndex((m) => m.id === req.params.id);

  if (idx === -1) {
    return res.status(404).json({ error: "Meal not found" });
  }

  const isOwner = db.meals[idx].donor_email === req.user.email;
  const isAdmin = req.user.role === USER_ROLES.ADMIN;
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ error: "Not allowed" });
  }

  db.meals.splice(idx, 1);
  writeDb(db);
  return res.status(204).end();
});

export default router;
