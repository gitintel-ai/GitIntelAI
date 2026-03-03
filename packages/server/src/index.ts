import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { secureHeaders } from "hono/secure-headers";

import { authMiddleware } from "./middleware/auth";
import { attributionRoutes } from "./routes/attribution";
import { costRoutes } from "./routes/cost";
import { statsRoutes } from "./routes/stats";
import { syncRoutes } from "./routes/sync";
import { webhookRoutes } from "./routes/webhooks";
import { alertRoutes } from "./routes/alerts";
import { repoRoutes } from "./routes/repos";
import apiKeyRoutes from "./routes/api-keys";
import auditRoutes from "./routes/audit";
import scimRoutes from "./routes/scim";

const app = new Hono();

// ════════════════════════════════════════════════════════════════
// Middleware
// ════════════════════════════════════════════════════════════════

app.use("*", logger());
app.use("*", cors());
app.use("*", prettyJSON());
app.use("*", secureHeaders());

// ════════════════════════════════════════════════════════════════
// Health Check
// ════════════════════════════════════════════════════════════════

app.get("/health", (c) => {
  return c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "0.1.0",
  });
});

// ════════════════════════════════════════════════════════════════
// API Routes (v1)
// ════════════════════════════════════════════════════════════════

const api = new Hono();

// Public routes (webhook)
api.route("/webhooks", webhookRoutes);

// Protected routes
api.use("*", authMiddleware);
api.route("/sync", syncRoutes);
api.route("/stats", statsRoutes);
api.route("/cost", costRoutes);
api.route("/attribution", attributionRoutes);
api.route("/alerts", alertRoutes);
api.route("/repos", repoRoutes);
api.route("/api-keys", apiKeyRoutes);
api.route("/audit", auditRoutes);

app.route("/api/v1", api);

// SCIM 2.0 endpoint (separate auth)
app.route("/scim/v2", scimRoutes);

// ════════════════════════════════════════════════════════════════
// 404 Handler
// ════════════════════════════════════════════════════════════════

app.notFound((c) => {
  return c.json({ error: "Not Found" }, 404);
});

// ════════════════════════════════════════════════════════════════
// Error Handler
// ════════════════════════════════════════════════════════════════

app.onError((err, c) => {
  // Handle Hono HTTPException (from validators, etc.)
  if ("status" in err && typeof (err as any).status === "number") {
    const status = (err as any).status as number;
    return c.json({ error: err.message || "Request error" }, status);
  }

  console.error("Server error:", err);
  return c.json({ error: "Internal Server Error" }, 500);
});

// ════════════════════════════════════════════════════════════════
// Start Server
// ════════════════════════════════════════════════════════════════

const port = process.env.PORT || 3001;

console.log(`🚀 GitIntel API server running on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
