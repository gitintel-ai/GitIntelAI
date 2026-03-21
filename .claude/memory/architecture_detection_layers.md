---
name: Detection Layer Priority
description: How GitIntel detects AI code — 4 layers from zero-setup (trailers) to manual (checkpoint)
type: reference
---

<!-- L0 -->
4 detection layers: Co-Authored-By trailers > IDE hooks > git diff heuristics > manual checkpoint.

<!-- L1 -->
- Layer 1 (highest): Co-Authored-By trailer parsing — zero setup, works retroactively on any repo
- Layer 2: IDE hooks (Claude Code PostToolUse, future Cursor/Copilot) — line-level precision
- Layer 3: Git diff heuristic analysis — style-based detection (future, not built)
- Layer 4: Manual gitintel checkpoint — explicit, last resort
- Conflict resolution: higher layer wins per file/line
- Confidence: trailers=0.85, hooks=0.95, heuristic=0.40, manual=0.95

<!-- L2 -->
See packages/cli/src/trailer_detection.rs, known_agents.rs, claude_hooks.rs
