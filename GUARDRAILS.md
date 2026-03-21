# GUARDRAILS — Safety Constraints for GitIntel Development

Rules that must be checked before every code change. This file grows as we learn from failures.

## Hard Rules (Never Override)

- TRIGGER: About to modify the attribution standard format (refs/ai/authorship schema)
  ACTION: Stop. This requires an RFC and version bump. Never change in a feature PR.
  REASON: The attribution standard is an open format. Breaking changes affect all users.

- TRIGGER: About to store or transmit source code, prompts, or transcripts
  ACTION: Verify it's opt-in only. Default must be OFF.
  REASON: Privacy-first is a core invariant. Violating this destroys trust.

- TRIGGER: About to add a cloud/network dependency to the CLI
  ACTION: Ensure the feature works 100% offline. Cloud must be opt-in.
  REASON: Local-first is a core invariant.

- TRIGGER: About to modify claude_hooks.rs or any PostToolUse handler
  ACTION: Ensure all errors are swallowed gracefully. Never break the developer's workflow.
  REASON: A hook that crashes or slows git commit will be immediately uninstalled.

- TRIGGER: About to add a new Cargo dependency
  ACTION: Check if existing deps can solve it. Justify the addition in the PR.
  REASON: Binary size and compile time matter for a CLI tool.

- TRIGGER: About to change the git notes storage path (refs/ai/authorship)
  ACTION: Stop. This is the foundation of the open standard.
  REASON: Changing storage paths breaks all existing attribution data.

- TRIGGER: About to modify the SQLite schema
  ACTION: Write a migration. Never alter existing tables — add new ones or columns.
  REASON: Users have existing databases. Schema changes must be backwards-compatible.

- TRIGGER: About to change the tech stack (Rust CLI, Bun+Hono server, Next.js dashboard)
  ACTION: Stop. Tech stack is marked FIXED in CLAUDE.md. Requires CEO approval.
  REASON: Stack decisions are locked to avoid churn.

- TRIGGER: About to hardcode API keys, tokens, or secrets
  ACTION: Never. Use env vars or config files with .gitignore protection.
  REASON: Secrets in source = instant security incident.

- TRIGGER: About to change OTel metric names or schema (claude_code.token.usage, etc.)
  ACTION: Stop. These match Claude Code's native export format.
  REASON: Changing metric names breaks telemetry ingestion for all deployments.

## Soft Rules (Use Judgment)

- TRIGGER: Adding a new CLI subcommand
  ACTION: Check if it fits naturally in the existing command hierarchy. Keep the surface area small.
  REASON: Too many commands = cognitive overhead for users.

- TRIGGER: Test is flaky or fails intermittently
  ACTION: Fix the flaky test before moving on. Don't skip or ignore.
  REASON: Flaky tests erode trust in the test suite.

- TRIGGER: Changing default behavior of an existing command
  ACTION: Consider backwards compatibility. Use flags for new behavior.
  REASON: Existing users and scripts depend on current behavior.

- TRIGGER: Adding vendor-specific logic (Claude-only, Copilot-only)
  ACTION: Abstract behind a trait/interface. Keep the core vendor-agnostic.
  REASON: Vendor-agnostic is a core invariant. Vendor lock-in kills adoption.

- TRIGGER: CLI command takes >200ms for a local-only operation
  ACTION: Profile and optimize. Users expect CLI tools to be instant.
  REASON: Slow CLI = users bypass it or uninstall.

- TRIGGER: Adding a new config option
  ACTION: Ensure sensible defaults. The tool should work with zero config.
  REASON: No workflow change is a core invariant.

- TRIGGER: Writing error messages for the CLI
  ACTION: Make them actionable. Include what went wrong AND how to fix it.
  REASON: Cryptic errors cause support load and user churn.

- TRIGGER: Dashboard API endpoint returning user-level data
  ACTION: Ensure proper auth scoping. Users must only see their own data unless admin.
  REASON: Enterprise customers will audit this.

## Learned Constraints (Added Over Time)

<!-- Add new rules here as failures occur -->
<!-- Format: date, trigger, action, reason, incident reference -->

- 2026-03-21: Overlapping checkpoint line ranges caused >100% AI attribution
  TRIGGER: Summing line ranges from multiple checkpoints
  ACTION: Always merge/deduplicate overlapping ranges before computing totals
  REASON: Bug showed 119% AI / -19% Human — instantly destroys user trust

- 2026-03-21: Claude hooks marked entire files as AI-written
  TRIGGER: PostToolUse handler computing line ranges
  ACTION: Parse tool_input to determine actual changed lines, not full file length
  REASON: A 3-line edit in a 500-line file was marking all 500 as AI
