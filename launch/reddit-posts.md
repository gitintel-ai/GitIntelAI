# Reddit Launch Posts

---

## r/programming

**Title:** I built a "git blame" for AI-generated code -- tracks which lines were written by Claude, Cursor, Copilot, etc.

**Body:**

`git blame` tells you who committed each line. But it doesn't tell you whether that person wrote it or their AI agent did.

I built GitIntel to solve this. It's a Rust CLI that adds AI authorship tracking to your git history, at the line level.

**What it does:**

- `gitintel scan` -- zero-setup scan of any repo. Detects `Co-Authored-By` trailers and agent signatures automatically.
- `gitintel blame src/api.ts` -- like `git blame`, but lines are tagged `[AI]`, `[HU]`, `[MX]`, or `[??]`.
- `gitintel stats --since 30d` -- AI adoption %, lines by agent, breakdown by developer.
- `gitintel cost` -- what your AI coding tools actually cost per commit/sprint/developer.

**How attribution is stored:**

This is the part I think matters most. Attribution goes into `refs/ai/authorship/<sha>` as YAML -- standard git notes. You can read it with plain `git notes` without GitIntel installed:

```bash
git notes --ref=refs/ai/authorship show HEAD
```

No cloud, no vendor lock-in. The data lives in the repo and travels with `git push`. I documented the schema at `specs/02-attribution-std.md` and would love feedback from anyone who's thought about this problem.

Tech: Rust, MIT, local SQLite, ~4MB binary. No telemetry.

https://github.com/gitintel-ai/GitIntelAI

---

## r/ClaudeAI

**Title:** I built a tool that tracks exactly how much of your code Claude Code writes -- line by line, commit by commit

**Body:**

I've been using Claude Code heavily for the past few months. At some point I realized I had no idea what percentage of my codebase Claude had written vs what I'd written myself. `git blame` just shows my name on everything.

So I built GitIntel. It's an open-source CLI that adds AI attribution to your git history.

**For Claude Code specifically:**

- Detects `Co-Authored-By: Claude` trailers automatically -- just run `gitintel scan` on any repo
- Pulls cost data from Claude Code's native OpenTelemetry export (`CLAUDE_CODE_ENABLE_TELEMETRY=1`)
- Tracks token usage (input, output, cache) and cost per commit
- Shows you exactly which lines Claude wrote with `gitintel blame`

After scanning my main project: 43% AI-generated, $47 spend across 142 commits last month.

The attribution is stored as standard git notes (`refs/ai/authorship`), so it lives in the repo itself -- no cloud, no account needed.

Written in Rust, MIT licensed. Zero workflow change -- you keep committing normally.

Anyone else curious what their Claude Code % is? Just clone and run `gitintel scan`.

https://github.com/gitintel-ai/GitIntelAI

---

## r/cursor

**Title:** Track how much of your code Cursor writes vs what you write yourself (open-source CLI)

**Body:**

Built a tool called GitIntel that tracks AI authorship in git repos at the line level. Works with Cursor, Claude Code, Copilot, and any other agent.

The core idea: `git blame` shows who committed the code, but not whether the developer or their AI wrote it. GitIntel adds that missing layer.

**How it works with Cursor:**

- Run `gitintel scan` on any repo -- detects Cursor session data and commit patterns
- `gitintel blame` shows `[AI]` / `[HU]` markers per line
- `gitintel stats` gives you your AI adoption percentage over time

No workflow change required. You keep using Cursor and committing normally. GitIntel reads the signals from your git history.

Attribution is stored as git notes (open standard), not in any cloud service. Fully local, fully offline.

Rust CLI, MIT license, ~4MB binary.

https://github.com/gitintel-ai/GitIntelAI

Curious what AI% Cursor users are seeing -- I'd guess it's higher than Claude Code for tab-completion-heavy workflows.

---

## r/devops

**Title:** Finally have visibility into AI coding costs per developer/sprint/team -- built an open-source CLI for it

**Body:**

We started using Claude Code and Cursor across the team 3 months ago. Leadership asked: "What's the ROI? What are we actually spending?" I couldn't answer either question.

Built GitIntel to fix this. It's a Rust CLI that tracks AI authorship and cost at the commit level.

**What it gives you:**

```
Cost Summary: last 7d
──────────────────────────────────────────────────
Total Spend:     $47.23
Commits:         142
Avg Cost/Commit: $0.33
AI Code Lines:   7,923 / 18,340 (43.2%)
──────────────────────────────────────────────────
By Developer:
  alice@acme.com     $18.40  (38 commits, 61.0% AI)
  bob@acme.com       $14.72  (52 commits, 34.5% AI)
  carol@acme.com     $14.11  (52 commits, 40.1% AI)
```

- Cost per developer, per sprint, per agent
- AI adoption % trending over time
- Zero-setup: `gitintel scan` works on any existing repo
- Integrates with Claude Code's native OpenTelemetry export

**For CI/CD:** Attribution is stored in `refs/ai/authorship` -- standard git notes. You can query it from any pipeline, build custom dashboards, or export as NDJSON.

No cloud dependency. Local SQLite. Runs anywhere git runs.

Rust, MIT, open source: https://github.com/gitintel-ai/GitIntelAI

---

## r/ExperiencedDevs

**Title:** How do you measure AI coding ROI? I built an open-source tool to answer "what % of our code is AI-generated"

**Body:**

Genuine question for other leads/principals: how are you measuring AI coding tool adoption and ROI?

My situation: team of 8, everyone using Claude Code or Cursor, $200-400/month in API costs. CFO asks "is it worth it?" I had no data.

`git blame` shows the committer, but doesn't distinguish between code the developer wrote and code their AI agent generated. So I built GitIntel -- a CLI that tracks AI authorship at the line level using git notes.

After instrumenting our repos:

- 38-43% of recent code is AI-generated (varies by developer)
- Average cost: $0.33 per commit
- Senior devs have lower AI% but higher-quality AI usage (fewer reverts)
- Junior devs have higher AI% but more back-and-forth (higher token spend per feature)

The interesting finding wasn't the percentage itself -- it was the variance. Some developers use AI for boilerplate and tests (high AI%, low cost, high value). Others use it for architecture (low AI%, high cost, debatable value).

The tool is open-source (Rust, MIT). Attribution is stored as standard git notes, no cloud, no vendor lock-in. The data lives in the repo.

Not pitching this as a monitoring/surveillance tool -- I think the value is in giving teams and individuals visibility into how they're using AI, the same way we track velocity or test coverage.

Curious: for those of you measuring this in any way, what metrics matter most? Lines of code feels insufficient but it's a start.

https://github.com/gitintel-ai/GitIntelAI
