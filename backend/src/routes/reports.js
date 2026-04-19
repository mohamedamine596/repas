import express from "express";
import { nanoid } from "nanoid";
import { requireAuth } from "../middleware/auth.js";
import { readDb, writeDb } from "../utils/db.js";

const router = express.Router();

router.post("/", requireAuth, (req, res) => {
  const { meal_id, reason, details } = req.body || {};
  if (!meal_id || !reason) {
    return res.status(400).json({ error: "meal_id and reason are required" });
  }

  const db = readDb();
  const report = {
    id: nanoid(),
    reporter_email: req.user.email,
    meal_id: String(meal_id),
    reason: String(reason),
    details: details ? String(details) : "",
    created_date: new Date().toISOString()
  };

  db.reports.push(report);
  writeDb(db);

  return res.status(201).json({ report });
});

export default router;
