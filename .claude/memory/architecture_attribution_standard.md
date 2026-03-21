---
name: Attribution Standard Design
description: Why we use git notes at refs/ai/authorship — open format, travels with push, no cloud required
type: reference
---

<!-- L0 -->
Attribution stored in git notes at refs/ai/authorship/{sha}. Open standard, git-native, vendor-agnostic.

<!-- L1 -->
- Format: YAML schema (gitintel/1.0.0)
- Storage: git notes at refs/ai/authorship/{full-commit-sha}
- Readable without GitIntel installed (plain git notes show)
- Travels with git push/fetch
- Alternatives considered: .gitintel/ directory (rejected — pollutes working tree), external DB (rejected — not git-native)

<!-- L2 -->
Full schema documented in specs/02-attribution-std.md and CLAUDE.md
