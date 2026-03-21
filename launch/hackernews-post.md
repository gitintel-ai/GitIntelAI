# Show HN: GitIntel -- the missing "git blame" for AI-generated code

**Title:** Show HN: GitIntel -- the missing "git blame" for AI-generated code

**URL:** https://github.com/gitintel-ai/GitIntelAI

**Body:**

I use Claude Code daily. Last month I tried to answer a simple question: "What percentage of my codebase was written by AI?" I couldn't. `git blame` shows who committed the code, but it doesn't tell you whether that person wrote it or their AI agent did.

So I built GitIntel. It's a Rust CLI that tracks AI authorship at the line level, right inside your git history.

**How it works:**

- `gitintel scan` -- zero-setup scan of any repo. Detects `Co-Authored-By` trailers, agent signatures, and commit patterns. Works without installing hooks.
- `gitintel blame src/api.ts` -- like `git blame`, but each line is tagged `[AI]`, `[HU]` (human), `[MX]` (mixed), or `[??]` (unknown).
- `gitintel stats --since 30d` -- AI adoption percentage, lines by agent, breakdown per developer.
- `gitintel cost --since 7d` -- total spend, avg cost per commit, cost per developer. Pulls from Claude Code's native OpenTelemetry export.

**The open standard part is what I care about most.** Attribution is stored in `refs/ai/authorship/<sha>` as YAML -- standard git notes. You can read them with plain `git notes` even without GitIntel installed:

```
git notes --ref=refs/ai/authorship show HEAD
```

No cloud. No vendor lock-in. Data lives in the repo itself and travels with `git push`.

Works with Claude Code, Cursor, Copilot, Codex, Gemini, Windsurf -- any agent. The `--agent` flag is a free-form string.

**Tech:** Rust, MIT license, local SQLite, ~4MB binary. No telemetry, no cloud requirement.

I'd love feedback on the attribution standard specifically (`specs/02-attribution-std.md` in the repo). If other tools adopted the same `refs/ai/authorship` convention, we could have a universal way to track AI code provenance across the industry. What's missing from the schema?

https://github.com/gitintel-ai/GitIntelAI
