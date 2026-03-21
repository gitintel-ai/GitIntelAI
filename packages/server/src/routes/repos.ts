import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { attributions, costSessions, db, repositories } from "../db";

export const repoRoutes = new Hono();

// ════════════════════════════════════════════════════════════════
// GET /repos - List repositories with computed stats
// ════════════════════════════════════════════════════════════════

repoRoutes.get("/", async (c) => {
  try {
    const repos = await db
      .select({
        id: repositories.id,
        name: repositories.name,
        remoteUrl: repositories.remoteUrl,
        defaultBranch: repositories.defaultBranch,
        createdAt: repositories.createdAt,
      })
      .from(repositories);

    const reposWithStats = await Promise.all(
      repos.map(async (repo) => {
        const [stats] = await db
          .select({
            commits: sql<number>`count(*)`,
            aiLines: sql<number>`coalesce(sum(${attributions.aiLines}), 0)`,
            humanLines: sql<number>`coalesce(sum(${attributions.humanLines}), 0)`,
            totalLines: sql<number>`coalesce(sum(${attributions.totalLines}), 0)`,
            totalCost: sql<number>`coalesce(sum(${attributions.totalCostUsd}), 0)`,
            developers: sql<number>`count(distinct ${attributions.authorEmail})`,
          })
          .from(attributions)
          .where(sql`${attributions.repoId} = ${repo.id}`);

        const aiPct =
          Number(stats.totalLines) > 0
            ? (Number(stats.aiLines) / Number(stats.totalLines)) * 100
            : 0;

        return {
          id: repo.id,
          name: repo.name,
          remoteUrl: repo.remoteUrl,
          defaultBranch: repo.defaultBranch,
          createdAt: repo.createdAt,
          commits: Number(stats.commits),
          aiLines: Number(stats.aiLines),
          humanLines: Number(stats.humanLines),
          totalLines: Number(stats.totalLines),
          aiPct,
          totalCostUsd: Number(stats.totalCost),
          developers: Number(stats.developers),
        };
      }),
    );

    return c.json({ repositories: reposWithStats });
  } catch (error) {
    console.error("List repos error:", error);
    return c.json({ error: "Failed to list repositories" }, 500);
  }
});

// ════════════════════════════════════════════════════════════════
// GET /repos/:id - Repository detail
// ════════════════════════════════════════════════════════════════

repoRoutes.get("/:id", async (c) => {
  const repoId = c.req.param("id");

  try {
    const [repo] = await db.select().from(repositories).where(sql`${repositories.id} = ${repoId}`);

    if (!repo) {
      return c.json({ error: "Repository not found" }, 404);
    }

    // Aggregate stats
    const [stats] = await db
      .select({
        commits: sql<number>`count(*)`,
        aiLines: sql<number>`coalesce(sum(${attributions.aiLines}), 0)`,
        humanLines: sql<number>`coalesce(sum(${attributions.humanLines}), 0)`,
        totalLines: sql<number>`coalesce(sum(${attributions.totalLines}), 0)`,
        totalCost: sql<number>`coalesce(sum(${attributions.totalCostUsd}), 0)`,
        developers: sql<number>`count(distinct ${attributions.authorEmail})`,
      })
      .from(attributions)
      .where(sql`${attributions.repoId} = ${repoId}`);

    // Recent commits
    const recentCommits = await db
      .select({
        sha: attributions.commitSha,
        authorEmail: attributions.authorEmail,
        authoredAt: attributions.authoredAt,
        aiLines: attributions.aiLines,
        humanLines: attributions.humanLines,
        aiPct: attributions.aiPct,
        costUsd: attributions.totalCostUsd,
      })
      .from(attributions)
      .where(sql`${attributions.repoId} = ${repoId}`)
      .orderBy(sql`${attributions.authoredAt} DESC`)
      .limit(20);

    // Top contributors
    const topContributors = await db
      .select({
        email: attributions.authorEmail,
        commits: sql<number>`count(*)`,
        aiLines: sql<number>`coalesce(sum(${attributions.aiLines}), 0)`,
        humanLines: sql<number>`coalesce(sum(${attributions.humanLines}), 0)`,
        totalLines: sql<number>`coalesce(sum(${attributions.totalLines}), 0)`,
        costUsd: sql<number>`coalesce(sum(${attributions.totalCostUsd}), 0)`,
      })
      .from(attributions)
      .where(sql`${attributions.repoId} = ${repoId}`)
      .groupBy(attributions.authorEmail)
      .orderBy(sql`count(*) DESC`)
      .limit(10);

    // Daily costs
    const dailyCosts = await db
      .select({
        date: sql<string>`date(${costSessions.startedAt})`,
        costUsd: sql<number>`coalesce(sum(${costSessions.costUsd}), 0)`,
      })
      .from(costSessions)
      .where(sql`${costSessions.repoId} = ${repoId}`)
      .groupBy(sql`date(${costSessions.startedAt})`)
      .orderBy(sql`date(${costSessions.startedAt})`);

    const aiPct =
      Number(stats.totalLines) > 0 ? (Number(stats.aiLines) / Number(stats.totalLines)) * 100 : 0;

    return c.json({
      id: repo.id,
      name: repo.name,
      remoteUrl: repo.remoteUrl,
      defaultBranch: repo.defaultBranch,
      createdAt: repo.createdAt,
      commits: Number(stats.commits),
      aiLines: Number(stats.aiLines),
      humanLines: Number(stats.humanLines),
      totalLines: Number(stats.totalLines),
      aiPct,
      totalCostUsd: Number(stats.totalCost),
      developerCount: Number(stats.developers),
      recentCommits: recentCommits.map((r) => ({
        sha: r.sha,
        authorEmail: r.authorEmail,
        authoredAt: r.authoredAt,
        aiLines: r.aiLines,
        humanLines: r.humanLines,
        aiPct: r.aiPct,
        costUsd: r.costUsd,
      })),
      topContributors: topContributors.map((r) => ({
        email: r.email,
        commits: Number(r.commits),
        aiLines: Number(r.aiLines),
        humanLines: Number(r.humanLines),
        aiPct: Number(r.totalLines) > 0 ? (Number(r.aiLines) / Number(r.totalLines)) * 100 : 0,
        costUsd: Number(r.costUsd),
      })),
      dailyCosts: dailyCosts.map((r) => ({
        date: r.date,
        costUsd: Number(r.costUsd),
      })),
    });
  } catch (error) {
    console.error("Repo detail error:", error);
    return c.json({ error: "Failed to fetch repository detail" }, 500);
  }
});
