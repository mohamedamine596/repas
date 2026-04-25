import express from "express";
import Joi from "joi";
import { nanoid } from "nanoid";
import {
  requireAuth,
  requireApprovedRestaurant,
  requireRole,
} from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { deleteMealById, readDb, writeDb } from "../utils/db.js";
import { USER_ROLES } from "../constants/auth.js";

const router = express.Router();

const MAX_FOOD_AGE_HOURS = Number(process.env.MAX_FOOD_AGE_HOURS || 24);

const createMealSchema = Joi.object({
  title: Joi.string().trim().min(2).max(150).required(),
  description: Joi.string().trim().min(10).max(1000).required(),
  food_type: Joi.string().trim().required(),
  quantity: Joi.string().trim().required(),
  delivery_option: Joi.string().valid("pickup", "delivery", "both").required(),
  // Food safety — all mandatory
  photo_url: Joi.string()
    .min(1)
    .max(6_000_000)
    .required()
    .messages({ "any.required": "A food photo is required for all listings" }),
  prepared_at: Joi.date()
    .iso()
    .max("now")
    .required()
    .messages({ "any.required": "Preparation time is required" }),
  expires_at: Joi.date()
    .iso()
    .greater(Joi.ref("prepared_at"))
    .required()
    .messages({ "any.required": "Expiration time is required" }),
  // Location
  address: Joi.string().trim().min(3).max(300).required(),
  latitude: Joi.number().min(-90).max(90).allow(null).default(null),
  longitude: Joi.number().min(-180).max(180).allow(null).default(null),
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid(
    "available",
    "reserved",
    "collected",
    "delivered",
    "expired",
    "removed",
  ),
});

function applyFilters(items, filters) {
  return items.filter((item) =>
    Object.entries(filters).every(([key, value]) => {
      if (value === undefined || value === null || value === "") return true;
      return String(item[key]) === String(value);
    }),
  );
}

function autoExpireMeals(meals) {
  const now = new Date();
  for (const meal of meals) {
    if (
      meal.status === "available" &&
      meal.expires_at &&
      new Date(meal.expires_at) <= now
    ) {
      meal.status = "expired";
      if (!Array.isArray(meal.auditLog)) meal.auditLog = [];
      meal.auditLog.push({
        action: "expired",
        actorId: "system",
        actorRole: "system",
        timestamp: now.toISOString(),
      });
    }
  }
}

// ---------------------------------------------------------------------------
// GET /meals — list available meals (expired ones filtered out)
// ---------------------------------------------------------------------------
router.get("/", async (req, res) => {
  const db = await readDb();
  autoExpireMeals(db.meals);

  const {
    sort = "-created_date",
    limit = "100",
    status,
    ...filters
  } = req.query;

  // Default: only show available meals to the public
  const statusFilter = status || "available";
  let meals = db.meals.filter((m) => m.status === statusFilter);
  meals = applyFilters(meals, filters);

  const sortKey = String(sort).replace(/^-/, "");
  const isDesc = String(sort).startsWith("-");
  meals = meals.sort((a, b) => {
    const av = a[sortKey] ?? "";
    const bv = b[sortKey] ?? "";
    if (av === bv) return 0;
    return isDesc ? (av > bv ? -1 : 1) : av > bv ? 1 : -1;
  });

  const n = Number(limit);
  if (Number.isFinite(n) && n > 0) meals = meals.slice(0, n);

  await writeDb(db); // persist any status changes from autoExpireMeals
  return res.json({ meals });
});

// ---------------------------------------------------------------------------
// GET /meals/:id
// ---------------------------------------------------------------------------
router.get("/:id", async (req, res) => {
  const db = await readDb();
  const meal = db.meals.find((m) => m.id === req.params.id);
  if (!meal) return res.status(404).json({ error: "Meal not found" });
  return res.json({ meal });
});

// ---------------------------------------------------------------------------
// POST /meals — create a meal (approved restaurants only)
// ---------------------------------------------------------------------------
router.post(
  "/",
  requireAuth,
  requireApprovedRestaurant,
  validate(createMealSchema),
  async (req, res) => {
    const now = new Date();
    const preparedAt = new Date(req.body.prepared_at);
    const expiresAt = new Date(req.body.expires_at);

    // Food safety rule 1: cannot post food that is already expired
    if (expiresAt <= now) {
      return res
        .status(422)
        .json({
          error: "Cannot post food that is already expired",
          code: "FOOD_EXPIRED",
        });
    }

    // Food safety rule 2: preparation must be within the last 24 hours
    const ageHours = (now - preparedAt) / 3_600_000;
    if (ageHours > MAX_FOOD_AGE_HOURS) {
      return res.status(422).json({
        error: `Food prepared more than ${MAX_FOOD_AGE_HOURS} hours ago cannot be posted`,
        code: "FOOD_TOO_OLD",
      });
    }

    const db = await readDb();
    const user = db.users.find((u) => u.id === req.user.id);
    const restaurant = (db.restaurants || []).find(
      (r) => r.userId === req.user.id,
    );

    const meal = {
      id: nanoid(),
      restaurantId: restaurant?.id || null,
      donorUserId: req.user.id,

      title: String(req.body.title),
      description: String(req.body.description),
      food_type: String(req.body.food_type),
      quantity: String(req.body.quantity),
      delivery_option: String(req.body.delivery_option),

      photo_url: req.body.photo_url,
      prepared_at: preparedAt.toISOString(),
      expires_at: expiresAt.toISOString(),

      address: String(req.body.address),
      latitude: req.body.latitude ?? null,
      longitude: req.body.longitude ?? null,

      status: "available",
      donor_name: restaurant?.businessName || user?.name || req.user.name,
      donor_email: req.user.email,
      reserved_by: null,
      reserved_by_name: null,
      reserved_at: null,
      collected_at: null,

      isReported: false,
      auditLog: [
        {
          action: "created",
          actorId: req.user.id,
          actorRole: req.user.role,
          timestamp: now.toISOString(),
        },
      ],

      created_date: now.toISOString(),
      updated_date: now.toISOString(),
    };

    db.meals.push(meal);
    await writeDb(db);

    return res.status(201).json({ meal });
  },
);

// ---------------------------------------------------------------------------
// PATCH /meals/:id/reserve — receiver reserves a meal
// ---------------------------------------------------------------------------
router.patch(
  "/:id/reserve",
  requireAuth,
  requireRole(USER_ROLES.RECEIVER),
  async (req, res) => {
    const db = await readDb();
    const meal = db.meals.find((m) => m.id === req.params.id);
    if (!meal) return res.status(404).json({ error: "Meal not found" });

    if (meal.status !== "available") {
      return res
        .status(409)
        .json({ error: "Meal is not available for reservation" });
    }

    // Expire check
    if (meal.expires_at && new Date(meal.expires_at) <= new Date()) {
      meal.status = "expired";
      await writeDb(db);
      return res.status(409).json({ error: "This meal has expired" });
    }

    const now = new Date().toISOString();
    meal.status = "reserved";
    meal.reserved_by = req.user.id;
    meal.reserved_by_name = req.user.name;
    meal.reserved_by_email = req.user.email;
    meal.reserved_at = now;
    meal.updated_date = now;

    if (!Array.isArray(meal.auditLog)) meal.auditLog = [];
    meal.auditLog.push({
      action: "reserved",
      actorId: req.user.id,
      actorRole: req.user.role,
      timestamp: now,
    });

    await writeDb(db);
    return res.json({ meal });
  },
);

// ---------------------------------------------------------------------------
// PATCH /meals/:id/collect — receiver marks meal as collected
// ---------------------------------------------------------------------------
router.patch(
  "/:id/collect",
  requireAuth,
  requireRole(USER_ROLES.RECEIVER),
  async (req, res) => {
    const db = await readDb();
    const meal = db.meals.find((m) => m.id === req.params.id);
    if (!meal) return res.status(404).json({ error: "Meal not found" });

    const isReserver =
      meal.reserved_by === req.user.id ||
      meal.reserved_by_email === req.user.email;
    if (!isReserver)
      return res.status(403).json({ error: "You did not reserve this meal" });

    if (meal.status !== "reserved") {
      return res
        .status(409)
        .json({
          error: "Meal must be in reserved status to mark as collected",
        });
    }

    const now = new Date().toISOString();
    meal.status = "collected";
    meal.collected_at = now;
    meal.updated_date = now;

    if (!Array.isArray(meal.auditLog)) meal.auditLog = [];
    meal.auditLog.push({
      action: "collected",
      actorId: req.user.id,
      actorRole: req.user.role,
      timestamp: now,
    });

    await writeDb(db);
    return res.json({ meal });
  },
);

// ---------------------------------------------------------------------------
// PATCH /meals/:id — restaurant owner updates meal details
// ---------------------------------------------------------------------------
router.patch(
  "/:id",
  requireAuth,
  requireApprovedRestaurant,
  async (req, res) => {
    const db = await readDb();
    const meal = db.meals.find((m) => m.id === req.params.id);
    if (!meal) return res.status(404).json({ error: "Meal not found" });

    const isOwner =
      meal.donor_email === req.user.email || meal.donorUserId === req.user.id;
    if (!isOwner) return res.status(403).json({ error: "Not allowed" });

    const allowedFields = [
      "title",
      "description",
      "food_type",
      "quantity",
      "delivery_option",
      "photo_url",
      "address",
      "latitude",
      "longitude",
      "status",
    ];

    const payload = req.body || {};
    for (const key of allowedFields) {
      if (payload[key] !== undefined) meal[key] = payload[key];
    }

    if (payload.status === "available") {
      meal.reserved_by = null;
      meal.reserved_by_name = null;
      meal.reserved_at = null;
    }

    meal.updated_date = new Date().toISOString();
    await writeDb(db);
    return res.json({ meal });
  },
);

// ---------------------------------------------------------------------------
// DELETE /meals/:id — restaurant owner or admin removes a meal
// ---------------------------------------------------------------------------
router.delete("/:id", requireAuth, async (req, res) => {
  const db = await readDb();
  const idx = db.meals.findIndex((m) => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Meal not found" });

  const meal = db.meals[idx];
  const isOwner =
    meal.donor_email === req.user.email || meal.donorUserId === req.user.id;
  const isAdmin = req.user.role === USER_ROLES.ADMIN;
  if (!isOwner && !isAdmin)
    return res.status(403).json({ error: "Not allowed" });

  db.meals.splice(idx, 1);
  await writeDb(db);
  return res.status(204).end();
});

// ---------------------------------------------------------------------------
// POST /meals/:id/report — any authenticated user reports a meal
// ---------------------------------------------------------------------------
router.post("/:id/report", requireAuth, async (req, res) => {
  const { reason } = req.body || {};
  if (!reason || String(reason).trim().length < 5) {
    return res
      .status(400)
      .json({ error: "reason is required (min 5 characters)" });
  }

  const db = await readDb();
  const meal = db.meals.find((m) => m.id === req.params.id);
  if (!meal) return res.status(404).json({ error: "Meal not found" });

  const now = new Date().toISOString();
  const report = {
    id: nanoid(),
    reporterId: req.user.id,
    reporter_email: req.user.email,
    mealId: req.params.id,
    meal_id: req.params.id,
    restaurantId: meal.restaurantId || null,
    reason: String(reason).trim().slice(0, 1000),
    details: String(req.body.details || "")
      .trim()
      .slice(0, 2000),
    status: "open",
    createdAt: now,
    created_date: now,
  };

  if (!Array.isArray(db.reports)) db.reports = [];
  db.reports.push(report);

  meal.isReported = true;
  meal.updated_date = now;

  await writeDb(db);
  return res.status(201).json({ report });
});

export default router;
