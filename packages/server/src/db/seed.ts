/**
 * Seed script — populates the database with realistic test data.
 * Run: cd packages/server && bun run seed
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { attributions, budgetAlerts, costSessions, organizations, repositories } from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

// ── Helpers ──────────────────────────────────────────────────────
function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number) {
  return Math.floor(randomBetween(min, max));
}

function randomDate(daysAgo: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - Math.random() * daysAgo);
  d.setHours(randomInt(8, 20), randomInt(0, 59), randomInt(0, 59));
  return d;
}

function randomSha(): string {
  return Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

const agents = ["Claude Code", "Cursor", "GitHub Copilot"];
const models = ["claude-opus-4-5", "claude-sonnet-4-5", "gpt-4o", "claude-haiku-3.5"];

// ── Seed ─────────────────────────────────────────────────────────
async function seed() {
  console.log("Seeding database...");

  // 1. Organization
  const [org] = await db.insert(organizations).values({ name: "Acme Corp" }).returning();
  console.log(`  Created org: ${org.name} (${org.id})`);

  // 2. Repositories (3)
  const repoData = [
    { name: "frontend-app", remoteUrl: "https://github.com/acme/frontend-app" },
    { name: "api-server", remoteUrl: "https://github.com/acme/api-server" },
    { name: "mobile-app", remoteUrl: "https://github.com/acme/mobile-app" },
  ];

  const repos = await db
    .insert(repositories)
    .values(
      repoData.map((r) => ({
        orgId: org.id,
        name: r.name,
        remoteUrl: r.remoteUrl,
        defaultBranch: "main",
      })),
    )
    .returning();
  console.log(`  Created ${repos.length} repositories`);

  // 3. Developers (5 emails)
  const developers = [
    "alice@acme.com",
    "bob@acme.com",
    "carol@acme.com",
    "dave@acme.com",
    "eve@acme.com",
  ];

  // 4. Attributions (~50, last 30 days)
  const attrValues = [];
  for (let i = 0; i < 50; i++) {
    const repo = repos[randomInt(0, repos.length)];
    const dev = developers[randomInt(0, developers.length)];
    const aiLines = randomInt(5, 200);
    const humanLines = randomInt(5, 200);
    const totalLines = aiLines + humanLines;
    const aiPct = (aiLines / totalLines) * 100;
    const costUsd = Number(randomBetween(0.1, 5.0).toFixed(4));

    attrValues.push({
      repoId: repo.id,
      commitSha: randomSha(),
      authorEmail: dev,
      authoredAt: randomDate(30),
      aiLines,
      humanLines,
      totalLines,
      aiPct,
      totalCostUsd: costUsd,
    });
  }
  await db.insert(attributions).values(attrValues);
  console.log(`  Created ${attrValues.length} attributions`);

  // 5. Cost sessions (~50, last 30 days)
  const sessionValues = [];
  for (let i = 0; i < 50; i++) {
    const repo = repos[randomInt(0, repos.length)];
    const agent = agents[randomInt(0, agents.length)];
    const model = models[randomInt(0, models.length)];
    const started = randomDate(30);
    const ended = new Date(started.getTime() + randomInt(60, 3600) * 1000);
    const tokensIn = randomInt(500, 5000);
    const tokensOut = randomInt(200, 3000);
    const tokensCache = randomInt(0, 1000);
    const costUsd = Number(randomBetween(0.05, 4.0).toFixed(4));

    sessionValues.push({
      sessionId: `sess_${randomSha().slice(0, 16)}`,
      repoId: repo.id,
      commitSha: randomSha(),
      agent,
      model,
      startedAt: started,
      endedAt: ended,
      tokensIn,
      tokensOut,
      tokensCache,
      costUsd,
    });
  }
  await db.insert(costSessions).values(sessionValues);
  console.log(`  Created ${sessionValues.length} cost sessions`);

  // 6. Budget alerts (3)
  const alertValues = [
    {
      orgId: org.id,
      type: "daily",
      thresholdUsd: 25.0,
      channelsJson: { email: ["alerts@acme.com"] },
      enabled: true,
    },
    {
      orgId: org.id,
      type: "weekly",
      thresholdUsd: 150.0,
      channelsJson: { slack: "https://hooks.slack.com/services/T00/B00/xxx" },
      enabled: true,
    },
    {
      orgId: org.id,
      type: "monthly",
      thresholdUsd: 500.0,
      channelsJson: { email: ["finance@acme.com"] },
      enabled: false,
    },
  ];
  await db.insert(budgetAlerts).values(alertValues);
  console.log(`  Created ${alertValues.length} budget alerts`);

  console.log("Seed complete!");
  await client.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
