import { Hono } from "hono";
import { db } from "../db";
import { apiKeys, auditLogs } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requirePermission } from "../middleware/rbac";
import { randomUUID } from "crypto";
import { randomBytes, createHash } from "crypto";

const app = new Hono();

// Key prefix for identification
const KEY_PREFIX = "gitintel_";

/**
 * Generate a secure API key
 */
function generateApiKey(): { key: string; hash: string } {
  const bytes = randomBytes(32);
  const key = KEY_PREFIX + bytes.toString("base64url");
  const hash = createHash("sha256").update(key).digest("hex");
  return { key, hash };
}

/**
 * Hash an API key for lookup
 */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Mask an API key for display
 */
function maskKey(key: string): string {
  if (key.length <= 12) return "****";
  return key.substring(0, 12) + "..." + key.substring(key.length - 4);
}

/**
 * List API keys for organization
 * GET /api/v1/api-keys
 */
app.get("/", requirePermission("api_keys", "read"), async (c) => {
  const orgId = c.get("orgId");

  const keys = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      scopes: apiKeys.scopes,
      expiresAt: apiKeys.expiresAt,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
      createdBy: apiKeys.createdBy,
    })
    .from(apiKeys)
    .where(eq(apiKeys.organizationId, orgId))
    .orderBy(desc(apiKeys.createdAt));

  return c.json({ keys });
});

/**
 * Create API key
 * POST /api/v1/api-keys
 */
app.post("/", requirePermission("api_keys", "create"), async (c) => {
  const orgId = c.get("orgId");
  const user = c.get("user");
  const body = await c.req.json<{
    name: string;
    scopes?: string[];
    expiresInDays?: number;
  }>();

  if (!body.name) {
    return c.json({ error: "Name is required" }, 400);
  }

  const { key, hash } = generateApiKey();
  const id = randomUUID();

  const expiresAt = body.expiresInDays
    ? new Date(Date.now() + body.expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  await db.insert(apiKeys).values({
    id,
    organizationId: orgId,
    name: body.name,
    keyHash: hash,
    keyPrefix: key.substring(0, 12),
    scopes: body.scopes || ["sync:write", "stats:read"],
    expiresAt,
    createdBy: user.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Audit log
  await db.insert(auditLogs).values({
    id: randomUUID(),
    organizationId: orgId,
    userId: user.id,
    action: "api_key.create",
    resourceType: "api_key",
    resourceId: id,
    details: { name: body.name, scopes: body.scopes },
    ipAddress: c.req.header("x-forwarded-for") || "unknown",
    userAgent: c.req.header("user-agent") || "unknown",
    createdAt: new Date(),
  });

  // Return the full key only once - it cannot be retrieved again
  return c.json({
    id,
    name: body.name,
    key, // Full key - only shown once!
    keyPrefix: key.substring(0, 12),
    scopes: body.scopes || ["sync:write", "stats:read"],
    expiresAt,
    createdAt: new Date(),
    warning: "Save this key securely. It cannot be retrieved again.",
  }, 201);
});

/**
 * Get API key details
 * GET /api/v1/api-keys/:id
 */
app.get("/:id", requirePermission("api_keys", "read"), async (c) => {
  const orgId = c.get("orgId");
  const keyId = c.req.param("id");

  const [apiKey] = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      scopes: apiKeys.scopes,
      expiresAt: apiKeys.expiresAt,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
      createdBy: apiKeys.createdBy,
    })
    .from(apiKeys)
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.organizationId, orgId)))
    .limit(1);

  if (!apiKey) {
    return c.json({ error: "API key not found" }, 404);
  }

  return c.json({ apiKey });
});

/**
 * Update API key
 * PATCH /api/v1/api-keys/:id
 */
app.patch("/:id", requirePermission("api_keys", "update"), async (c) => {
  const orgId = c.get("orgId");
  const user = c.get("user");
  const keyId = c.req.param("id");
  const body = await c.req.json<{
    name?: string;
    scopes?: string[];
  }>();

  const [existing] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.organizationId, orgId)))
    .limit(1);

  if (!existing) {
    return c.json({ error: "API key not found" }, 404);
  }

  const updates: Partial<typeof existing> = { updatedAt: new Date() };
  if (body.name) updates.name = body.name;
  if (body.scopes) updates.scopes = body.scopes;

  await db
    .update(apiKeys)
    .set(updates)
    .where(eq(apiKeys.id, keyId));

  // Audit log
  await db.insert(auditLogs).values({
    id: randomUUID(),
    organizationId: orgId,
    userId: user.id,
    action: "api_key.update",
    resourceType: "api_key",
    resourceId: keyId,
    details: { changes: body },
    ipAddress: c.req.header("x-forwarded-for") || "unknown",
    userAgent: c.req.header("user-agent") || "unknown",
    createdAt: new Date(),
  });

  return c.json({ success: true });
});

/**
 * Revoke (delete) API key
 * DELETE /api/v1/api-keys/:id
 */
app.delete("/:id", requirePermission("api_keys", "delete"), async (c) => {
  const orgId = c.get("orgId");
  const user = c.get("user");
  const keyId = c.req.param("id");

  const [existing] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.organizationId, orgId)))
    .limit(1);

  if (!existing) {
    return c.json({ error: "API key not found" }, 404);
  }

  await db.delete(apiKeys).where(eq(apiKeys.id, keyId));

  // Audit log
  await db.insert(auditLogs).values({
    id: randomUUID(),
    organizationId: orgId,
    userId: user.id,
    action: "api_key.revoke",
    resourceType: "api_key",
    resourceId: keyId,
    details: { name: existing.name },
    ipAddress: c.req.header("x-forwarded-for") || "unknown",
    userAgent: c.req.header("user-agent") || "unknown",
    createdAt: new Date(),
  });

  return c.json({ success: true });
});

/**
 * Validate API key (internal use)
 */
export async function validateApiKey(key: string): Promise<{
  valid: boolean;
  orgId?: string;
  scopes?: string[];
}> {
  if (!key.startsWith(KEY_PREFIX)) {
    return { valid: false };
  }

  const hash = hashApiKey(key);

  const [apiKey] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, hash))
    .limit(1);

  if (!apiKey) {
    return { valid: false };
  }

  // Check expiration
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return { valid: false };
  }

  // Update last used
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, apiKey.id));

  return {
    valid: true,
    orgId: apiKey.organizationId,
    scopes: apiKey.scopes,
  };
}

export default app;
