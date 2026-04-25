import express from "express";
import Joi from "joi";
import { nanoid } from "nanoid";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { readDb, writeDb } from "../utils/db.js";
import { USER_ROLES } from "../constants/auth.js";

const router = express.Router();

const reportSchema = Joi.object({
  meal_id: Joi.string().trim().required(),
  reason: Joi.string().trim().min(5).max(500).required(),
  details: Joi.string().trim().allow("").max(2000).default(""),
  restaurantId: Joi.string().trim().allow("").default(""),
});

// POST /reports — any authenticated user submits a report
router.post("/", requireAuth, validate(reportSchema), async (req, res) => {
  const db = await readDb();

  const meal = (db.meals || []).find((m) => m.id === req.body.meal_id);
  if (!meal) return res.status(404).json({ error: "Meal not found" });

  const now = new Date().toISOString();
  const report = {
    id: nanoid(),
    reporterId: req.user.id,
    reporter_email: req.user.email,
    mealId: req.body.meal_id,
    meal_id: req.body.meal_id,
    restaurantId: req.body.restaurantId || meal.restaurantId || null,
    reason: req.body.reason,
    details: req.body.details || "",
    status: "open",
    reviewedBy: null,
    reviewedAt: null,
    resolution: "",
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

// GET /reports — admin only: list all reports
router.get(
  "/",
  requireAuth,
  requireRole(USER_ROLES.ADMIN),
  async (req, res) => {
    const db = await readDb();
    const { status } = req.query;
    let reports = db.reports || [];
    if (status && status !== "ALL") {
      reports = reports.filter((r) => r.status === status);
    }
    reports = reports
      .slice()
      .sort(
        (a, b) =>
          new Date(b.createdAt || b.created_date) -
          new Date(a.createdAt || a.created_date),
      );
    return res.json({ reports });
  },
);

export default router;
