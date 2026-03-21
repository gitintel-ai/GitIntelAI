import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db";
import { users } from "../db/schema";
import { createAuditLog } from "./audit";

const app = new Hono();

// SCIM 2.0 Schema URIs
const SCIM_USER_SCHEMA = "urn:ietf:params:scim:schemas:core:2.0:User";
const SCIM_LIST_SCHEMA = "urn:ietf:params:scim:api:messages:2.0:ListResponse";
const SCIM_ERROR_SCHEMA = "urn:ietf:params:scim:api:messages:2.0:Error";

interface ScimUser {
  schemas: string[];
  id: string;
  externalId?: string;
  userName: string;
  name?: {
    familyName?: string;
    givenName?: string;
    formatted?: string;
  };
  emails: Array<{
    value: string;
    type?: string;
    primary?: boolean;
  }>;
  displayName?: string;
  active: boolean;
  groups?: Array<{
    value: string;
    display?: string;
  }>;
  meta: {
    resourceType: string;
    created: string;
    lastModified: string;
    location: string;
  };
}

interface ScimListResponse {
  schemas: string[];
  totalResults: number;
  itemsPerPage: number;
  startIndex: number;
  Resources: ScimUser[];
}

interface ScimError {
  schemas: string[];
  status: string;
  scimType?: string;
  detail: string;
}

/**
 * Convert internal user to SCIM format
 */
function toScimUser(user: typeof users.$inferSelect, baseUrl: string): ScimUser {
  return {
    schemas: [SCIM_USER_SCHEMA],
    id: user.id,
    externalId: user.externalId || undefined,
    userName: user.email,
    name: {
      formatted: user.name || undefined,
    },
    emails: [
      {
        value: user.email,
        type: "work",
        primary: true,
      },
    ],
    displayName: user.name || undefined,
    active: user.status === "active",
    meta: {
      resourceType: "User",
      created: user.createdAt.toISOString(),
      lastModified: user.updatedAt.toISOString(),
      location: `${baseUrl}/scim/v2/Users/${user.id}`,
    },
  };
}

/**
 * Create SCIM error response
 */
function scimError(status: number, detail: string, scimType?: string): ScimError {
  return {
    schemas: [SCIM_ERROR_SCHEMA],
    status: status.toString(),
    scimType,
    detail,
  };
}

/**
 * SCIM authentication middleware
 */
// biome-ignore lint/suspicious/noExplicitAny: SCIM middleware uses generic Hono context and next types
async function scimAuth(c: any, next: any) {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json(scimError(401, "Missing or invalid authorization"), 401);
  }

  const token = authHeader.substring(7);

  // Validate SCIM token (should be a special API key with scim:* scope)
  // For now, we'll extract org from a special header
  const orgId = c.req.header("X-SCIM-Organization");

  if (!orgId) {
    return c.json(scimError(401, "Organization context required"), 401);
  }

  c.set("orgId", orgId);
  c.set("scimToken", token);

  await next();
}

// Apply SCIM auth to all routes
app.use("/*", scimAuth);

/**
 * Service Provider Configuration
 * GET /scim/v2/ServiceProviderConfig
 */
app.get("/ServiceProviderConfig", (c) => {
  const baseUrl = c.req.url.replace("/ServiceProviderConfig", "");

  return c.json({
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig"],
    documentationUri: "https://docs.gitintel.com/scim",
    patch: { supported: true },
    bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 },
    filter: { supported: true, maxResults: 100 },
    changePassword: { supported: false },
    sort: { supported: false },
    etag: { supported: false },
    authenticationSchemes: [
      {
        type: "oauthbearertoken",
        name: "OAuth Bearer Token",
        description: "Authentication using OAuth 2.0 Bearer Token",
      },
    ],
    meta: {
      resourceType: "ServiceProviderConfig",
      location: `${baseUrl}/ServiceProviderConfig`,
    },
  });
});

/**
 * Resource Types
 * GET /scim/v2/ResourceTypes
 */
app.get("/ResourceTypes", (c) => {
  const baseUrl = c.req.url.replace("/ResourceTypes", "");

  return c.json({
    schemas: [SCIM_LIST_SCHEMA],
    totalResults: 1,
    Resources: [
      {
        schemas: ["urn:ietf:params:scim:schemas:core:2.0:ResourceType"],
        id: "User",
        name: "User",
        endpoint: "/Users",
        schema: SCIM_USER_SCHEMA,
        meta: {
          resourceType: "ResourceType",
          location: `${baseUrl}/ResourceTypes/User`,
        },
      },
    ],
  });
});

/**
 * Schemas
 * GET /scim/v2/Schemas
 */
app.get("/Schemas", (c) => {
  return c.json({
    schemas: [SCIM_LIST_SCHEMA],
    totalResults: 1,
    Resources: [
      {
        id: SCIM_USER_SCHEMA,
        name: "User",
        description: "User Account",
        attributes: [
          {
            name: "userName",
            type: "string",
            multiValued: false,
            required: true,
            caseExact: false,
            mutability: "readWrite",
            returned: "default",
            uniqueness: "server",
          },
          {
            name: "emails",
            type: "complex",
            multiValued: true,
            required: true,
            mutability: "readWrite",
            returned: "default",
          },
          {
            name: "active",
            type: "boolean",
            multiValued: false,
            required: false,
            mutability: "readWrite",
            returned: "default",
          },
        ],
        meta: {
          resourceType: "Schema",
        },
      },
    ],
  });
});

/**
 * List Users
 * GET /scim/v2/Users
 */
app.get("/Users", async (c) => {
  const orgId = c.get("orgId");
  const baseUrl = c.req.url.replace(/\?.*$/, "").replace("/Users", "");

  // Parse query params
  const startIndex = Number.parseInt(c.req.query("startIndex") || "1");
  const count = Math.min(Number.parseInt(c.req.query("count") || "100"), 100);
  const filter = c.req.query("filter");

  let whereClause = eq(users.organizationId, orgId);

  // Parse simple filter (userName eq "value" or email eq "value")
  if (filter) {
    const match = filter.match(/(\w+)\s+eq\s+"([^"]+)"/);
    if (match) {
      const [, field, value] = match;
      if (field === "userName" || field === "email") {
        // biome-ignore lint/suspicious/noExplicitAny: drizzle-orm and() returns a complex conditional type that doesn't match the base where clause type
        whereClause = and(whereClause, eq(users.email, value)) as any;
      } else if (field === "externalId") {
        // biome-ignore lint/suspicious/noExplicitAny: drizzle-orm and() returns a complex conditional type that doesn't match the base where clause type
        whereClause = and(whereClause, eq(users.externalId, value)) as any;
      }
    }
  }

  const allUsers = await db
    .select()
    .from(users)
    .where(whereClause)
    .limit(count)
    .offset(startIndex - 1);

  const response: ScimListResponse = {
    schemas: [SCIM_LIST_SCHEMA],
    totalResults: allUsers.length,
    itemsPerPage: count,
    startIndex,
    Resources: allUsers.map((u) => toScimUser(u, baseUrl)),
  };

  return c.json(response);
});

/**
 * Get User
 * GET /scim/v2/Users/:id
 */
app.get("/Users/:id", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.req.param("id");
  const baseUrl = c.req.url.replace(`/Users/${userId}`, "");

  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), eq(users.organizationId, orgId)))
    .limit(1);

  if (!user) {
    return c.json(scimError(404, "User not found"), 404);
  }

  return c.json(toScimUser(user, baseUrl));
});

/**
 * Create User
 * POST /scim/v2/Users
 */
app.post("/Users", async (c) => {
  const orgId = c.get("orgId");
  const baseUrl = c.req.url.replace("/Users", "");
  const body = await c.req.json<Partial<ScimUser>>();

  if (!body.userName) {
    return c.json(scimError(400, "userName is required", "invalidValue"), 400);
  }

  const email = body.userName;

  // Check if user already exists
  const [existing] = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), eq(users.organizationId, orgId)))
    .limit(1);

  if (existing) {
    return c.json(scimError(409, "User already exists", "uniqueness"), 409);
  }

  const id = randomUUID();
  const now = new Date();

  await db.insert(users).values({
    id,
    organizationId: orgId,
    email,
    name: body.displayName || body.name?.formatted || null,
    externalId: body.externalId || null,
    role: "developer",
    status: body.active !== false ? "active" : "inactive",
    createdAt: now,
    updatedAt: now,
  });

  const [newUser] = await db.select().from(users).where(eq(users.id, id));

  // Audit log
  await createAuditLog({
    organizationId: orgId,
    userId: "scim",
    action: "user.invite",
    resourceType: "user",
    resourceId: id,
    details: { email, source: "scim" },
  });

  return c.json(toScimUser(newUser, baseUrl), 201);
});

/**
 * Update User (PUT - full replace)
 * PUT /scim/v2/Users/:id
 */
app.put("/Users/:id", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.req.param("id");
  const baseUrl = c.req.url.replace(`/Users/${userId}`, "");
  const body = await c.req.json<Partial<ScimUser>>();

  const [existing] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), eq(users.organizationId, orgId)))
    .limit(1);

  if (!existing) {
    return c.json(scimError(404, "User not found"), 404);
  }

  await db
    .update(users)
    .set({
      email: body.userName || existing.email,
      name: body.displayName || body.name?.formatted || existing.name,
      externalId: body.externalId || existing.externalId,
      status: body.active !== false ? "active" : "inactive",
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  const [updated] = await db.select().from(users).where(eq(users.id, userId));

  // Audit log
  await createAuditLog({
    organizationId: orgId,
    userId: "scim",
    action: "user.role_change",
    resourceType: "user",
    resourceId: userId,
    details: { source: "scim", active: body.active },
  });

  return c.json(toScimUser(updated, baseUrl));
});

/**
 * Update User (PATCH - partial update)
 * PATCH /scim/v2/Users/:id
 */
app.patch("/Users/:id", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.req.param("id");
  const baseUrl = c.req.url.replace(`/Users/${userId}`, "");
  const body = await c.req.json<{
    schemas: string[];
    Operations: Array<{
      op: "add" | "remove" | "replace";
      path?: string;
      // biome-ignore lint/suspicious/noExplicitAny: SCIM PATCH operation value can be any JSON type
      value?: any;
    }>;
  }>();

  const [existing] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), eq(users.organizationId, orgId)))
    .limit(1);

  if (!existing) {
    return c.json(scimError(404, "User not found"), 404);
  }

  const updates: Partial<typeof existing> = { updatedAt: new Date() };

  for (const op of body.Operations) {
    if (op.op === "replace" || op.op === "add") {
      if (op.path === "active") {
        updates.status = op.value ? "active" : "inactive";
      } else if (op.path === "userName") {
        updates.email = op.value;
      } else if (op.path === "displayName") {
        updates.name = op.value;
      } else if (op.path === "externalId") {
        updates.externalId = op.value;
      }
    }
  }

  await db.update(users).set(updates).where(eq(users.id, userId));

  const [updated] = await db.select().from(users).where(eq(users.id, userId));

  // Audit log
  await createAuditLog({
    organizationId: orgId,
    userId: "scim",
    action: "user.role_change",
    resourceType: "user",
    resourceId: userId,
    details: { source: "scim", operations: body.Operations },
  });

  return c.json(toScimUser(updated, baseUrl));
});

/**
 * Delete User
 * DELETE /scim/v2/Users/:id
 */
app.delete("/Users/:id", async (c) => {
  const orgId = c.get("orgId");
  const userId = c.req.param("id");

  const [existing] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), eq(users.organizationId, orgId)))
    .limit(1);

  if (!existing) {
    return c.json(scimError(404, "User not found"), 404);
  }

  // Soft delete - mark as inactive
  await db
    .update(users)
    .set({ status: "inactive", updatedAt: new Date() })
    .where(eq(users.id, userId));

  // Audit log
  await createAuditLog({
    organizationId: orgId,
    userId: "scim",
    action: "user.remove",
    resourceType: "user",
    resourceId: userId,
    details: { email: existing.email, source: "scim" },
  });

  return new Response(null, { status: 204 });
});

export default app;
