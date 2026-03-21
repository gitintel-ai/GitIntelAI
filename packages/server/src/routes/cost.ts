import { getDateFromPeriod } from "@gitintel/core";
import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { costSessions, db } from "../db";

export const costRoutes = new Hono();

// ════════════════════════════════════════════════════════════════
// GET /cost/summary - Cost summary
// ════════════════════════════════════════════════════════════════

costRoutes.get("/summary", async (c) => {
  const period = c.req.query("period") || "30d";

  try {
    const sinceDate = getDateFromPeriod(period).toISOString();

    // Get cost by model
    const byModel = await db
      .select({
        model: costSessions.model,
        totalCost: sql<number>`sum(${costSessions.costUsd})`,
        sessions: sql<number>`count(*)`,
      })
      .from(costSessions)
      .where(sql`${costSessions.startedAt} >= ${sinceDate}`)
      .groupBy(costSessions.model);

    // Get cost by agent
    const byAgent = await db
      .select({
        agent: costSessions.agent,
        totalCost: sql<number>`sum(${costSessions.costUsd})`,
        sessions: sql<number>`count(*)`,
      })
      .from(costSessions)
      .where(sql`${costSessions.startedAt} >= ${sinceDate}`)
      .groupBy(costSessions.agent);

    const totalCost = byModel.reduce((sum, r) => sum + Number(r.totalCost || 0), 0);

    return c.json({
      period,
      totalCostUsd: totalCost,
      byModel: byModel.map((r) => ({
        model: r.model,
        costUsd: Number(r.totalCost || 0),
        percentage: totalCost > 0 ? (Number(r.totalCost || 0) / totalCost) * 100 : 0,
        sessions: Number(r.sessions),
      })),
      byAgent: byAgent.map((r) => ({
        agent: r.agent,
        costUsd: Number(r.totalCost || 0),
        percentage: totalCost > 0 ? (Number(r.totalCost || 0) / totalCost) * 100 : 0,
        sessions: Number(r.sessions),
      })),
    });
  } catch (error) {
    console.error("Cost summary error:", error);
    return c.json({ error: "Failed to fetch cost summary" }, 500);
  }
});

// ════════════════════════════════════════════════════════════════
// GET /cost/pr/:id - Cost per PR
// ════════════════════════════════════════════════════════════════

costRoutes.get("/pr/:id", async (c) => {
  const prId = c.req.param("id");

  // In production, this would look up commits associated with the PR
  // and aggregate their costs

  return c.json({
    prId,
    totalCostUsd: 0,
    commits: [],
    message: "PR cost tracking requires GitHub webhook integration",
  });
});

// ════════════════════════════════════════════════════════════════
// GET /cost/daily - Daily cost breakdown
// ════════════════════════════════════════════════════════════════

costRoutes.get("/daily", async (c) => {
  const period = c.req.query("period") || "30d";

  try {
    const sinceDate = getDateFromPeriod(period).toISOString();

    const results = await db
      .select({
        date: sql<string>`date(${costSessions.startedAt})`,
        totalCost: sql<number>`sum(${costSessions.costUsd})`,
        sessions: sql<number>`count(*)`,
      })
      .from(costSessions)
      .where(sql`${costSessions.startedAt} >= ${sinceDate}`)
      .groupBy(sql`date(${costSessions.startedAt})`)
      .orderBy(sql`date(${costSessions.startedAt})`);

    return c.json({
      period,
      days: results.map((r) => ({
        date: r.date,
        costUsd: Number(r.totalCost || 0),
        sessions: Number(r.sessions),
      })),
    });
  } catch (error) {
    console.error("Daily cost error:", error);
    return c.json({ error: "Failed to fetch daily costs" }, 500);
  }
});
