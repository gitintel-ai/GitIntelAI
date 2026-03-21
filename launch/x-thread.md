# X/Twitter Launch Thread

## Tweet 1 (Hook)

I analyzed my Claude Code usage. 43% of my code is AI-generated. Here's how I measured it.

I built an open-source tool that adds AI authorship tracking to git -- line by line, commit by commit.

It's called GitIntel.

[thread]

## Tweet 2 (Stats screenshot)

Here's what `gitintel stats --since 30d` looks like:

[Screenshot: terminal showing stats output]
```
AI Adoption Stats: Repository
Period: last 30d
────────────────────────────────────────────────
Total Commits:  142
Total Lines:    18,340

AI-Generated:   [████████████████░░░░░░░░░░░░░░] 43.2%
                7,923 lines
Human-Written:  [██████████████████████░░░░░░░░] 56.8%
                10,417 lines

Total Cost:     $47.23

By Developer:
────────────────────────────────────────────────
alice@acme.com    [██████████████████░░░] 61.0% (38 commits, $18.40)
bob@acme.com      [██████████░░░░░░░░░░] 34.5% (52 commits, $14.72)
carol@acme.com    [████████████░░░░░░░░] 40.1% (52 commits, $14.11)
```

Per developer. Per agent. Per time period. Zero workflow change.

## Tweet 3 (The problem)

The problem: `git blame` tells you who committed the code.

But was it the developer who wrote it? Or was it Claude Code / Cursor / Copilot?

Right now there's no standard way to know. Your git history treats AI-generated code identically to human-written code.

That's a blind spot for every engineering team.

## Tweet 4 (Blame screenshot)

`gitintel blame` fixes this. Every line gets a marker:

[Screenshot: terminal showing blame output]
```
AI Blame: src/api.ts
   1 [AI] dc69ba8  Alice Chen  export async function createUser(
   2 [AI] dc69ba8  Alice Chen    data: CreateUserInput,
   3 [AI] dc69ba8  Alice Chen  ) {
  ...
  55 [AI] dc69ba8  Alice Chen  }
  56 [HU] dc69ba8  Alice Chen  // Hand-written validation
  57 [HU] dc69ba8  Alice Chen  function validateEmail(email: string) {
  58 [HU] dc69ba8  Alice Chen    return EMAIL_RE.test(email);
  59 [HU] dc69ba8  Alice Chen  }
```

[AI] = AI-generated | [HU] = Human-written | [MX] = Mixed

Now you can actually see what the AI wrote vs what the developer wrote.

## Tweet 5 (Open standard)

The key design decision: attribution is stored as standard git notes in `refs/ai/authorship/<sha>`.

- No cloud required
- No vendor lock-in
- Readable with plain `git notes` -- no GitIntel needed
- Travels with `git push`
- YAML schema, fully documented

Any tool can read and write to this ref. I want this to become a shared standard, not a proprietary format.

## Tweet 6 (Cost tracking)

Cost tracking was the feature I didn't expect to use so much.

My Claude Code spend last month: $47 across 142 commits. Average $0.33/commit.

`gitintel cost --since 7d` breaks it down by developer, model, and agent. Pulls from Claude Code's native OpenTelemetry metrics.

Finally know what AI coding actually costs per sprint.

## Tweet 7 (CTA)

GitIntel is:
- MIT licensed
- Written in Rust
- Local SQLite, no cloud
- Works with Claude Code, Cursor, Copilot, Codex, Gemini, Windsurf

Zero-setup mode: just run `gitintel scan` on any repo.

Show me your AI% -- I'm curious what others are seeing.

https://github.com/gitintel-ai/GitIntelAI
