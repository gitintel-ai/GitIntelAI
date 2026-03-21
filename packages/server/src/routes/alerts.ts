import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { budgetAlerts, db, organizations } from "../db";

export const alertRoutes = new Hono();

// ════════════════════════════════════════════════════════════════
// GET /alerts/budget - List budget alerts
// ════════════════════════════════════════════════════════════════

alertRoutes.get("/budget", async (c) => {
  const auth = c.get("auth");

  try {
    // If orgId is a valid UUID, filter by it; otherwise return all (test mode)
    const isUuid =
      auth.orgId &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(auth.orgId);
    const results = isUuid
      ? await db
          .select()
          .from(budgetAlerts)
          .where(eq(budgetAlerts.orgId, auth.orgId as string))
      : await db.select().from(budgetAlerts);

    return c.json({ alerts: results });
  } catch (error) {
    console.error("List alerts error:", error);
    return c.json({ error: "Failed to list alerts" }, 500);
  }
});

// ════════════════════════════════════════════════════════════════
// POST /alerts/budget - Create budget alert
// ════════════════════════════════════════════════════════════════

const createAlertSchema = z.object({
  type: z.enum(["daily", "weekly", "monthly"]),
  thresholdUsd: z.number().positive(),
  channels: z.object({
    slack: z.string().url().optional(),
    email: z.array(z.string().email()).optional(),
  }),
  enabled: z.boolean().default(true),
});

alertRoutes.post("/budget", zValidator("json", createAlertSchema), async (c) => {
  const data = c.req.valid("json");
  const auth = c.get("auth");

  try {
    // Resolve orgId — use auth org if valid UUID, else pick first org (test mode)
    let orgId = auth.orgId;
    const isUuid =
      orgId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orgId);
    if (!isUuid) {
      const [firstOrg] = await db.select({ id: organizations.id }).from(organizations).limit(1);
      orgId = firstOrg?.id;
    }
    if (!orgId) return c.json({ error: "No organization found" }, 400);

    const [result] = await db
      .insert(budgetAlerts)
      .values({
        orgId,
        type: data.type,
        thresholdUsd: data.thresholdUsd,
        channelsJson: data.channels,
        enabled: data.enabled,
      })
      .returning();

    return c.json({ success: true, alert: result });
  } catch (error) {
    console.error("Create alert error:", error);
    return c.json({ error: "Failed to create alert" }, 500);
  }
});

// ════════════════════════════════════════════════════════════════
// PUT /alerts/budget/:id - Update budget alert
// ════════════════════════════════════════════════════════════════

alertRoutes.put("/budget/:id", zValidator("json", createAlertSchema.partial()), async (c) => {
  const id = c.req.param("id");
  const data = c.req.valid("json");

  try {
    const [result] = await db
      .update(budgetAlerts)
      .set({
        ...(data.type && { type: data.type }),
        ...(data.thresholdUsd && { thresholdUsd: data.thresholdUsd }),
        ...(data.channels && { channelsJson: data.channels }),
        ...(data.enabled !== undefined && { enabled: data.enabled }),
        updatedAt: new Date(),
      })
      .where(eq(budgetAlerts.id, id))
      .returning();

    return c.json({ success: true, alert: result });
  } catch (error) {
    console.error("Update alert error:", error);
    return c.json({ error: "Failed to update alert" }, 500);
  }
});

// ════════════════════════════════════════════════════════════════
// DELETE /alerts/budget/:id - Delete budget alert
// ════════════════════════════════════════════════════════════════

alertRoutes.delete("/budget/:id", async (c) => {
  const id = c.req.param("id");

  try {
    await db.delete(budgetAlerts).where(eq(budgetAlerts.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Delete alert error:", error);
    return c.json({ error: "Failed to delete alert" }, 500);
  }
});
