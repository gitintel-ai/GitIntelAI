# GitIntel AI — Product Strategy v1.0

**Date:** 2026-03-14
**Author:** Founding PM
**Status:** Living document

---

## 1. Product Review: Where We Are

### MVP State

All 6 build phases are complete. The following capabilities ship in v0.1.0:

| Capability | What it does | Key commands |
|------------|-------------|--------------|
| **Git proxy** | Transparent wrapper — all `git` subcommands pass through; hooks fire on commit | `gitintel init`, `gitintel hooks` |
| **Line-level attribution** | Records AI vs Human vs Mixed authorship per file at the line range level; stored in `refs/ai/authorship/{sha}` as YAML | `gitintel checkpoint`, `gitintel blame` |
| **AI adoption stats** | Per-repo and per-developer AI% breakdown, filterable by time period | `gitintel stats`, `gitintel stats --developer` |
| **Cost engine** | OTel collector on port 4317 ingests Claude Code token metrics; maps tokens → USD per commit, branch, developer | `gitintel cost --commit`, `--since`, `--branch`, `--developer` |
| **Context optimizer** | Scans repo structure → generates CLAUDE.md; analyzes session transcripts → scores sections by reference frequency → prunes stale content | `gitintel context init`, `context optimize`, `context diff` |
| **Memory store** | SQLite-backed key-value memory with CRUD and CLAUDE.md export | `gitintel memory add/get/list/prune/export` |
| **API server** | Bun + Hono REST API; accepts attribution and cost syncs; exposes team stats, cost summaries, PR webhook annotations | `/api/v1/sync/*`, `/api/v1/stats/*` |
| **Dashboard** | Next.js 14; AI adoption heatmap, cost trend charts, developer leaderboard, budget alert config, PR annotation view | Web at port 3000 |
| **Enterprise** | SAML/OIDC SSO via Auth.js, RBAC with 5 roles, SCIM 2.0 provisioning, audit log, API key management, Docker + Helm self-host | Self-hosted at `infra/docker/` |

### Honest Assessment: What Works, What Doesn't

**Strong:**
- The local-first architecture is genuinely differentiated. Attribution lives in the git repo itself via `refs/ai/authorship/*`. It travels with `git push`, survives clones, and is readable with plain `git notes` — no GitIntel installed. No other tool does this.
- The vendor-agnostic design is correct. The market will fragment across Claude Code, Cursor, Copilot, and Gemini. A tool that only supports one agent will lose.
- The cost engine's OTel approach is the right long-term bet. Claude Code already exports `claude_code.cost.usage` natively. This is not a hack — it's using the intended telemetry channel.
- Enterprise features shipped with the MVP. Most dev tools add SSO/SCIM as a painful afterthought. We have it from day one.

**Weak / Gaps:**
| Gap | Impact | Notes |
|-----|--------|-------|
| Manual `gitintel checkpoint` required | **Critical** — kills organic adoption | Devs will not add a CLI call to every AI session. The product must work passively. |
| No pre-built binaries | **Critical** — blocks all non-Rust devs | Requiring Rust + Cargo to install eliminates >95% of target users from self-serving |
| No public install script | **Critical** — blocks PLG | There is no `curl install \| sh`. The README says "clone and cargo build." That is a demo workflow, not a product workflow. |
| No hosted SaaS | **High** — no Team/Enterprise revenue path | `app.gitintel.ai` is referenced in config but does not exist yet |
| Attribution relies on agent calling checkpoint | **High** — accuracy depends on agent discipline | If a dev uses Cursor and forgets to call `gitintel checkpoint`, the commit is marked 100% Human |
| OTel cost correlation is session-level, not line-level | **Medium** — cost is approximate | Token cost is attributed to the commit that follows an AI session, not to the specific lines changed |

---

## 2. Product Vision

### Problem Statement

AI coding tools (Claude Code, Cursor, Copilot, Gemini Code Assist) are now in the daily workflow of millions of developers. Engineering leaders have adopted them wholesale. But they are flying blind:

- They cannot answer "what percentage of our codebase is AI-written?" with any confidence.
- They have no idea what AI coding actually costs their org — tool subscriptions are visible, but the per-commit, per-developer, per-feature token cost is invisible.
- Their AI context files (CLAUDE.md, Cursor rules, Copilot instructions) grow unchecked, silently burning tokens with every session.

The gap is not a lack of AI tools. It is a lack of **observability** over AI tools. Every production system has APM. Every cloud deployment has cost dashboards. AI-assisted development has nothing.

### The Vision

> GitIntel AI is the **observability layer for AI-assisted software development** — making AI authorship, AI cost, and AI context as transparent and queryable as git history itself.

We are building the tool that engineering leaders reach for when their board asks "what is our AI coding ROI?" — and the tool that devs love because it requires zero workflow change.

### Core Thesis

**AI authorship should live where code lives: in the git history.**

The right data model is not a SaaS database that ingests git events. It is a git-native standard: `refs/ai/authorship/{commit-sha}`. Attribution data that travels with the repo, survives clones and forks, is readable with plain git commands, and requires no proprietary toolchain to consume.

This is not just a technical choice — it is a strategic moat. If `gitintel/1.0.0` becomes the adopted open standard for AI authorship metadata (the way `.gitignore` became standard, or the way Conventional Commits became standard), then GitIntel AI becomes the reference implementation of that standard. Every compliance tool, every code review platform, every CI/CD system that needs to reason about AI code will read our format.

### North Star Metric

**Weekly Active Attribution Repos (WARs)** — repos where at least one commit has been attributed in the last 7 days.

This metric captures whether the product is actually used in real development workflows, not just installed and forgotten. Target: 10,000 WARs within 12 months of public general availability.

Secondary metrics:
- **Attribution coverage rate**: % of commits in an active repo that have attribution data (target: >80% for active users)
- **Team conversion rate**: % of solo installs that expand to team/enterprise within 60 days
- **Cost accuracy**: % of attributed commits where cost data is present (not just authorship)

---

## 3. Target Users and ICP

### User Personas

**Persona 1: The Pragmatic Engineering Lead**
- Title: Engineering Lead, Staff Engineer, Senior Engineering Manager
- Company: 30–300 engineers, Series A–C
- AI usage: Their team uses Claude Code or Cursor daily; they use it themselves
- Pain: Wants to quantify AI impact for their own curiosity and to report upward. Has no data. Tried manually tracking it in a spreadsheet for two weeks and gave up.
- Discovery: Finds GitIntel via HN, Twitter, or a colleague's recommendation
- "Aha" moment: First `gitintel stats --since 30d` output showing per-developer AI% after a single sprint
- Willingness to pay: $0 for personal use; will expense Team tier if it helps them report to their CTO

**Persona 2: The Cost-Conscious CTO**
- Title: CTO, VP Engineering
- Company: 100–500 engineers, post-Series B
- AI usage: Has mandated AI tools org-wide; fielding budget questions from CFO
- Pain: Knows the org is spending on Anthropic/OpenAI API costs somewhere but cannot get a consolidated number. Tool subscription costs are in the budget but per-team token costs are invisible.
- Discovery: Referred by an engineering lead who is already using it, or found via sales outreach
- "Aha" moment: First cost-per-PR breakdown showing a $47 feature branch cost — a number they have never had before
- Willingness to pay: Will buy Enterprise if it gives them the AI ROI story for the board

**Persona 3: The FinOps Analyst**
- Title: FinOps Engineer, Platform Engineer, Senior SRE
- Company: 200+ engineers, cloud-mature org
- AI usage: Not a daily AI coder themselves; responsible for engineering cost visibility
- Pain: Has excellent cloud cost dashboards (AWS Cost Explorer, Datadog). AI tool costs are a blind spot — they see Anthropic invoices but cannot tie them to specific teams, projects, or developers.
- Discovery: Found while looking for AI cost management tooling; the FinOps Foundation community
- "Aha" moment: Budget alert fires when a team crosses the configured daily threshold
- Willingness to pay: Will champion Enterprise purchase if it fills the AI cost visibility gap in their dashboards

**Persona 4: The AI-Heavy Solo Developer**
- Title: Indie developer, freelancer, contractor, open-source maintainer
- AI usage: Heavy — Claude Code or Cursor is their primary coding tool
- Pain: Curious about their own AI usage patterns; wants to optimize their CLAUDE.md to reduce costs
- Discovery: HN, Reddit, Twitter
- "Aha" moment: `gitintel context diff` shows they'd save 40% of tokens by pruning their CLAUDE.md
- Willingness to pay: Free tier; may upgrade if cost savings are quantified

### ICP for Paid (Team Tier)

- **Size**: 20–200 engineers actively using AI coding tools
- **AI adoption stage**: Past "experiments" — AI tools are now standard workflow, not optional
- **Signal**: Engineering leadership actively asking about AI ROI or cost. The question "what are we spending on AI coding?" has been asked in at least one meeting.
- **Tech stack**: Git-based (GitHub, GitLab, or Bitbucket), CI/CD discipline in place
- **Not a fit**: Orgs where AI coding is still banned or restricted by policy; orgs with <5 engineers using AI tools

---

## 4. Competitive Positioning

### Primary Competitor: usegitai.com

usegitai.com is the closest direct competitor. It tracks AI adoption in git commits. Key differentiators:

| Dimension | usegitai.com | GitIntel AI | Why it matters |
|-----------|-------------|-------------|----------------|
| Attribution storage | Proprietary cloud database | Open standard in git refs | Ours travels with the repo; theirs is locked in their system |
| Offline capability | No | 100% offline-first | Privacy-sensitive teams (fintech, defense, healthcare) cannot use a cloud-only tool |
| Agent support | Claude-centric | All agents (same interface) | Cursor, Copilot, and Gemini users are not served by a Claude-only product |
| Self-hostable | No | Yes (Docker + Helm) | Enterprise security requirement — most >500-person eng orgs require self-host option |
| Cost tracking | Unknown | Full OTel-based cost engine | Cost tracking is a separate product category for us; they appear to only do adoption |
| Context optimization | No | Yes (CLAUDE.md optimizer) | Unique capability with real ROI |
| Open source | No | MIT licensed | Open source is required for open standard adoption; it builds community trust |
| Enterprise SSO | Unknown | SAML/OIDC/SCIM from day one | Enterprise deals block on this |

**Positioning against them:** "usegitai.com shows you AI adoption in their dashboard. GitIntel AI tracks it at the source — in the git commit itself — with a standard anyone can read, without sending your code anywhere."

### Adjacent Competitors

**Developer productivity analytics** (LinearB, Waydev, Jellyfish, Swarmia):
- These tools measure velocity, PR cycle time, and deployment frequency — not AI authorship or cost
- We are additive to them, not directly competitive
- Opportunity: become the AI data source these tools consume via our public API

**AI observability** (Langfuse, Helicone, Weights & Biases):
- These tools observe LLM calls at the application layer — prompts, responses, latency, costs in AI products
- We observe AI usage at the developer tool layer — which lines of code were AI-written
- Different problem; no direct competition

**FinOps platforms** (Apptio, Cloudability, Vantage):
- They manage cloud infrastructure costs
- AI coding costs are not yet in their scope — this is a gap we can fill before they notice it
- Our API data could become a feed into their platforms

### Our Defensible Position

The strategic moat is the open standard. Once `refs/ai/authorship/*` is in enough repos, it becomes costly to switch away — the historical attribution data lives in the git history and is only readable by tools that implement the standard. If we define and popularize `gitintel/1.0.0`, we become the reference implementation. Competitors who build on top of our standard are effectively extending our ecosystem.

---

## 5. Roadmap

The roadmap is organized into priority-ordered phases. **No date commitments are made here** — we ship each phase when it is done and done well, not on a calendar. Phases are sequenced by dependency and impact.

### Phase 2: Distribution (Current Priority — P0)

**Why this is first:** The MVP is functionally complete. The product cannot grow until it is installable in 30 seconds by any developer on any machine. Everything else is blocked on this.

**What done looks like:**
- A developer on macOS with no Rust installed can install gitintel in under 2 minutes
- A developer on Ubuntu with no Rust installed can install gitintel in under 2 minutes
- A developer on Windows can install gitintel in under 3 minutes
- The README install section says `curl -fsSL https://gitintel.ai/install | sh` — and it works

| Item | Priority | Acceptance criteria |
|------|----------|---------------------|
| Pre-built binaries: Linux x64, Linux ARM64, macOS x64 (Intel), macOS ARM64 (Apple Silicon), Windows x64 | P0 | All 5 targets build and pass smoke tests in CI on every release tag |
| GitHub Releases pipeline — auto-publish binaries on `git tag v*` | P0 | CI creates release with all 5 binary artifacts and checksums within 10 min of a version tag |
| One-liner install script (`curl -fsSL https://gitintel.ai/install \| sh`) | P0 | Script detects OS/arch, downloads correct binary, installs to PATH, prints version — tested on clean macOS, Ubuntu, Windows (WSL) |
| Homebrew tap (`brew install gitintel-ai/tap/gitintel`) | P1 | `brew install` works on macOS and Linux; tap is in public GitHub repo `gitintel-ai/homebrew-tap` |
| npm wrapper (`npm install -g @gitintel/cli`) | P1 | `npm install -g` downloads and installs the correct pre-built binary for the user's platform; does not require Rust |
| gitintel.ai marketing site | P1 | Landing page with value prop, install instructions, demo GIF, link to docs — live before any public announcement |
| `gitintel update` self-update command | P2 | Checks GitHub releases, downloads and replaces binary in-place, verifies checksum |

### Phase 3: Automatic Attribution (Next — P1)

**Why this is second:** Manual `gitintel checkpoint` is the largest adoption friction after install. If devs must call a CLI command after every AI session, the product will only be used by the disciplined few. Attribution must happen automatically.

**What done looks like:**
- A developer using Claude Code with gitintel installed sees accurate attribution with zero extra steps after `gitintel init`
- A developer using Cursor sees attribution for at least 80% of AI-written lines without manual checkpoints

| Item | Priority | Acceptance criteria |
|------|----------|---------------------|
| Claude Code auto-checkpoint via `PostToolUse` hooks in `~/.claude/settings.json` | P0 | After `gitintel init`, Claude Code sessions automatically call `gitintel checkpoint` for every `Write`/`Edit` tool use; verified in integration test |
| Git diff semantic analysis — infer AI-written hunks at commit time when no checkpoint exists | P0 | When a commit has no checkpoint data, analyzer compares diff to known AI code patterns and flags likely-AI lines with `[??]` confidence; accuracy >70% on test corpus |
| VS Code extension — auto-checkpoint for GitHub Copilot | P1 | Extension available in VS Code Marketplace; Copilot completions auto-recorded; no manual steps after one-time extension setup |
| Cursor integration — parse `.cursor/` session data for automatic attribution | P1 | After `gitintel init`, Cursor sessions are auto-detected and attributed without `gitintel checkpoint` |
| `gitintel checkpoint --auto` daemon mode — watches for AI session signals and records continuously | P2 | Background process monitors for active agent sessions and records to SQLite without user action |

### Phase 4: Team Intelligence (Follows Distribution + Auto-Attribution)

**Why this is third:** Individual value drives install. Team value drives payment. This phase makes gitintel a tool that engineering leads show in standups and CTOs put in board decks.

| Item | Priority | Acceptance criteria |
|------|----------|---------------------|
| Hosted SaaS at `app.gitintel.ai` — cloud sync target for Team tier | P0 | Accepting sign-ups; `gitintel sync` sends attribution + cost data; team dashboard live |
| PR cost annotation — GitHub App and GitLab integration | P0 | PR has a comment/status check showing: AI%, lines attributed, total session cost, model used |
| Sprint/milestone cost rollup — GitHub Projects, Linear, Jira | P1 | API endpoint `/api/v1/stats/project?project_id=X` returns aggregated cost + attribution for a set of commits |
| Budget forecasting — "at current burn rate, team spends $X by month-end" | P1 | Dashboard shows trajectory line based on last 14 days; alert fires at 80% of configured threshold |
| `by_model` and `by_agent` breakdowns in all `cost` and `stats` outputs | P1 | `gitintel cost --since 7d --format json` includes `by_model` and `by_agent` breakdown fields |
| Anomaly detection — flag unusually expensive commits | P2 | Alert fires when a single commit cost exceeds 3× the 30-day average commit cost |
| Team benchmark — compare team AI% vs. industry anonymized aggregate | P2 | Dashboard shows "your team is in the Xth percentile for AI adoption" using anonymized aggregate across all opted-in GitIntel installs |

### Phase 5: Platform and Ecosystem

**Why this comes last:** Platform value compounds on top of product value. We build this when we have enough installs and team usage that other tools want to integrate with us — not before.

| Item | Priority | Acceptance criteria |
|------|----------|---------------------|
| Public API — read attribution and cost data programmatically | P0 | Versioned REST API (`/api/v1/`) with API key auth; `GET /attribution/{repo}/{sha}`, `GET /stats/team`, `GET /cost/summary`; OpenAPI spec published |
| Webhooks — `attribution.created`, `cost.threshold_exceeded`, `budget.alert` | P0 | Configurable webhook endpoints; signed payloads; retried on failure; documented |
| MCP server — expose attribution data as MCP tools | P1 | `gitintel mcp serve` starts a local MCP server; agents can call `get_attribution(file, line_range)` and `get_cost(commit_sha)` |
| Attribution standard v2.0 — multi-agent sessions, partial attribution, model comparison | P1 | Schema updated to support multiple agent sessions per commit; backwards-compatible with v1.0 |
| Compliance reports — AI usage evidence for SOC2 / ISO 27001 audits | P2 | Report export (PDF + JSON) showing AI authorship % over period, models used, cost; formatted for audit evidence packages |
| `gitintel attribution strip` — redact AI attribution from git refs | P2 | Command removes `refs/ai/authorship/*` from local repo and optionally remote; adds audit log entry |

---

## 6. GTM Strategy

### Principles

1. **Developer-led growth first.** The buying persona (CTO, VP Eng) is a former developer. They trust tools that developers love, not tools that account executives pitch. The product must win at the command line before it wins in a budget cycle.
2. **Open source as distribution.** MIT license, public repo, open standard. Developers are deeply skeptical of proprietary vendor lock-in for tooling that lives in their git workflow. Open source removes that objection entirely.
3. **PLG with an enterprise ceiling.** The Free tier is generous — solo developers, unlimited local use, all core features. Paid tiers unlock cloud sync and team visibility. Enterprise unlocks SSO, SCIM, self-host, and compliance features. The ceiling is high enough to support a real business.
4. **Standard adoption is the long game.** The biggest GTM bet is not user acquisition — it is getting `gitintel/1.0.0` adopted by other tools. Every CI/CD platform, every code review tool, and every compliance platform that implements the standard extends our distribution.

### Tier 1: Free (Solo Developer)

**What's included:**
- All CLI commands: `gitintel init`, `checkpoint`, `blame`, `stats`, `cost`, `context`, `memory`
- Local SQLite storage — unlimited repos, unlimited commits
- All attribution and cost tracking — fully local
- Git hooks — all integrations
- CLAUDE.md optimizer

**Limit:**
- No cloud sync
- No team dashboard
- No GitHub/GitLab PR annotations
- Local only

**Purpose:** Maximum spread. Every solo developer who installs gitintel is a potential expansion into a team purchase. They are also a vector for the open standard — every public repo with `refs/ai/authorship/*` is a demonstration that the standard exists.

### Tier 2: Team ($20/seat/month, min 3 seats)

**What's included (on top of Free):**
- Cloud sync to `app.gitintel.ai`
- Hosted team dashboard — AI adoption heatmap, cost trends, developer leaderboard
- GitHub App + GitLab integration — PR cost annotations and AI% status checks
- Budget alerts (email + webhook)
- Sprint cost rollup (GitHub Projects, Linear integration)
- 90-day data retention
- Email support

**Target buyer:** Engineering Lead, Engineering Manager, or CTO at a 5–50 engineer team where 3+ developers use AI tools daily.

**Pricing rationale:** $20/seat/month is below the cost of a single developer's Anthropic API spend for a busy week. The value proposition is "we save you more than we cost" via context optimization alone.

### Tier 3: Enterprise (Custom pricing, typically $30–50/seat/month)

**What's included (on top of Team):**
- Self-hosted deployment (Docker Compose or Helm/K8s)
- SAML/OIDC SSO (Okta, Azure AD, Ping Identity, any SAML 2.0 IdP)
- SCIM 2.0 user provisioning
- RBAC with custom roles
- Full audit log — all API mutations, all data access
- Unlimited data retention
- API key management for CI/CD
- SLA (99.9% uptime)
- Dedicated Slack channel + named CSM
- Compliance report export (SOC2, ISO 27001 evidence)
- Air-gapped deployment support

**Target buyer:** CTO or VP Engineering at 100–1000 engineer company with existing SSO infrastructure and security review requirements.

**Land and expand:** Land with a single team (Team tier). When the team's manager shares the dashboard with their VP, the VP asks "can we roll this out org-wide?" That is the enterprise conversation.

### Launch Sequence

The following steps must happen in this order before any public announcement:

1. **Pre-built binaries + install script** — nothing else matters until these exist
2. **gitintel.ai landing page** — must be live before announcing
3. **Demo repo** — public GitHub repo with real attribution history, showing all three use cases
4. **Written launch content** — "Show HN" post drafted; Twitter/X thread ready; one long-form blog post ("We tracked 6 weeks of Claude Code usage. Here's what we found.")
5. **Beta feedback** — at least 10 developers have installed and used it from the binary; at least 3 have given written feedback

**Launch channels, in order of expected impact:**

| Channel | Post | Expected outcome |
|---------|------|-----------------|
| Hacker News — Show HN | "Show HN: GitIntel — track AI adoption + cost inside your git history" | Highest quality developer audience; if it hits front page, generates 500–2,000 installs in 48 hours |
| Twitter/X | Thread with demo GIF showing `gitintel stats` output | Developer community amplification; retweets by AI tool communities |
| r/programming | Same demo GIF + write-up | Secondary reach; good for long-tail discovery |
| r/ClaudeAI, r/cursor | Specific angle for each community | Targeted reach into AI coding tool communities |
| LinkedIn | Written post from founder account targeting CTOs/VPs | Business buyer awareness |
| Anthropic ecosystem | Get listed on Claude Code docs as a community integration | Passive acquisition from Claude Code users |

### Metrics by Stage

| Stage | Primary metric | Target |
|-------|---------------|--------|
| Pre-launch | Beta installs, bug reports | 10 beta users, <5 critical bugs |
| Launch week | GitHub stars, install script downloads | 500 stars, 200 unique installs |
| Month 1 | Weekly Active Attribution Repos (WARs) | 100 WARs |
| Month 3 | WARs, first paid conversions | 500 WARs, 5 paying teams |
| Month 6 | WARs, MRR | 2,000 WARs, $10K MRR |
| Month 12 | WARs, MRR, enterprise logos | 10,000 WARs, $100K MRR, 3 enterprise contracts |

---

## 7. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Manual checkpoint friction kills organic adoption | High | High | Phase 3 (auto-attribution) is P1 immediately after Phase 2 distribution |
| Claude Code ships native adoption/cost tracking, removing our value prop | Medium | High | Open standard + multi-agent support is our moat; Claude Code cannot track Cursor or Copilot |
| usegitai.com raises and out-executes | Medium | Medium | Move fast on distribution and standard adoption; open source prevents being shut out |
| Privacy objections slow enterprise sales | Medium | Medium | Local-first architecture is the answer; no code or prompts leave the machine without explicit config |
| Attribution accuracy is too low to trust | Low | High | Phase 3 semantic analysis + Claude Code hooks achieves >90% accuracy for Claude Code users; Phase 2 provides honest accuracy metrics in the output |
| Developer abandons after install due to missing auto-attribution | High | High | Reduce time to "auto-attribution moment" — this is why Phase 3 follows immediately after Phase 2 |

---

## 8. Open Questions (Decisions Needed)

1. **Pricing model**: Per-seat vs. per-repo vs. per-commit? Per-seat is simplest and most familiar to buyers. Per-repo may work better for small teams with many repos.
2. **Attribution standard governance**: Should we form a working group to steward `gitintel/1.0.0`? Anthropic, GitHub, and GitLab are natural collaborators. Open governance accelerates standard adoption but slows decision-making.
3. **Hosted SaaS vs. self-serve first**: Should `app.gitintel.ai` launch with a waitlist and white-glove onboarding, or fully self-serve? Self-serve scales; white-glove gives better feedback. Recommended: fully self-serve with an optional "request a demo" path for enterprise.
4. **Auto-attribution accuracy bar**: What % accuracy is acceptable to ship Phase 3? 70%? 90%? A system that is 70% accurate but clearly labeled is better than no system. Propose: ship at 70% with clear confidence labeling; target 90% within 2 follow-up releases.

---

*Owned by Founding PM. Next formal review: after Phase 2 (Distribution) ships.*
