import { readDb, writeDb } from "./db.js";

/**
 * Marks meals whose expiresAt has passed as "expired".
 * Run periodically (e.g. every 5 minutes) from server.js.
 */
export async function expireOldMeals() {
  const db = await readDb();
  const now = new Date();
  let changed = false;

  for (const meal of db.meals || []) {
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
      changed = true;
    }
  }

  if (changed) await writeDb(db);
  return changed;
}
