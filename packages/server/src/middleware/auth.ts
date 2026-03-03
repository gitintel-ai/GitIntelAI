import { createMiddleware } from "hono/factory";
import { verifyToken } from "@clerk/backend";
import { createHash } from "crypto";
import { db } from "../db";
import { apiKeys, users } from "../db/schema";
import { eq } from "drizzle-orm";

export interface AuthContext {
  userId: string;
  orgId?: string;
  role?: string;
}

declare module "hono" {
  interface ContextVariableMap {
    auth: AuthContext;
  }
}

/**
 * Sets all auth context variables for downstream middleware/routes.
 * Routes use c.get("auth"), RBAC uses c.get("user") and c.get("orgId").
 */
function setAuthContext(c: any, auth: AuthContext) {
  c.set("auth", auth);
  c.set("user", { id: auth.userId, role: auth.role || "developer" });
  c.set("orgId", auth.orgId);
}

export const authMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header("Authorization");

  // Test mode: bypass Clerk verification for testing
  if (process.env.NODE_ENV === "test" && authHeader?.startsWith("Bearer mock_jwt_")) {
    const orgId = c.req.header("X-Organization-Id");
    setAuthContext(c, { userId: "test-user", orgId, role: "admin" });
    return next();
  }

  // Check for API key (gitintel_ prefix)
  if (authHeader?.startsWith("Bearer gitintel_")) {
    const apiKey = authHeader.slice(7);
    const auth = await verifyApiKey(apiKey);

    if (!auth) {
      return c.json({ error: "Invalid API key" }, 401);
    }

    setAuthContext(c, auth);
    return next();
  }

  // Check for API key (da_ prefix — legacy)
  if (authHeader?.startsWith("Bearer da_")) {
    const apiKey = authHeader.slice(7);
    const auth = await verifyApiKey(apiKey);

    if (!auth) {
      return c.json({ error: "Invalid API key" }, 401);
    }

    setAuthContext(c, auth);
    return next();
  }

  // Check for Clerk JWT
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);

    try {
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY!,
      });

      setAuthContext(c, {
        userId: payload.sub,
        orgId: payload.org_id as string | undefined,
        role: payload.org_role as string | undefined,
      });

      return next();
    } catch {
      return c.json({ error: "Invalid token" }, 401);
    }
  }

  return c.json({ error: "Authentication required" }, 401);
});

async function verifyApiKey(key: string): Promise<AuthContext | null> {
  try {
    const hash = createHash("sha256").update(key).digest("hex");
    const [found] = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, hash)).limit(1);

    if (!found) return null;

    // Check expiration
    if (found.expiresAt && found.expiresAt < new Date()) return null;

    // Update last used
    await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, found.id));

    return {
      userId: found.createdBy,
      orgId: found.organizationId,
      role: "developer",
    };
  } catch {
    return null;
  }
}
