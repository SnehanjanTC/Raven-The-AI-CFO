# FinOS Production Roadmap

**Product:** AI CFO for Solo Founders
**Timeline:** 4-6 weeks (solo founder)
**Stack:** React 19 + TypeScript, Anthropic Claude, Supabase, Vercel
**Architecture:** Chat-first conversational UI with inline financial cards

---

## Pre-work: Codebase Audit (Day 1)

Before writing any new code, take stock of what exists and what stays.

### Current state
- 92 source files, ~24,600 LOC
- 11 pages, 17 components, 54 backend files
- 6 Supabase tables, 4 AI providers configured

### Target state
- ~30-40 source files, ~10,000-12,000 LOC
- 1 conversational view, ~8-10 card components, ~10-15 backend files
- 4-5 Supabase tables, 1 AI provider (Claude)

---

## Week 1: Strip and Scaffold (Days 1-7)

The goal this week is to remove everything you're not shipping and set up the new chat-first architecture. No new features — just a clean foundation.

### 1.1 Delete dead code

**Files to remove entirely:**

Frontend pages (cut):
- `src/pages/Agents.tsx` (627 lines) — agent orchestration, not shipping
- `src/pages/Memory.tsx` (428 lines) — SIF Memory Bank, cut
- `src/pages/Integrations.tsx` (1,201 lines) — OAuth hub, cut
- `src/pages/Settings.tsx` (481 lines) — multi-provider config, replace with minimal modal
- `src/pages/Home.tsx` (912 lines) — onboarding checklist, replace with conversational onboarding
- `src/pages/Copilot.tsx` (562 lines) — separate copilot page, merging into main view

Frontend components (cut):
- `src/components/AgentDetail.tsx` (335 lines)
- `src/components/CreateAgentForm.tsx` (197 lines)
- `src/components/AgentWorkspace.tsx` (767 lines)
- `src/components/Sidebar.tsx` (274 lines) — replacing with minimal top bar
- `src/components/compliance/` — all 4 files (~1,765 lines) — defer to post-launch
- `src/components/CFOFloatingTrigger.tsx` (111 lines) — no longer needed, chat is always visible
- `src/components/EXAMPLES.tsx` (371 lines)

Backend files (cut):
- `backend/app/api/zohobooks.py` (456 lines) — integration hub, cut
- `backend/app/api/zohomcp.py` (887 lines) — integration hub, cut
- `backend/app/api/integrations.py` (191 lines) — OAuth flows, cut
- `backend/app/api/team.py` (249 lines) — multi-tenant team management, cut
- `backend/app/api/compliance.py` (337 lines) — defer to post-launch
- All compliance-related models and schemas
- All integration-related models and schemas
- All team-related models and schemas

**Estimated removal: ~9,000-10,000 lines**

### 1.2 Simplify AI provider to Claude only

- [ ] Remove `VITE_GEMINI_API_KEY`, `VITE_OPENAI_API_KEY`, `VITE_GROK_API_KEY` from env
- [ ] Remove Google Generative AI SDK dependency (`@google/generative-ai`)
- [ ] Rename `VITE_ANTHROPIC_API_KEY` to `VITE_CLAUDE_API_KEY`
- [ ] Rewrite `backend/app/api/ai_proxy.py` — strip multi-provider switching logic, single Claude endpoint
- [ ] Update `AIChatSidebar.tsx` (394 lines) — remove provider selection UI, hardcode Claude
- [ ] Update `CFOCopilot.tsx` (621 lines) — same cleanup, this becomes the foundation for the new chat view

### 1.3 Scaffold the new chat-first layout

- [ ] Create `src/layouts/ChatLayout.tsx` — the new main layout:
  - Minimal top bar: logo, runway status pill, "Upload CSV" button, user avatar
  - Full-width conversational view (centered, max-width 680px)
  - Persistent input bar at bottom with suggestion chips
  - No sidebar, no page navigation
- [ ] Create `src/components/chat/` directory for the card system (empty for now)
- [ ] Update `App.tsx` router — collapse 11 routes into:
  - `/login` — simplified login (keep existing, remove sign-up company fields)
  - `/` — the main chat view (authenticated)
  - That's it. Two routes.

### 1.4 Simplify database schema

- [ ] Keep tables: `metrics`, `transactions`, `reports`, `activity_log`
- [ ] Drop or archive: `agents` table (no longer managing multiple agents), `scenarios` table (scenarios become ephemeral chat responses, not persisted entities)
- [ ] Add new table: `conversations` — stores chat history
  - `id`, `user_id`, `created_at`, `title` (auto-generated)
- [ ] Add new table: `messages` — individual messages
  - `id`, `conversation_id`, `role` (user/assistant), `content`, `card_data` (JSONB for rendered cards), `created_at`
- [ ] Add column to `metrics`: `source` (manual/csv) to track data provenance
- [ ] Write migration SQL, test on Supabase staging project

**End of week 1 deliverable:** The app loads, shows a login screen, and renders an empty chat view with a top bar and input field. Nothing works yet — but the architecture is clean.

---

## Week 2: Core Chat Engine + Cards (Days 8-14)

This is the hardest week. You're building the conversational engine and the card component system that renders financial data inline.

### 2.1 Build the Claude chat engine

- [ ] Create `src/hooks/useChat.ts` — core chat hook:
  - Manages message history (local state + Supabase persistence)
  - Streams Claude responses via the backend proxy
  - Handles tool use / function calling for financial queries
  - Manages loading, error, and retry states
- [ ] Create `backend/app/api/chat.py` — new unified chat endpoint:
  - `POST /api/v1/chat` — accepts message + conversation history
  - Streams Claude response with SSE (Server-Sent Events)
  - System prompt includes user's current financial context (latest metrics, recent transactions)
  - Claude tool definitions for: `get_metrics`, `run_scenario`, `get_transactions`, `generate_report`
- [ ] Create `src/services/claude.ts` — frontend streaming client:
  - SSE connection to `/api/v1/chat`
  - Parse streamed tokens + tool call results
  - Handle reconnection on network failure

### 2.2 Build the financial card system

Create reusable card components that the chat renders inline when Claude returns structured data.

- [ ] `src/components/cards/MetricsCard.tsx`
  - 3-column grid: MRR, burn, runway (or any 2-4 metrics)
  - Each metric: label, value, delta with up/down indicator
  - Optional mini sparkline chart below
  - Props: `metrics: Array<{label, value, delta, trend}>`

- [ ] `src/components/cards/ScenarioCard.tsx`
  - Header with scenario title + risk badge
  - Comparison rows: current → projected values
  - Action buttons: "Adjust", "Compare another", "Save to reports"
  - Props: `scenario: {title, risk, comparisons[], actions[]}`

- [ ] `src/components/cards/ChartCard.tsx`
  - Recharts-based responsive chart (line/bar/area)
  - Title, time range selector, legend
  - Renders MRR trends, expense breakdowns, cash flow
  - Props: `chart: {type, title, data[], series[]}`

- [ ] `src/components/cards/TransactionListCard.tsx`
  - Compact table: date, description, category, amount
  - Shows last N transactions with "show more" expansion
  - Category color coding
  - Props: `transactions: Array<Transaction>, limit?: number`

- [ ] `src/components/cards/ReportCard.tsx`
  - Preview of a generated report (board update, P&L summary)
  - "Export as PDF" / "Export as XLSX" buttons
  - Props: `report: {title, type, sections[], exportFormats[]}`

- [ ] `src/components/cards/NudgeCard.tsx`
  - Three variants: alert (something changed), insight (AI noticed something), tip (unused feature)
  - Icon, message, action buttons
  - Dismissible
  - Props: `nudge: {type, message, actions[], dismissible}`

### 2.3 Wire up the message renderer

- [ ] Create `src/components/chat/MessageRenderer.tsx`:
  - Parses Claude responses for both text and tool call results
  - Text → rendered as markdown (keep `react-markdown` + `remark-gfm`)
  - Tool results → mapped to the appropriate card component
  - User messages → simple styled bubble
- [ ] Create `src/components/chat/SuggestionChips.tsx`:
  - Renders 3-4 contextual suggestions below the input
  - Chips are returned by Claude as part of each response (via a `suggestions` field in the tool response)
  - Clicking a chip sends it as a user message
- [ ] Create `src/components/chat/InputBar.tsx`:
  - Text input with send button
  - File drop zone for CSV upload (visual indicator)
  - Keyboard shortcuts: Enter to send, Shift+Enter for newline
  - Disabled state while Claude is streaming

### 2.4 Build the system prompt

- [ ] Create `backend/app/core/system_prompt.py`:
  - Base persona: "You are the AI CFO for {company_name}..."
  - Inject current financial context: latest metrics snapshot, last 30 days of transactions summary, account balance
  - Tool definitions with clear descriptions so Claude knows when to call each
  - Response format instructions: when to render cards vs. plain text
  - Proactive behavior rules: always end with a follow-up suggestion, flag anomalies unprompted
  - Suggestion chip generation: include 3-4 contextual next-step suggestions with every response

**End of week 2 deliverable:** You can type a question, Claude streams a response with inline financial cards. Metrics, scenarios, and transaction cards render correctly. Suggestion chips appear. Data is still mock/seed data.

---

## Week 3: Data Pipeline + Onboarding (Days 15-21)

Now make it real — actual data flowing in, and a first-run experience that doesn't require a tutorial.

### 3.1 CSV import system

- [ ] Create `src/components/CSVUploader.tsx`:
  - Drag-and-drop zone (also triggered from top bar "Upload CSV" button)
  - File type validation (.csv only, max 5MB for free tier)
  - Preview first 5 rows before confirming import
  - Column mapping UI: auto-detect date, description, amount, category columns
  - Handle common bank export formats (Chase, Mercury, Brex, generic)
- [ ] Create `backend/app/api/csv.py`:
  - `POST /api/v1/csv/upload` — receives CSV, returns parsed preview
  - `POST /api/v1/csv/confirm` — commits parsed data to transactions table
  - Duplicate detection: skip rows that match existing transactions by date+amount+description
  - Category auto-classification: use Claude to categorize uncategorized transactions in batch
- [ ] Create `backend/app/services/csv_parser.py`:
  - Detect delimiter (comma, tab, semicolon)
  - Parse dates flexibly (MM/DD/YYYY, YYYY-MM-DD, DD-Mon-YY, etc.)
  - Normalize amounts (handle negatives, currency symbols, parenthetical negatives)
  - Return structured preview with confidence scores for column mapping

### 3.2 Manual data entry via chat

- [ ] Add tool: `update_metrics` — Claude can update MRR, burn, cash balance when user tells it numbers conversationally
  - "My MRR is $24k and I have $300k in the bank" → Claude calls `update_metrics` → metrics table updated → confirmation card rendered
- [ ] Add tool: `add_transaction` — Claude can log individual transactions
  - "I just paid $2,400 for Vercel this month" → Claude calls `add_transaction` → transaction logged → confirmation shown
- [ ] Both tools require user confirmation before writing (Claude proposes, user confirms via card button)

### 3.3 Conversational onboarding (first-run experience)

- [ ] Detect new user (no metrics, no transactions in DB)
- [ ] Override suggestion chips with onboarding-specific options:
  - "Upload a bank statement" | "I'll type in my numbers" | "Show me a demo"
- [ ] First AI message: personalized greeting with the 3-step onboarding card
  - Step 1: Get basic numbers (revenue, expenses, cash)
  - Step 2: Upload CSV or enter manually
  - Step 3: Ask your first question
- [ ] "Show me a demo" path: populate with realistic seed data, let them explore, then prompt to enter real numbers
- [ ] Track onboarding progress in user metadata (Supabase auth user metadata field)

### 3.4 Metrics computation engine

- [ ] Create `backend/app/services/metrics.py`:
  - Compute from transaction data: monthly revenue, monthly expenses, net burn, runway
  - MRR calculation: sum of recurring revenue transactions (requires category tagging)
  - Burn rate: trailing 3-month average of expenses
  - Runway: cash balance / monthly net burn
  - Month-over-month deltas for all metrics
- [ ] Create `backend/app/services/context_builder.py`:
  - Builds the financial context injected into Claude's system prompt
  - Pulls latest metrics, recent transactions, computed trends
  - Formats as structured text Claude can reference
  - Refreshes on every chat request (always current)

**End of week 3 deliverable:** New users get a conversational onboarding flow. CSV upload works for common bank formats. Users can tell Claude their numbers and see them reflected in metrics cards. The AI has real financial context.

---

## Week 4: Proactive Intelligence + Polish (Days 22-28)

This week is about making the AI feel smart — not just responsive, but anticipatory. Plus visual polish.

### 4.1 Proactive session opener

- [ ] Create `backend/app/services/proactive.py`:
  - Runs on session start (user opens app)
  - Compares current metrics to last session's metrics
  - Detects anomalies: expense spikes (>20% MoM), revenue drops, runway changes
  - Generates 1-3 nudges ranked by urgency
  - Returns structured nudge data for `NudgeCard` rendering
- [ ] The first message in every session is AI-initiated, not a blank screen
  - Morning: "Good morning. Your MRR grew 8% — here's your snapshot" + MetricsCard
  - Alert: "Your burn jumped 12%. Biggest driver: new $2.4k Vercel charge" + NudgeCard
  - Calm: "Everything looks stable. Runway is 14 months. Anything you want to explore?" + suggestion chips

### 4.2 Evolving suggestion chips

- [ ] Create `backend/app/services/suggestions.py`:
  - Generates contextual chips based on three signals:
    1. **Data signals** — what changed in their financials (new transactions, metric shifts)
    2. **History signals** — what they ask frequently (track query patterns in messages table)
    3. **Gap signals** — features they haven't used yet (no scenarios run? suggest one)
  - Returns 4 chips per response, with at most 1 "gap" chip (marked with green dot)
  - Chip text is natural language, not menu items ("What if churn doubles?" not "Run scenario")
- [ ] Chips are generated by Claude as part of each response (included in tool response format)
- [ ] Track feature usage in user metadata: `{scenarios_run: 0, reports_generated: 0, csvs_uploaded: 1}`

### 4.3 "What can you do?" capability card

- [ ] Create `src/components/cards/CapabilityCard.tsx`:
  - 2x2 grid of capability tiles
  - Each tile: title, description, "try" prompt, locked/unlocked state
  - Locked capabilities show what data is needed to unlock them
  - Triggered when user asks "what can you do?" / "help" / "?"
- [ ] Capabilities are dynamic based on user's data:
  - Has transactions → "Spot problems" is unlocked
  - Has 3+ months of data → "Trend analysis" is unlocked
  - No CSV uploaded → "Upload a bank statement to unlock detailed expense tracking"

### 4.4 Visual polish and micro-interactions

- [ ] Streaming text animation: tokens appear smoothly, not in chunks
- [ ] Card entrance animations: subtle slide-up + fade-in using Framer Motion
- [ ] Typing indicator: three-dot pulse while Claude is thinking
- [ ] Scroll behavior: auto-scroll to latest message, but stop if user scrolls up
- [ ] Empty state: when no conversation exists, show a centered welcome with the greeting + chips
- [ ] Dark mode: verify all card components work in both themes (you already have Tailwind dark mode)
- [ ] Mobile responsive: stack chips vertically, full-width cards, bottom-anchored input bar
- [ ] Cmd+K shortcut: quick actions overlay (upload CSV, start new conversation, export data)

### 4.5 Conversation management

- [ ] Conversation list in a slide-out panel (hamburger menu from top bar)
- [ ] Auto-title conversations using Claude (first message summary)
- [ ] "New conversation" button — starts fresh context but same financial data
- [ ] Conversation search (full-text search on messages table)
- [ ] Delete conversation with confirmation

**End of week 4 deliverable:** The product feels alive. AI greets you proactively, chips are contextual, cards animate smoothly, onboarding flows naturally, and conversations persist.

---

## Week 5: Production Hardening (Days 29-35)

No new features. This week is entirely about making it production-safe.

### 5.1 Authentication and security

- [ ] Supabase Auth setup: email/password + magic link (remove guest mode for production, or gate it as "demo mode" with no data persistence)
- [ ] Row Level Security (RLS) on all tables: users can only access their own data
- [ ] API key handling: Claude API key stored server-side only (never exposed to frontend via VITE_ prefix)
- [ ] Rate limiting on chat endpoint: 60 requests/minute per user (prevent runaway API costs)
- [ ] Rate limiting on CSV upload: 10 uploads/day per user
- [ ] Input sanitization: validate all user inputs server-side before passing to Claude
- [ ] CORS configuration: lock to your Vercel domain only
- [ ] Content Security Policy headers

### 5.2 Error handling and resilience

- [ ] Claude API failures: retry with exponential backoff (3 attempts), then show friendly error card
- [ ] Supabase connection failures: offline indicator in top bar, queue messages locally
- [ ] CSV parse failures: detailed error messages ("Row 47 has an invalid date format")
- [ ] Streaming interruption: reconnect SSE, resume from last token if possible
- [ ] Global error boundary: catch React crashes, show "something went wrong" with conversation recovery
- [ ] Backend health check endpoint: `GET /api/v1/health`

### 5.3 Performance optimization

- [ ] Lazy load card components (code-split each card type)
- [ ] Virtualize long conversation threads (react-window or similar — only render visible messages)
- [ ] Debounce metrics computation (don't recompute on every transaction insert)
- [ ] Cache financial context: rebuild only when transactions or metrics change, not on every chat request
- [ ] Optimize Claude system prompt: keep under 2,000 tokens to minimize latency and cost
- [ ] Bundle analysis: remove unused dependencies (Google Generative AI SDK, anything from cut features)
- [ ] Image optimization: compress any static assets, use WebP where possible

### 5.4 Cost management

- [ ] Track Claude API usage per user (store token counts in a `usage` table)
- [ ] Set monthly token budget per user (free tier: 100k tokens/month, ~50-100 conversations)
- [ ] Warn user when approaching limit: "You've used 80% of your monthly AI budget"
- [ ] Graceful degradation when limit hit: show metrics/data but disable new AI chat messages
- [ ] Log all API calls with cost estimates for your own monitoring

### 5.5 Testing

- [ ] Unit tests for metrics computation (runway, burn rate, MoM deltas — these must be correct)
- [ ] Unit tests for CSV parser (test with Chase, Mercury, Brex, generic formats)
- [ ] Integration test for chat flow: send message → get streamed response → verify card rendering
- [ ] Integration test for CSV upload: upload → preview → confirm → verify transactions in DB
- [ ] E2E test for onboarding: new user → enter numbers → first AI response with metrics card
- [ ] E2E test for returning user: login → proactive greeting with nudges → ask question → get answer
- [ ] Test RLS policies: verify user A cannot access user B's data
- [ ] Load test chat endpoint: simulate 50 concurrent users streaming

**End of week 5 deliverable:** The app handles errors gracefully, is secure, performs well, and has test coverage on critical paths.

---

## Week 6: Deploy + Launch Prep (Days 36-42)

### 6.1 Deployment setup

- [ ] Vercel project configuration:
  - Frontend: auto-deploy from main branch
  - Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (frontend only)
  - Build command: `npm run build`
  - Output directory: `dist`
- [ ] Backend deployment (choose one):
  - **Option A: Vercel Serverless Functions** — convert FastAPI routes to serverless handlers (simplest, might hit cold start issues with streaming)
  - **Option B: Railway/Render** — deploy FastAPI as a container (better for SSE streaming, $5-7/mo)
  - **Option C: Supabase Edge Functions** — if you want everything in Supabase (Deno-based, different runtime)
- [ ] Environment variables for backend: `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
- [ ] Custom domain setup: DNS configuration, SSL certificate (automatic on Vercel)
- [ ] Supabase production project (separate from dev): run migration SQL, verify RLS policies

### 6.2 Monitoring and observability

- [ ] Error tracking: Sentry (free tier) — frontend + backend
- [ ] Uptime monitoring: BetterUptime or similar (free tier) — ping health endpoint every 5 minutes
- [ ] Claude API cost dashboard: simple query on usage table, check daily
- [ ] Supabase dashboard: monitor DB size, connection count, realtime subscriptions
- [ ] Vercel analytics: page load times, Web Vitals (built-in)

### 6.3 Pre-launch checklist

- [ ] Security audit: run `npm audit`, fix critical vulnerabilities
- [ ] Lighthouse score: target 90+ on performance, accessibility, best practices
- [ ] Test on mobile: iOS Safari, Android Chrome — verify chat input, card rendering, CSV upload
- [ ] Test with real bank CSV exports: download from your actual bank, upload, verify parsing
- [ ] Test full user journey: sign up → onboard → upload CSV → ask 10 different questions → export report
- [ ] Privacy policy page (required for production): what data you store, how you use Claude API
- [ ] Terms of service page (required for production)
- [ ] Favicon, Open Graph meta tags, page title
- [ ] 404 page redirect to main chat
- [ ] Remove all console.log statements
- [ ] Remove all TODO comments or convert to tracked issues

### 6.4 Soft launch

- [ ] Deploy to production
- [ ] Test with 3-5 founder friends (real data, real usage)
- [ ] Collect feedback on: onboarding clarity, AI response quality, card usefulness, missing features
- [ ] Fix critical bugs from testing
- [ ] Set up a feedback mechanism: simple "thumbs up/down" on AI responses stored in messages table

---

## Post-Launch Backlog (not in scope for 6 weeks, but tracked)

These are features to consider after launch based on user feedback:

- **Bank connection via Plaid** — replace CSV with automatic transaction sync (when you have revenue to justify the Plaid cost)
- **Indian compliance module** — TDS/GST/P-Tax, reactivate the code you deferred (2,131 lines ready to go)
- **Multi-currency support** — INR, USD, EUR handling
- **Scheduled digests** — weekly email summary of your finances (generated by Claude)
- **Collaboration** — share read-only dashboard link with co-founder or advisor
- **Mobile app** — PWA wrapper or React Native (the chat-first UI translates well to mobile)
- **Stripe/Razorpay billing** — if you add a paid tier

---

## Dependency Map

```
Week 1 (Strip + Scaffold)
  ├── 1.1 Delete dead code ──────────────┐
  ├── 1.2 Simplify to Claude only ───────┤
  ├── 1.3 Scaffold chat layout ──────────┤── All independent, parallelize
  └── 1.4 Simplify database schema ──────┘

Week 2 (Chat Engine + Cards)
  ├── 2.1 Chat engine ──► 2.3 Message renderer (blocked by 2.1)
  ├── 2.2 Card components ──► 2.3 Message renderer (blocked by 2.2)
  └── 2.4 System prompt ──► 2.1 Chat engine (feed into)

Week 3 (Data + Onboarding)
  ├── 3.1 CSV import ──► 3.4 Metrics engine (needs transaction data)
  ├── 3.2 Manual entry ──► 3.4 Metrics engine
  └── 3.3 Onboarding ──► needs 3.1 + 3.2 working

Week 4 (Intelligence + Polish)
  ├── 4.1 Proactive opener ──► needs 3.4 metrics engine
  ├── 4.2 Evolving chips ──► needs chat history from week 2
  ├── 4.3 Capability card ──► independent
  ├── 4.4 Visual polish ──► independent
  └── 4.5 Conversation management ──► needs 2.1 chat engine

Week 5 (Hardening) ──► all items independent, prioritize by risk

Week 6 (Deploy) ──► blocked by week 5 completion
```

---

## Daily Rhythm (suggested for solo founder)

- **Morning (2-3 hrs):** Hard engineering — chat engine, card system, backend logic
- **Afternoon (2-3 hrs):** Integration work — wiring frontend to backend, testing flows
- **Evening (1 hr):** Polish, bug fixes, update this roadmap with progress notes
- **End of day:** Commit, push, verify Vercel preview deployment works

Total estimated effort: ~200-250 hours over 6 weeks (~6-7 hrs/day, 6 days/week).
