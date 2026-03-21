---
name: Overlapping Ranges Bug
description: Multiple checkpoints for same file caused >100% AI attribution — fixed with range merging
type: reference
---

<!-- L0 -->
Bug: overlapping checkpoint ranges were summed without dedup, causing 119% AI / -19% Human.

<!-- L1 -->
- Root cause: post_commit.rs summed all checkpoint line ranges per file without merging overlaps
- Example: checkpoint 1 covers lines 1-50, checkpoint 2 covers lines 1-80 → counted as 130 lines in 80-line file
- Fix: merge_ranges() function sorts by start, merges overlapping/adjacent ranges, returns unique total
- Location: packages/cli/src/hooks/post_commit.rs
- 9 unit tests added covering all edge cases

<!-- L2 -->
Discovered 2026-03-21. Added as learned constraint in GUARDRAILS.md.
