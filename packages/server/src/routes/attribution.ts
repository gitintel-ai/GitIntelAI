import { Hono } from "hono";
import { sql, eq } from "drizzle-orm";
import { db, attributions } from "../db";

export const attributionRoutes = new Hono();

// ════════════════════════════════════════════════════════════════
// GET /attribution/:sha - Get attribution for a commit
// ════════════════════════════════════════════════════════════════

attributionRoutes.get("/:sha", async (c) => {
  const sha = c.req.param("sha");

  try {
    const [result] = await db
      .select()
      .from(attributions)
      .where(eq(attributions.commitSha, sha))
      .limit(1);

    if (!result) {
      return c.json({ error: "Attribution not found" }, 404);
    }

    return c.json(result);
  } catch (error) {
    console.error("Get attribution error:", error);
    return c.json({ error: "Failed to fetch attribution" }, 500);
  }
});

// ════════════════════════════════════════════════════════════════
// GET /attribution - List recent attributions
// ════════════════════════════════════════════════════════════════

attributionRoutes.get("/", async (c) => {
  const limit = parseInt(c.req.query("limit") || "50");
  const offset = parseInt(c.req.query("offset") || "0");

  try {
    const results = await db
      .select()
      .from(attributions)
      .orderBy(sql`${attributions.authoredAt} DESC`)
      .limit(limit)
      .offset(offset);

    return c.json({
      attributions: results,
      pagination: { limit, offset },
    });
  } catch (error) {
    console.error("List attributions error:", error);
    return c.json({ error: "Failed to list attributions" }, 500);
  }
});
