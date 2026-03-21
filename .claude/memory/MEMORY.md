# GitIntel Memory Index

## Architecture Decisions
- [Attribution Standard](architecture_attribution_standard.md) — Why git notes, open format, refs/ai/authorship path
- [Rust CLI](architecture_rust_cli.md) — Why Rust over Go/Node, single binary, cross-platform
- [Detection Layers](architecture_detection_layers.md) — Priority system: Co-Authored-By > IDE hooks > heuristics > manual

## Learned Lessons
- [Overlapping Ranges Bug](lesson_overlapping_ranges.md) — Checkpoint deduplication, >100% AI fix
- [Whole File Marking Bug](lesson_whole_file_marking.md) — Claude hooks must parse tool_input, not mark full files

## Project Context
- [npm Org](project_npm_org.md) — @gitintel-cli/gitintel (gitintel and gitintel-ai were taken)
- [Domain](project_domain.md) — gitintel.com is canonical, not gitintel.ai
