# GitIntel Launch Timeline

---

## Day -7 (Tuesday): Prep Starts

- [ ] Finalize README -- ensure install instructions work on all platforms
- [ ] Record 2-minute terminal demo GIF (init, scan, blame, stats, cost)
- [ ] Verify `gitintel scan` works on 5 popular open-source repos (Next.js, LangChain, Astro, Hono, Polars)
- [ ] Set up GitHub repo metadata: description, topics, social preview image
- [ ] Create gitintel.com landing page (or ensure GitHub README is strong enough to stand alone)
- [ ] Pre-build binaries for Linux x86_64, macOS arm64, macOS x86_64, Windows x86_64

## Day -5 (Thursday): Content Prep

- [ ] Write HN post (from hackernews-post.md) -- finalize wording
- [ ] Write X thread (from x-thread.md) -- prepare screenshots
- [ ] Write Reddit posts (from reddit-posts.md) -- save as drafts
- [ ] Prepare terminal screenshots for X thread (use a clean terminal theme, large font)
- [ ] Have 1-2 trusted devs try the tool and give feedback before public launch

## Day -3 (Saturday): Dry Run

- [ ] Test install script on fresh machines (Docker containers for Linux, friend's Mac)
- [ ] Run through Quick Start flow end to end -- fix any friction
- [ ] Prepare FAQ document for common objections (privacy, surveillance concerns, accuracy)
- [ ] Pre-write responses to likely HN comments (skepticism about accuracy, "why not just grep for Co-Authored-By")

## Day -1 (Monday): Final Check

- [ ] All pre-built binaries uploaded to GitHub Releases
- [ ] Install scripts tested one more time
- [ ] GitHub Issues templates ready (bug report, feature request)
- [ ] CONTRIBUTING.md is welcoming and clear
- [ ] All links in README work
- [ ] Tag a v0.1.0-beta release on GitHub

---

## Day 0 (Tuesday): Launch Day

### 8:00 AM EST -- Hacker News
- [ ] Submit Show HN post
- [ ] Title: "Show HN: GitIntel -- the missing 'git blame' for AI-generated code"
- [ ] URL: https://github.com/gitintel-ai/GitIntelAI
- [ ] Body: from hackernews-post.md

### 8:00 AM - 12:00 PM EST -- Monitor HN
- [ ] Respond to every comment within 30 minutes
- [ ] Be technical, honest about limitations, and grateful for feedback
- [ ] If asked about accuracy: be upfront that zero-setup scan is heuristic, full accuracy requires checkpoints
- [ ] If asked about privacy/surveillance: emphasize local-first, developer-owned data, MIT license

### 10:00 AM EST -- X/Twitter Thread
- [ ] Post the 7-tweet thread (from x-thread.md)
- [ ] Include terminal screenshots (not just code blocks)
- [ ] Do NOT tag anyone in the initial thread -- let it stand on its own

### Throughout Day 0
- [ ] Monitor GitHub stars, issues, and traffic
- [ ] Fix any installation issues reported within 1 hour
- [ ] Thank early adopters publicly

---

## Day 1 (Wednesday): Reddit

### Staggered Posting (2-hour gaps between posts)
- [ ] 9:00 AM EST -- r/programming (broadest audience)
- [ ] 11:00 AM EST -- r/ClaudeAI (most aligned audience)
- [ ] 1:00 PM EST -- r/ExperiencedDevs (leadership angle)
- [ ] 3:00 PM EST -- r/cursor (Cursor-specific)
- [ ] 5:00 PM EST -- r/devops (ops/cost angle)

### Reddit Engagement Rules
- [ ] Respond to every comment
- [ ] Never be defensive about criticism
- [ ] Upvote good questions and competing tool suggestions
- [ ] If someone suggests a feature, create a GitHub Issue and link it

---

## Day 2-3 (Thursday-Friday): Follow-Up Engagement

### Day 2
- [ ] Continue responding to HN/Reddit threads (they stay active 24-48h)
- [ ] Publish a follow-up comment on HN with learnings: "Based on feedback, here's what we're prioritizing..."
- [ ] If any bugs were reported, ship fixes and post updates
- [ ] Submit to newsletters: TLDR, Console.dev, Changelog, DevOps Weekly (via official forms)

### Day 3
- [ ] Write a short "launch retro" thread on X: what worked, what surprised you, early stats
- [ ] Engage with anyone who posted their own `gitintel scan` results
- [ ] Start collecting "AI%" data points from early users (with permission)
- [ ] Create a GitHub Discussion thread: "Share your AI% -- what does your repo look like?"

---

## Day 7 (Next Tuesday): Research Blog Post

- [ ] Publish "I analyzed 50 open-source repos and found X% of recent code is AI-generated"
- [ ] Publish on personal blog + cross-post to dev.to
- [ ] Share on X with 3-4 chart screenshots, tag Simon Willison, Swyx, ThePrimeagen (max 3)
- [ ] Submit to HN as a separate post (not Show HN -- this is research, not a product launch)
- [ ] Post on r/programming and r/ExperiencedDevs
- [ ] Submit to Pointer.io and other curated newsletters
- [ ] Publish raw dataset (CSV/JSON) alongside the article

---

## Day 10-14: Sustained Momentum

### Day 10
- [ ] Review all GitHub issues and feature requests -- prioritize top 3
- [ ] Ship at least one user-requested feature (quick win)
- [ ] Post update on X: "You asked for X, it's shipped"

### Day 14: Retrospective
- [ ] Compile launch metrics:
  - GitHub stars
  - npm downloads / binary downloads
  - HN points and rank
  - Reddit upvotes across all posts
  - X thread impressions and engagement
  - Newsletter features
  - GitHub issues opened
  - Contributors who submitted PRs
- [ ] Write internal retrospective: what worked, what didn't, what to do differently
- [ ] Decide on next launch moment (v0.2.0 feature release? VS Code extension? Research blog sequel?)
- [ ] If Changelog or Latent Space engagement happened, follow up on podcast pitch

---

## Timing Notes

**Why Tuesday 8 AM EST for HN:**
- HN traffic peaks Tuesday-Thursday
- 8 AM EST catches the East Coast morning + gives time for West Coast to see it by their morning
- Avoid Monday (noisy) and Friday (low engagement)
- Avoid weekends for launch (OK for Reddit follow-ups)

**Why stagger Reddit posts:**
- Posting to 5 subreddits simultaneously looks spammy
- 2-hour gaps let you engage deeply with each thread
- Start with r/programming (biggest, sets the tone)

**Why delay the research blog to Day 7:**
- First wave (HN/Reddit/X) establishes the tool exists
- Second wave (research blog) provides a reason to revisit
- Newsletters have 3-7 day lead times -- submissions on Day 2-3 may publish around Day 7-10
- Two distinct waves of attention > one big splash that fades
