import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { attributions, costSessions, db } from "../db";

export const syncRoutes = new Hono();

// ════════════════════════════════════════════════════════════════
// POST /sync/attribution - Sync attribution data from CLI
// ════════════════════════════════════════════════════════════════

const attributionSchema = z.object({
  commitSha: z.string(),
  repoPath: z.string(),
  authorEmail: z.string().email(),
  authoredAt: z.string().datetime(),
  aiLines: z.number().int(),
  humanLines: z.number().int(),
  totalLines: z.number().int(),
  aiPct: z.number(),
  totalCostUsd: z.number(),
  logJson: z.any().optional(),
});

syncRoutes.post("/attribution", zValidator("json", attributionSchema), async (c) => {
  const data = c.req.valid("json");
  const _auth = c.get("auth");

  try {
    const [result] = await db
      .insert(attributions)
      .values({
        commitSha: data.commitSha,
        authorEmail: data.authorEmail,
        authoredAt: new Date(data.authoredAt),
        aiLines: data.aiLines,
        humanLines: data.humanLines,
        totalLines: data.totalLines,
        aiPct: data.aiPct,
        totalCostUsd: data.totalCostUsd,
        logJson: data.logJson,
      })
      .returning({ id: attributions.id });

    return c.json({ success: true, id: result.id });
  } catch (error) {
    console.error("Sync attribution error:", error);
    return c.json({ error: "Failed to sync attribution" }, 500);
  }
});

// ════════════════════════════════════════════════════════════════
// POST /sync/cost - Sync cost session data from CLI
// ════════════════════════════════════════════════════════════════

const costSchema = z.object({
  sessionId: z.string(),
  commitSha: z.string().optional(),
  agent: z.string(),
  model: z.string(),
  projectPath: z.string(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
  tokensIn: z.number().int(),
  tokensOut: z.number().int(),
  tokensCache: z.number().int(),
  costUsd: z.number(),
});

syncRoutes.post("/cost", zValidator("json", costSchema), async (c) => {
  const data = c.req.valid("json");

  try {
    const [result] = await db
      .insert(costSessions)
      .values({
        sessionId: data.sessionId,
        commitSha: data.commitSha,
        agent: data.agent,
        model: data.model,
        startedAt: new Date(data.startedAt),
        endedAt: data.endedAt ? new Date(data.endedAt) : undefined,
        tokensIn: data.tokensIn,
        tokensOut: data.tokensOut,
        tokensCache: data.tokensCache,
        costUsd: data.costUsd,
      })
      .onConflictDoUpdate({
        target: costSessions.sessionId,
        set: {
          commitSha: data.commitSha,
          endedAt: data.endedAt ? new Date(data.endedAt) : undefined,
          tokensIn: data.tokensIn,
          tokensOut: data.tokensOut,
          tokensCache: data.tokensCache,
          costUsd: data.costUsd,
        },
      })
      .returning({ id: costSessions.id });

    return c.json({ success: true, id: result.id });
  } catch (error) {
    console.error("Sync cost error:", error);
    return c.json({ error: "Failed to sync cost session" }, 500);
  }
});
