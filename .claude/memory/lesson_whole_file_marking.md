---
name: Whole File Marking Bug
description: Claude hooks marked entire files as AI-written instead of just changed lines
type: reference
---

<!-- L0 -->
Bug: claude_hooks.rs line_range_for() returned 1-{total_lines}, marking all lines as AI on every edit.

<!-- L1 -->
- Root cause: line_range_for() read the file and returned full range regardless of what changed
- Fix: Parse tool_input JSON for actual changed content
  - Edit: find new_string position in file, return exact range
  - MultiEdit: process each edit, return comma-separated ranges
  - Write: diff against HEAD for existing files, full range for new files only
- Graceful fallback: if parsing fails, falls back to old behavior (never crashes)
- Location: packages/cli/src/claude_hooks.rs

<!-- L2 -->
Discovered 2026-03-21. Key principle: PostToolUse hooks must NEVER break developer workflow.
