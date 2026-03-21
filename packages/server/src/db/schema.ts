import { relations } from "drizzle-orm";
import { boolean, integer, jsonb, pgTable, real, text, timestamp, uuid } from "drizzle-orm/pg-core";

// ════════════════════════════════════════════════════════════════
// Organizations
// ════════════════════════════════════════════════════════════════

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  settingsJson: jsonb("settings_json").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ════════════════════════════════════════════════════════════════
// Users
// ════════════════════════════════════════════════════════════════

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  clerkId: text("clerk_id").unique(),
  externalId: text("external_id"), // For SCIM provisioning
  organizationId: uuid("organization_id").references(() => organizations.id),
  orgId: uuid("org_id").references(() => organizations.id), // Legacy alias
  role: text("role").notNull().default("developer"), // owner, admin, manager, developer, viewer
  status: text("status").notNull().default("active"), // active, inactive, pending
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ one }) => ({
  organization: one(organizations, {
    fields: [users.orgId],
    references: [organizations.id],
  }),
}));

// ════════════════════════════════════════════════════════════════
// Repositories
// ════════════════════════════════════════════════════════════════

export const repositories = pgTable("repositories", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .references(() => organizations.id)
    .notNull(),
  name: text("name").notNull(),
  remoteUrl: text("remote_url"),
  defaultBranch: text("default_branch").default("main"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const repositoriesRelations = relations(repositories, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [repositories.orgId],
    references: [organizations.id],
  }),
  attributions: many(attributions),
  costSessions: many(costSessions),
}));

// ════════════════════════════════════════════════════════════════
// Attributions
// ════════════════════════════════════════════════════════════════

export const attributions = pgTable("attributions", {
  id: uuid("id").primaryKey().defaultRandom(),
  repoId: uuid("repo_id").references(() => repositories.id),
  commitSha: text("commit_sha").notNull(),
  authorEmail: text("author_email").notNull(),
  authoredAt: timestamp("authored_at").notNull(),
  aiLines: integer("ai_lines").default(0),
  humanLines: integer("human_lines").default(0),
  totalLines: integer("total_lines").default(0),
  aiPct: real("ai_pct").default(0),
  totalCostUsd: real("total_cost_usd").default(0),
  logJson: jsonb("log_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const attributionsRelations = relations(attributions, ({ one }) => ({
  repository: one(repositories, {
    fields: [attributions.repoId],
    references: [repositories.id],
  }),
}));

// ════════════════════════════════════════════════════════════════
// Cost Sessions
// ════════════════════════════════════════════════════════════════

export const costSessions = pgTable("cost_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: text("session_id").notNull().unique(),
  repoId: uuid("repo_id").references(() => repositories.id),
  commitSha: text("commit_sha"),
  agent: text("agent").notNull(),
  model: text("model").notNull(),
  startedAt: timestamp("started_at").notNull(),
  endedAt: timestamp("ended_at"),
  tokensIn: integer("tokens_in").default(0),
  tokensOut: integer("tokens_out").default(0),
  tokensCache: integer("tokens_cache").default(0),
  costUsd: real("cost_usd").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const costSessionsRelations = relations(costSessions, ({ one }) => ({
  repository: one(repositories, {
    fields: [costSessions.repoId],
    references: [repositories.id],
  }),
}));

// ════════════════════════════════════════════════════════════════
// Budget Alerts
// ════════════════════════════════════════════════════════════════

export const budgetAlerts = pgTable("budget_alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .references(() => organizations.id)
    .notNull(),
  type: text("type").notNull(), // daily, weekly, monthly
  thresholdUsd: real("threshold_usd").notNull(),
  channelsJson: jsonb("channels_json").default({}),
  enabled: boolean("enabled").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ════════════════════════════════════════════════════════════════
// Audit Log
// ════════════════════════════════════════════════════════════════

export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull(),
  userId: text("user_id").notNull(),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id"),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ════════════════════════════════════════════════════════════════
// API Keys
// ════════════════════════════════════════════════════════════════

export const apiKeys = pgTable("api_keys", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull(),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull().unique(),
  keyPrefix: text("key_prefix").notNull(), // First 12 chars for display
  scopes: jsonb("scopes").$type<string[]>().default(["sync:write", "stats:read"]),
  createdBy: text("created_by").notNull(),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
