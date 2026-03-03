# Spec 05: Web Dashboard — Team AI Analytics

## Stack
- **Framework:** Next.js 14 App Router
- **UI:** shadcn/ui + Tailwind CSS
- **Charts:** Recharts
- **Auth:** Clerk (JWT, OAuth, SSO ready)
- **State:** Zustand + React Query (TanStack Query v5)
- **API Client:** auto-generated from OpenAPI spec (openapi-typescript)

## Route Structure
```
app/
├── (auth)/
│   ├── sign-in/page.tsx
│   └── sign-up/page.tsx
├── (dashboard)/
│   ├── layout.tsx              ← sidebar + header shell
│   ├── page.tsx                ← org overview (redirect to /team)
│   ├── team/page.tsx           ← Team AI Adoption Dashboard
│   ├── cost/page.tsx           ← Cost Intelligence
│   ├── developers/
│   │   ├── page.tsx            ← Developer Leaderboard
│   │   └── [id]/page.tsx       ← Individual Developer Profile
│   ├── repos/
│   │   ├── page.tsx            ← Repository List
│   │   └── [id]/page.tsx       ← Per-Repo Analytics
│   ├── prs/page.tsx            ← PR Cost Annotations
│   ├── context/page.tsx        ← Context Optimization Panel
│   └── settings/
│       ├── alerts/page.tsx     ← Budget Alerts
│       ├── integrations/page.tsx ← GitHub/GitLab/Slack
│       └── team/page.tsx       ← Team Members + RBAC
└── api/
    └── webhooks/
        └── github/route.ts     ← GitHub webhook handler
```

## Page Specs

### /team — Team AI Adoption Dashboard
**Primary chart:** Heatmap (Developer × Week × AI%)
```
Component: <AdoptionHeatmap />
X-axis: Last 12 weeks (week labels)
Y-axis: Developers (sorted by AI% desc)
Cell color: 0% = gray, 100% = blue (linear scale)
Cell tooltip: "Week of Mar 2 | Arunoday: 67.4% AI | 23 commits | $4.20"

Filters:
- Date range picker (last 4w / 12w / 6m / 1y / custom)
- Repository multi-select
- Agent filter (Claude Code / Copilot / All)

KPI cards above heatmap:
- Org AI%: [XX%] ↑3.2% vs last period
- Total Commits: [XXXX]  
- AI-Generated Lines: [XXX,XXX]
- Total AI Spend: [$XXX.XX]
```

### /cost — Cost Intelligence
**Primary chart:** Stacked bar (Daily spend by model)
```
Component: <CostTrendChart />
X-axis: Date
Y-axis: USD
Stacks: Claude Opus | Claude Sonnet | Copilot | Gemini | Other
Overlay line: 7-day rolling average

Secondary section: Cost breakdown table
Columns: Developer | Commits | Input Tokens | Output Tokens | Cache Tokens | Total Cost
Sortable, paginated (20 rows default)

Tertiary section: Cost per feature
Requires GitHub integration — groups commits by PR → shows PR cost
```

### /developers/[id] — Developer Profile
```
Sections:
1. Hero stats: AI% | Cost this month | Commits | Streak
2. AI adoption trend (line chart, last 90 days)
3. Cost breakdown by model (donut chart)
4. Top repositories by AI usage (bar chart)
5. Recent commits table with cost + AI% per commit
6. Context efficiency score (tokens saved by context optimization)
```

### /context — Context Optimization Panel
```
For each repository the user has access to:
- CLAUDE.md token count + last optimized date
- Section-by-section score table (name | tokens | score | action)
- Token savings estimate if optimized
- "Optimize Now" button → triggers gitintel context optimize via API
- Memory store viewer (list/edit/delete facts)
- Cost savings counter: "Saved $X.XX this month via context optimization"
```

### /settings/alerts — Budget Alerts
```
Form fields:
- Daily spend limit (per developer): $__
- Weekly spend limit (per team): $__
- Monthly spend limit (per org): $__
- Alert channels: Slack webhook URL | Email addresses
- Alert on: [x] 80% threshold | [x] 100% threshold | [ ] every $10

Current alerts panel shows:
- Last 10 alert events with timestamp + amount + channel notified
```

## Component Library (shadcn/ui components used)
```
Card, CardHeader, CardContent     ← KPI cards
Table, TableHeader, TableRow      ← data tables
Select, MultiSelect               ← filters
DateRangePicker                   ← date filter
Badge                             ← AI% badges, model tags
Tooltip                           ← chart tooltips
Sheet                             ← mobile sidebar
Dialog                            ← confirmation dialogs
Switch                            ← feature toggles
Progress                          ← loading states
Skeleton                          ← loading placeholders
```

## API Integration Layer
```typescript
// lib/api.ts — typed API client
import createClient from "openapi-fetch";
import type { paths } from "./api-types"; // generated from OpenAPI spec

export const api = createClient<paths>({
  baseUrl: process.env.NEXT_PUBLIC_API_URL,
});

// Usage in server components
const { data: teamStats } = await api.GET("/api/v1/stats/team", {
  params: { query: { period: "7d", repo: repoId } }
});

// Usage in client components (React Query)
const { data } = useQuery({
  queryKey: ["cost", "summary", period],
  queryFn: () => api.GET("/api/v1/cost/summary", { params: { query: { period } } })
});
```

## GitHub PR Integration
When GitHub webhook is configured, each PR gets a comment:
```
## 🤖 GitIntel AI — PR Cost Report

| Metric | Value |
|--------|-------|
| AI-generated lines | 234 / 412 (56.8%) |
| Total token cost | $0.142 |
| Primary agent | Claude Code (claude-opus-4-5) |
| Cache efficiency | 34% (saved $0.048) |

**Commits:** 8 | **Files changed:** 12 | **Review time estimate:** 18 min
```

## Performance Requirements
- Initial page load (LCP): < 1.5s
- Dashboard data fetch: < 200ms (server component)
- Chart render (1000 data points): < 100ms
- Heatmap render (50 devs × 52 weeks): < 200ms
