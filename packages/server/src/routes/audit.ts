import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db";
import { auditLogs } from "../db/schema";
import { requirePermission } from "../middleware/rbac";

const app = new Hono();

// Audit log actions
export type AuditAction =
  | "user.login"
  | "user.logout"
  | "user.invite"
  | "user.remove"
  | "user.role_change"
  | "api_key.create"
  | "api_key.update"
  | "api_key.revoke"
  | "repository.create"
  | "repository.update"
  | "repository.delete"
  | "attribution.sync"
  | "cost.sync"
  | "alert.create"
  | "alert.update"
  | "alert.delete"
  | "alert.triggered"
  | "settings.update"
  | "billing.update"
  | "export.data";

export interface AuditLogEntry {
  id: string;
  organizationId: string;
  userId: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(
  entry: Omit<AuditLogEntry, "id" | "createdAt">,
): Promise<void> {
  await db.insert(auditLogs).values({
    id: randomUUID(),
    ...entry,
    createdAt: new Date(),
  });
}

/**
 * List audit logs
 * GET /api/v1/audit
 */
app.get("/", requirePermission("audit_logs", "read"), async (c) => {
  const orgId = c.get("orgId");

  // Query params
  const page = Number.parseInt(c.req.query("page") || "1");
  const limit = Math.min(Number.parseInt(c.req.query("limit") || "50"), 100);
  const offset = (page - 1) * limit;

  const action = c.req.query("action");
  const userId = c.req.query("userId");
  const resourceType = c.req.query("resourceType");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");
  const _search = c.req.query("search");

  // Build conditions
  const conditions = [eq(auditLogs.organizationId, orgId)];

  if (action) {
    conditions.push(eq(auditLogs.action, action));
  }

  if (userId) {
    conditions.push(eq(auditLogs.userId, userId));
  }

  if (resourceType) {
    conditions.push(eq(auditLogs.resourceType, resourceType));
  }

  if (startDate) {
    conditions.push(gte(auditLogs.createdAt, new Date(startDate)));
  }

  if (endDate) {
    conditions.push(lte(auditLogs.createdAt, new Date(endDate)));
  }

  // Get total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditLogs)
    .where(and(...conditions));

  // Get logs with user info
  const logs = await db
    .select({
      id: auditLogs.id,
      userId: auditLogs.userId,
      action: auditLogs.action,
      resourceType: auditLogs.resourceType,
      resourceId: auditLogs.resourceId,
      details: auditLogs.details,
      ipAddress: auditLogs.ipAddress,
      userAgent: auditLogs.userAgent,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .where(and(...conditions))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);

  return c.json({
    logs,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    },
  });
});

/**
 * Get audit log entry
 * GET /api/v1/audit/:id
 */
app.get("/:id", requirePermission("audit_logs", "read"), async (c) => {
  const orgId = c.get("orgId");
  const logId = c.req.param("id");

  const [log] = await db
    .select()
    .from(auditLogs)
    .where(and(eq(auditLogs.id, logId), eq(auditLogs.organizationId, orgId)))
    .limit(1);

  if (!log) {
    return c.json({ error: "Audit log not found" }, 404);
  }

  return c.json({ log });
});

/**
 * Get audit log summary/stats
 * GET /api/v1/audit/summary
 */
app.get("/summary/stats", requirePermission("audit_logs", "read"), async (c) => {
  const orgId = c.get("orgId");
  const period = c.req.query("period") || "7d";

  // Calculate start date based on period
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case "24h":
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case "7d":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  // Get action counts
  const actionCounts = await db
    .select({
      action: auditLogs.action,
      count: sql<number>`count(*)`,
    })
    .from(auditLogs)
    .where(and(eq(auditLogs.organizationId, orgId), gte(auditLogs.createdAt, startDate)))
    .groupBy(auditLogs.action)
    .orderBy(desc(sql`count(*)`));

  // Get daily activity
  const dailyActivity = await db
    .select({
      date: sql<string>`DATE(${auditLogs.createdAt})`,
      count: sql<number>`count(*)`,
    })
    .from(auditLogs)
    .where(and(eq(auditLogs.organizationId, orgId), gte(auditLogs.createdAt, startDate)))
    .groupBy(sql`DATE(${auditLogs.createdAt})`)
    .orderBy(sql`DATE(${auditLogs.createdAt})`);

  // Get top users by activity
  const topUsers = await db
    .select({
      userId: auditLogs.userId,
      count: sql<number>`count(*)`,
    })
    .from(auditLogs)
    .where(and(eq(auditLogs.organizationId, orgId), gte(auditLogs.createdAt, startDate)))
    .groupBy(auditLogs.userId)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  // Get security events (logins, key changes, etc.)
  const securityActions = [
    "user.login",
    "user.logout",
    "api_key.create",
    "api_key.revoke",
    "user.role_change",
  ];

  const [{ securityEventCount }] = await db
    .select({ securityEventCount: sql<number>`count(*)` })
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.organizationId, orgId),
        gte(auditLogs.createdAt, startDate),
        sql`${auditLogs.action} IN ${securityActions}`,
      ),
    );

  return c.json({
    period,
    totalEvents: actionCounts.reduce((sum, a) => sum + a.count, 0),
    securityEvents: securityEventCount,
    actionBreakdown: actionCounts,
    dailyActivity,
    topUsers,
  });
});

/**
 * Export audit logs
 * GET /api/v1/audit/export
 */
app.get("/export/csv", requirePermission("audit_logs", "read"), async (c) => {
  const orgId = c.get("orgId");
  const user = c.get("user");

  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");

  const conditions = [eq(auditLogs.organizationId, orgId)];

  if (startDate) {
    conditions.push(gte(auditLogs.createdAt, new Date(startDate)));
  }

  if (endDate) {
    conditions.push(lte(auditLogs.createdAt, new Date(endDate)));
  }

  const logs = await db
    .select()
    .from(auditLogs)
    .where(and(...conditions))
    .orderBy(desc(auditLogs.createdAt))
    .limit(10000); // Max export size

  // Create audit log for the export
  await createAuditLog({
    organizationId: orgId,
    userId: user.id,
    action: "export.data",
    resourceType: "audit_logs",
    details: {
      startDate,
      endDate,
      recordCount: logs.length,
    },
    ipAddress: c.req.header("x-forwarded-for") || "unknown",
    userAgent: c.req.header("user-agent") || "unknown",
  });

  // Generate CSV
  const headers = [
    "id",
    "timestamp",
    "user_id",
    "action",
    "resource_type",
    "resource_id",
    "ip_address",
    "user_agent",
    "details",
  ];

  const rows = logs.map((log) => [
    log.id,
    log.createdAt.toISOString(),
    log.userId,
    log.action,
    log.resourceType,
    log.resourceId || "",
    log.ipAddress || "",
    log.userAgent || "",
    JSON.stringify(log.details || {}),
  ]);

  const csv = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="audit-logs-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
});

export default app;
