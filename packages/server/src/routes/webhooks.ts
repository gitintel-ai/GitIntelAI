import crypto from "node:crypto";
import { Hono } from "hono";

export const webhookRoutes = new Hono();

// ════════════════════════════════════════════════════════════════
// POST /webhooks/github - GitHub webhook handler
// ════════════════════════════════════════════════════════════════

webhookRoutes.post("/github", async (c) => {
  const signature = c.req.header("X-Hub-Signature-256");
  const event = c.req.header("X-GitHub-Event");
  const delivery = c.req.header("X-GitHub-Delivery");

  if (!signature || !event) {
    return c.json({ error: "Missing signature or event" }, 400);
  }

  const body = await c.req.text();

  // Verify signature
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (secret) {
    const hmac = crypto.createHmac("sha256", secret);
    const digest = `sha256=${hmac.update(body).digest("hex")}`;

    if (signature !== digest) {
      return c.json({ error: "Invalid signature" }, 401);
    }
  }

  const payload = JSON.parse(body);

  // Handle different events
  switch (event) {
    case "pull_request":
      await handlePullRequest(payload);
      break;
    case "push":
      await handlePush(payload);
      break;
    case "ping":
      return c.json({ message: "Pong!", deliveryId: delivery });
    default:
      console.log(`Unhandled GitHub event: ${event}`);
  }

  return c.json({ success: true, event, deliveryId: delivery });
});

// biome-ignore lint/suspicious/noExplicitAny: GitHub webhook payload is dynamic JSON
async function handlePullRequest(payload: any) {
  const action = payload.action;
  const pr = payload.pull_request;

  console.log(`PR ${action}: ${pr.title} (#${pr.number})`);

  if (action === "opened" || action === "synchronize") {
    // Calculate PR cost and post comment
    // This would aggregate costs for all commits in the PR
  }
}

// biome-ignore lint/suspicious/noExplicitAny: GitHub webhook payload is dynamic JSON
async function handlePush(payload: any) {
  const commits = payload.commits || [];

  console.log(`Push: ${commits.length} commits to ${payload.ref}`);

  // Process each commit
  for (const commit of commits) {
    console.log(`Commit: ${commit.id.slice(0, 8)} - ${commit.message}`);
  }
}
