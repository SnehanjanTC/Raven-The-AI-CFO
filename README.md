<div align="center">

# Raven

**The Open-Source AI CFO for Founders**

A Claude-powered financial dashboard with an AI copilot, custom KPI builder, Zoho Books integration, scenario modelling, and audit ledger.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688.svg)](https://fastapi.tiangolo.com/)

</div>

---

## Features

- **AI Copilot (`/chat`)** — Conversational CFO powered by Anthropic Claude. Streams answers, remembers conversation history, and can ingest CSVs.
- **Dashboard (`/dashboard`)** — MRR, burn rate, cash runway, ARR forecast, expense breakdown, and anomaly cards.
- **Custom KPI Builder (`/kpis`)** — Define your own metrics with live-evaluated formulas (e.g. `burn / mrr`, `(revenue - expenses) / revenue * 100`). Ships with starter templates (Gross Margin, Rule of 40, Burn Multiple).
- **Scenario Sandbox (`/scenarios`)** — What-if simulations on growth, churn, burn, and starting cash with 12-month projections.
- **Audit Ledger (`/ledger`)** — Transaction ledger with search, filtering, and manual entry.
- **Reports (`/reports`)** — Generate and export (Excel, PDF, PPTX) P&L, cash flow, and custom reports.
- **Integrations (`/integrations`)** — Connect Zoho Books via MCP (OAuth). Pulls live MRR/ARR, invoices, and GST data.
- **Settings (`/settings`)** — Profile, Claude API key management, demo-data toggle.
- **OAuth login** — Google + Microsoft sign-in via Supabase Auth (with email/password as fallback).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript 5.8, Vite 6 |
| Styling | Tailwind CSS v4, Framer Motion |
| Charts | Recharts |
| AI | Anthropic Claude (via backend proxy or direct) |
| Backend | FastAPI, SQLAlchemy, SQLite (dev) / Supabase Postgres (prod) |
| Auth & Realtime | Supabase (optional) |

## Quick Start

```bash
git clone https://github.com/SnehanjanTC/Raven-The-AI-CFO.git
cd Raven-The-AI-CFO
npm install
cp .env.example .env
# Fill in VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (see Supabase setup below)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with Google or Microsoft.

## Supabase + OAuth Setup

Raven uses Supabase Auth for Google and Microsoft sign-in.

1. Create a project at [supabase.com](https://supabase.com).
2. In **Authentication → Providers**, enable **Google** and **Microsoft (Azure)**.
   - Google: create OAuth 2.0 credentials in [Google Cloud Console](https://console.cloud.google.com/apis/credentials), add the Supabase callback URL (`https://<project-ref>.supabase.co/auth/v1/callback`).
   - Microsoft: register an app in [Entra ID](https://entra.microsoft.com/), add the same Supabase callback URL as a redirect URI.
3. In **Authentication → URL Configuration**, set the **Site URL** to `http://localhost:3000` for dev (and your production URL for prod). Add `http://localhost:3000/chat` and `<prod>/chat` to **Redirect URLs**.
4. Copy your project URL and anon key into `.env`:

```env
VITE_SUPABASE_URL="https://<project-ref>.supabase.co"
VITE_SUPABASE_ANON_KEY="ey..."
```

5. (Optional) In the SQL Editor, paste & run `supabase_schema.sql` to create tables for chat history, reports, and ledger persistence.

If you want Claude AI in the dashboard:

```env
VITE_ANTHROPIC_API_KEY="sk-ant-..."   # dev only — keep behind backend in prod
VITE_API_URL="http://localhost:8000"  # if using the FastAPI backend below
```

## Backend (Optional)

A FastAPI service powers chat tools, metrics, and the Zoho MCP integration. Skip if you only want the frontend with Supabase Auth.

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # edit with your Anthropic / Supabase creds
uvicorn app.main:app --reload --port 8000
```

The backend ships with SQLite for local development (`sqlite+aiosqlite:///./raven.db`), so no database server is required.

### Zoho Books MCP

1. Go to `/integrations` in the UI.
2. Enter your Zoho MCP endpoint URL.
3. Click **Connect** → complete OAuth → live revenue data appears in the dashboard, KPIs, and reports.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Vite dev server on port 3000 |
| `npm run build` | Build for production |
| `npm run preview` | Preview the production build |
| `npm run lint` | Type-check with TypeScript |
| `npm test` | Run Vitest suite |

## Project Layout

```
Raven-The-AI-CFO/
├── src/                    # React frontend
│   ├── pages/              # Route pages (Chat, Dashboard, Kpis, Reports, ...)
│   ├── components/         # Reusable UI
│   ├── layouts/            # ChatLayout — shared shell
│   ├── hooks/              # useConversations, useSession, useReports, ...
│   ├── lib/                # api client, demo data, utils
│   └── shared/             # contexts, errors, services
├── backend/                # FastAPI service
│   ├── app/
│   │   ├── api/v1/endpoints/  # REST + MCP endpoints
│   │   ├── services/          # metrics, tools, context-builder
│   │   └── main.py
│   └── requirements.txt
├── supabase_schema.sql     # Optional Postgres schema + RLS policies
├── DEPLOYMENT.md           # Production deploy guide (Vercel + Railway/Render)
└── CONTRIBUTING.md
```

## AI Configuration

Raven uses **Anthropic Claude**. Supply a key one of three ways (in order of precedence):

1. Backend env var `ANTHROPIC_API_KEY` — recommended for production (key never touches the browser).
2. Frontend env var `VITE_ANTHROPIC_API_KEY` — for local dev.
3. Settings page — stored in `localStorage`, browser-only.

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for Vercel (frontend) + Railway/Render (backend) recipes.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Issues and PRs welcome.

## License

MIT — see [LICENSE](LICENSE).
