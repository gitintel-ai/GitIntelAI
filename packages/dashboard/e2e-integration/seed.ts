/**
 * Database seed script for integration E2E tests.
 *
 * Seeds a Postgres DB with realistic test data so Playwright can run
 * against the real API server + dashboard with meaningful responses.
 *
 * Usage: DATABASE_URL=... bun run e2e-integration/seed.ts
 */

import postgres from "postgres";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:test@localhost:5432/gitintel_test";
const sql = postgres(DATABASE_URL);

// Fixed UUIDs for deterministic tests
const ORG_ID = "00000000-0000-0000-0000-000000000001";
const REPO_ID = "00000000-0000-0000-0000-000000000010";
const USER_ALICE_ID = "00000000-0000-0000-0000-000000000100";
const USER_BOB_ID = "00000000-0000-0000-0000-000000000101";

async function seed() {
  console.log("Seeding integration test database...");

  // Clean existing data (reverse FK order)
  await sql`DELETE FROM cost_sessions WHERE repo_id = ${REPO_ID}`;
  await sql`DELETE FROM attributions WHERE repo_id = ${REPO_ID}`;
  await sql`DELETE FROM budget_alerts WHERE org_id = ${ORG_ID}`;
  await sql`DELETE FROM repositories WHERE org_id = ${ORG_ID}`;
  await sql`DELETE FROM users WHERE organization_id = ${ORG_ID} OR org_id = ${ORG_ID}`;
  await sql`DELETE FROM organizations WHERE id = ${ORG_ID}`;

  // Organization
  await sql`
    INSERT INTO organizations (id, name, settings_json)
    VALUES (${ORG_ID}, 'Acme Corp', '{"plan": "team"}')
  `;

  // Users
  await sql`
    INSERT INTO users (id, email, name, clerk_id, organization_id, org_id, role, status)
    VALUES
      (${USER_ALICE_ID}, 'alice@acme.com', 'Alice Chen', 'clerk_alice', ${ORG_ID}, ${ORG_ID}, 'admin', 'active'),
      (${USER_BOB_ID}, 'bob@acme.com', 'Bob Smith', 'clerk_bob', ${ORG_ID}, ${ORG_ID}, 'developer', 'active')
  `;

  // Repository
  await sql`
    INSERT INTO repositories (id, org_id, name, remote_url, default_branch)
    VALUES (${REPO_ID}, ${ORG_ID}, 'frontend-app', 'https://github.com/acme/frontend-app', 'main')
  `;

  // Attributions (10 commits across both developers)
  const now = new Date();
  const attributions = [];
  for (let i = 0; i < 10; i++) {
    const isAlice = i % 2 === 0;
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const aiLines = 20 + i * 5;
    const humanLines = 30 + i * 3;
    const totalLines = aiLines + humanLines;
    attributions.push({
      repo_id: REPO_ID,
      commit_sha: `${"abcdef0123456789".repeat(3).slice(0, 38)}${i.toString().padStart(2, "0")}`,
      author_email: isAlice ? "alice@acme.com" : "bob@acme.com",
      authored_at: date.toISOString(),
      ai_lines: aiLines,
      human_lines: humanLines,
      total_lines: totalLines,
      ai_pct: parseFloat(((aiLines / totalLines) * 100).toFixed(1)),
      total_cost_usd: parseFloat((0.01 + i * 0.005).toFixed(4)),
    });
  }

  for (const a of attributions) {
    await sql`
      INSERT INTO attributions (repo_id, commit_sha, author_email, authored_at, ai_lines, human_lines, total_lines, ai_pct, total_cost_usd)
      VALUES (${a.repo_id}, ${a.commit_sha}, ${a.author_email}, ${a.authored_at}, ${a.ai_lines}, ${a.human_lines}, ${a.total_lines}, ${a.ai_pct}, ${a.total_cost_usd})
    `;
  }

  // Cost sessions (matching the attributions)
  for (let i = 0; i < 10; i++) {
    const isAlice = i % 2 === 0;
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const agent = isAlice ? "Claude Code" : "Cursor";
    const model = isAlice ? "claude-sonnet-4-5" : "gpt-4o";
    await sql`
      INSERT INTO cost_sessions (session_id, repo_id, commit_sha, agent, model, started_at, ended_at, tokens_in, tokens_out, tokens_cache, cost_usd)
      VALUES (
        ${"session-" + i},
        ${REPO_ID},
        ${`${"abcdef0123456789".repeat(3).slice(0, 38)}${i.toString().padStart(2, "0")}`},
        ${agent},
        ${model},
        ${date.toISOString()},
        ${new Date(date.getTime() + 300_000).toISOString()},
        ${1000 + i * 200},
        ${500 + i * 100},
        ${200 + i * 50},
        ${parseFloat((0.01 + i * 0.005).toFixed(4))}
      )
    `;
  }

  // Budget alerts
  await sql`
    INSERT INTO budget_alerts (org_id, type, threshold_usd, channels_json, enabled)
    VALUES
      (${ORG_ID}, 'daily', 10.00, '{"email": ["alerts@acme.com"]}', true),
      (${ORG_ID}, 'weekly', 50.00, '{"slack": "#eng-costs"}', true)
  `;

  console.log("Seed complete:");
  console.log("  - 1 organization");
  console.log("  - 2 users (Alice, Bob)");
  console.log("  - 1 repository");
  console.log("  - 10 attributions");
  console.log("  - 10 cost sessions");
  console.log("  - 2 budget alerts");

  await sql.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
