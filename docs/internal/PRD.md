# PRD: GitIntel AI — v1.0 (MVP)

## Problem
Engineering teams adopting AI coding agents have zero visibility into:
- **How much** of their codebase is AI-generated vs human-written
- **What it costs** in tokens/dollars to ship each feature or PR
- **Where context bloat** is burning tokens unnecessarily

## Target Users
| Tier        | User              | Pain                                       |
|-------------|-------------------|--------------------------------------------|
| Solo        | AI-heavy dev      | Wants to track personal AI usage + cost    |
| Team        | Engineering Lead  | Wants per-developer AI adoption metrics    |
| Enterprise  | CTO/FinOps        | Wants org-wide AI ROI + cost governance    |

## MVP Scope (Week 1)

### Use Case 1: AI Adoption Tracking
**Goal:** After every `git commit`, know exactly which lines were AI-generated, by which agent/model.

**Requirements:**
- FR-1.1: CLI acts as git proxy — `gitintel` replaces `git` transparently
- FR-1.2: Coding agents call `gitintel checkpoint --agent "Claude Code" --model "claude-opus-4-5"` to log line ownership
- FR-1.3: On `git commit`, post-commit hook writes Authorship Log to `refs/ai/authorship/{sha}`
- FR-1.4: `gitintel blame <file>` shows line-level AI/Human attribution (extends git blame)
- FR-1.5: `gitintel stats` shows repo-level breakdown: % AI, % Human, % Mixed
- FR-1.6: `gitintel stats --developer <email>` shows per-developer breakdown
- FR-1.7: Attribution preserved through rebase, merge, cherry-pick, squash

### Use Case 2: Cost Tracking
**Goal:** Know the exact dollar cost of every commit, PR, feature branch, and developer session.

**Requirements:**
- FR-2.1: Capture OTel telemetry from Claude Code (tokens + cost per session)
- FR-2.2: Link OTel session data to git commit sha (correlation by timestamp + project)
- FR-2.3: `gitintel cost --commit <sha>` shows cost breakdown for a commit
- FR-2.4: `gitintel cost --since 7d` shows weekly cost summary
- FR-2.5: `gitintel cost --developer <email>` shows per-developer spend
- FR-2.6: `gitintel cost --branch <name>` shows cost to develop a feature branch
- FR-2.7: Cost attribution supports Claude, OpenAI, Gemini, Copilot model pricing tables
- FR-2.8: SQLite local storage with optional cloud sync to PostgreSQL

### Use Case 3: Context & Memory Management
**Goal:** Automatically generate and optimize CLAUDE.md/context files to minimize token usage.

**Requirements:**
- FR-3.1: `gitintel context init` — generates CLAUDE.md from repo analysis (structure, stack, patterns)
- FR-3.2: `gitintel context optimize` — analyzes recent sessions, prunes redundant context sections
- FR-3.3: `gitintel context diff` — shows token cost before vs after optimization
- FR-3.4: Context scoring: % of tokens in CLAUDE.md that actually influenced AI decisions
- FR-3.5: `gitintel memory` — manages persistent memory store (key facts about the codebase)
- FR-3.6: Auto-generate per-directory CLAUDE.md with locally-relevant context only
- FR-3.7: Memory compression: summarizes old sessions into compact facts

## Post-MVP (Week 2–4)

### Web Dashboard
- Team-level adoption heatmaps (per developer, per repo, per sprint)
- Cost trend charts (daily/weekly/monthly spend)
- PR-level cost annotations (GitHub/GitLab webhook integration)
- Budget alerts (Slack/email when team crosses cost threshold)

### Enterprise Features
- SSO (SAML/OIDC via Auth.js)
- RBAC (admin, manager, developer roles)
- Self-hosted deployment (Docker Compose + Helm chart)
- Audit logs for compliance
- API keys for CI/CD integration
- SCIM provisioning

## Non-Functional Requirements
- NFR-1: CLI startup time < 50ms (Rust binary)
- NFR-2: git proxy overhead < 10ms per operation
- NFR-3: Local SQLite writes < 5ms per commit
- NFR-4: Dashboard p95 query < 200ms
- NFR-5: Zero network calls without explicit opt-in

## Pricing Model (Post-MVP)
| Tier       | Price           | Limits                          |
|------------|-----------------|--------------------------------|
| Solo       | Free            | 1 user, unlimited repos        |
| Team       | $29/dev/month   | Up to 50 devs, cloud sync      |
| Enterprise | Custom          | Self-host, SSO, audit, SCIM    |
