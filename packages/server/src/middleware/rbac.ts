import { Context, Next } from "hono";
import { db } from "../db";
import { users, organizations } from "../db/schema";
import { eq, and } from "drizzle-orm";

export type Role = "owner" | "admin" | "manager" | "developer" | "viewer";

export interface Permission {
  resource: string;
  action: "create" | "read" | "update" | "delete" | "manage";
}

// Role hierarchy and permissions
const rolePermissions: Record<Role, Permission[]> = {
  owner: [
    { resource: "*", action: "manage" },
  ],
  admin: [
    { resource: "organization", action: "manage" },
    { resource: "users", action: "manage" },
    { resource: "api_keys", action: "manage" },
    { resource: "billing", action: "manage" },
    { resource: "audit_logs", action: "read" },
    { resource: "repositories", action: "manage" },
    { resource: "attributions", action: "read" },
    { resource: "cost", action: "read" },
  ],
  manager: [
    { resource: "users", action: "read" },
    { resource: "users", action: "update" },
    { resource: "repositories", action: "manage" },
    { resource: "attributions", action: "read" },
    { resource: "cost", action: "read" },
    { resource: "alerts", action: "manage" },
  ],
  developer: [
    { resource: "repositories", action: "read" },
    { resource: "attributions", action: "read" },
    { resource: "attributions", action: "create" },
    { resource: "cost", action: "read" },
  ],
  viewer: [
    { resource: "repositories", action: "read" },
    { resource: "attributions", action: "read" },
    { resource: "cost", action: "read" },
  ],
};

// Role hierarchy for inheritance
const roleHierarchy: Record<Role, Role[]> = {
  owner: ["owner", "admin", "manager", "developer", "viewer"],
  admin: ["admin", "manager", "developer", "viewer"],
  manager: ["manager", "developer", "viewer"],
  developer: ["developer", "viewer"],
  viewer: ["viewer"],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(
  role: Role,
  resource: string,
  action: Permission["action"]
): boolean {
  const permissions = rolePermissions[role];

  return permissions.some((p) => {
    // Wildcard resource
    if (p.resource === "*" && p.action === "manage") {
      return true;
    }

    // Exact match
    if (p.resource === resource) {
      // Manage includes all actions
      if (p.action === "manage") return true;
      return p.action === action;
    }

    return false;
  });
}

/**
 * Check if a role inherits from another role
 */
export function roleIncludes(userRole: Role, requiredRole: Role): boolean {
  return roleHierarchy[userRole].includes(requiredRole);
}

/**
 * RBAC middleware - checks if user has required role
 */
export function requireRole(requiredRole: Role) {
  return async (c: Context, next: Next) => {
    const user = c.get("user");

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const userRole = user.role as Role;

    if (!roleIncludes(userRole, requiredRole)) {
      return c.json(
        {
          error: "Forbidden",
          message: `Role '${requiredRole}' required, but user has '${userRole}'`
        },
        403
      );
    }

    await next();
  };
}

/**
 * Permission middleware - checks if user has required permission
 */
export function requirePermission(resource: string, action: Permission["action"]) {
  return async (c: Context, next: Next) => {
    const user = c.get("user");

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const userRole = user.role as Role;

    if (!hasPermission(userRole, resource, action)) {
      return c.json(
        {
          error: "Forbidden",
          message: `Permission '${action}' on '${resource}' required`
        },
        403
      );
    }

    await next();
  };
}

/**
 * Organization membership middleware
 */
export function requireOrgMembership() {
  return async (c: Context, next: Next) => {
    const user = c.get("user");
    const orgId = c.req.param("orgId") || c.req.header("X-Organization-Id");

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    if (!orgId) {
      return c.json({ error: "Organization ID required" }, 400);
    }

    // Check if user belongs to organization
    const membership = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.clerkId, user.id),
          eq(users.organizationId, orgId)
        )
      )
      .limit(1);

    if (membership.length === 0) {
      return c.json({ error: "Not a member of this organization" }, 403);
    }

    // Add org context to request
    c.set("orgId", orgId);
    c.set("userRole", membership[0].role);

    await next();
  };
}

/**
 * Resource ownership middleware - checks if user owns or has access to resource
 */
export function requireResourceAccess(
  resourceType: "repository" | "attribution" | "api_key",
  idParam: string = "id"
) {
  return async (c: Context, next: Next) => {
    const user = c.get("user");
    const resourceId = c.req.param(idParam);
    const userRole = c.get("userRole") as Role;

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Admins and above can access all resources
    if (roleIncludes(userRole, "admin")) {
      await next();
      return;
    }

    // For now, allow access - implement resource-specific checks as needed
    await next();
  };
}
