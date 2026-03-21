import { getDateFromPeriod } from "@gitintel/core";
import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { attributions, db } from "../db";

export const statsRoutes = new Hono();

// ════════════════════════════════════════════════════════════════
// GET /stats/team - Team AI adoption summary
// ════════════════════════════════════════════════════════════════

statsRoutes.get("/team", async (c) => {
  const period = c.req.query("period") || "30d";
  const _auth = c.get("auth");

  try {
    const sinceDate = getDateFromPeriod(period).toISOString();

    // Get team stats
    const results = await db
      .select({
        authorEmail: attributions.authorEmail,
        commits: sql<number>`count(*)`,
        aiLines: sql<number>`sum(${attributions.aiLines})`,
        humanLines: sql<number>`sum(${attributions.humanLines})`,
        totalLines: sql<number>`sum(${attributions.totalLines})`,
        totalCost: sql<number>`sum(${attributions.totalCostUsd})`,
      })
      .from(attributions)
      .where(sql`${attributions.authoredAt} >= ${sinceDate}`)
      .groupBy(attributions.authorEmail);

    // Calculate totals
    const totals = results.reduce(
      (acc, row) => ({
        commits: acc.commits + Number(row.commits),
        aiLines: acc.aiLines + Number(row.aiLines || 0),
        humanLines: acc.humanLines + Number(row.humanLines || 0),
        totalLines: acc.totalLines + Number(row.totalLines || 0),
        totalCost: acc.totalCost + Number(row.totalCost || 0),
      }),
      { commits: 0, aiLines: 0, humanLines: 0, totalLines: 0, totalCost: 0 },
    );

    const aiPercentage = totals.totalLines > 0 ? (totals.aiLines / totals.totalLines) * 100 : 0;

    return c.json({
      period,
      totalCommits: totals.commits,
      totalLines: totals.totalLines,
      aiLines: totals.aiLines,
      humanLines: totals.humanLines,
      aiPercentage,
      totalCostUsd: totals.totalCost,
      developers: results.map((r) => ({
        email: r.authorEmail,
        commits: Number(r.commits),
        aiLines: Number(r.aiLines || 0),
        humanLines: Number(r.humanLines || 0),
        aiPercentage:
          Number(r.totalLines) > 0 ? (Number(r.aiLines || 0) / Number(r.totalLines)) * 100 : 0,
        costUsd: Number(r.totalCost || 0),
      })),
    });
  } catch (error) {
    console.error("Stats error:", error);
    return c.json({ error: "Failed to fetch team stats" }, 500);
  }
});

// ════════════════════════════════════════════════════════════════
// GET /stats/developers - List all developers with stats
// ════════════════════════════════════════════════════════════════

statsRoutes.get("/developers", async (c) => {
  const period = c.req.query("period") || "30d";

  try {
    const sinceDate = getDateFromPeriod(period).toISOString();

    const results = await db
      .select({
        authorEmail: attributions.authorEmail,
        commits: sql<number>`count(*)`,
        aiLines: sql<number>`sum(${attributions.aiLines})`,
        humanLines: sql<number>`sum(${attributions.humanLines})`,
        totalLines: sql<number>`sum(${attributions.totalLines})`,
        totalCost: sql<number>`sum(${attributions.totalCostUsd})`,
      })
      .from(attributions)
      .where(sql`${attributions.authoredAt} >= ${sinceDate}`)
      .groupBy(attributions.authorEmail);

    return c.json({
      period,
      developers: results.map((r) => ({
        email: r.authorEmail,
        commits: Number(r.commits),
        aiLines: Number(r.aiLines || 0),
        humanLines: Number(r.humanLines || 0),
        aiPercentage:
          Number(r.totalLines) > 0 ? (Number(r.aiLines || 0) / Number(r.totalLines)) * 100 : 0,
        costUsd: Number(r.totalCost || 0),
      })),
    });
  } catch (error) {
    console.error("Developers list error:", error);
    return c.json({ error: "Failed to fetch developers" }, 500);
  }
});

// ════════════════════════════════════════════════════════════════
// GET /stats/developer/:id - Per-developer stats
// ════════════════════════════════════════════════════════════════

statsRoutes.get("/developer/:id", async (c) => {
  const email = c.req.param("id");
  const period = c.req.query("period") || "30d";

  try {
    const sinceDate = getDateFromPeriod(period).toISOString();

    const results = await db
      .select()
      .from(attributions)
      .where(
        sql`${attributions.authorEmail} = ${email} AND ${attributions.authoredAt} >= ${sinceDate}`,
      )
      .orderBy(sql`${attributions.authoredAt} DESC`);

    const totals = results.reduce(
      (acc, row) => ({
        commits: acc.commits + 1,
        aiLines: acc.aiLines + (row.aiLines || 0),
        humanLines: acc.humanLines + (row.humanLines || 0),
        totalLines: acc.totalLines + (row.totalLines || 0),
        totalCost: acc.totalCost + (row.totalCostUsd || 0),
      }),
      { commits: 0, aiLines: 0, humanLines: 0, totalLines: 0, totalCost: 0 },
    );

    return c.json({
      email,
      period,
      ...totals,
      aiPercentage: totals.totalLines > 0 ? (totals.aiLines / totals.totalLines) * 100 : 0,
      recentCommits: results.slice(0, 20).map((r) => ({
        sha: r.commitSha,
        authoredAt: r.authoredAt,
        aiLines: r.aiLines,
        humanLines: r.humanLines,
        aiPct: r.aiPct,
        costUsd: r.totalCostUsd,
      })),
    });
  } catch (error) {
    console.error("Developer stats error:", error);
    return c.json({ error: "Failed to fetch developer stats" }, 500);
  }
});
