<div align="center">

# Raven

**The Open-Source AI CFO for Founders**

An executive-grade financial dashboard with autonomous AI agents, real-time analytics, scenario modeling, and Claude-powered AI copilot.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Powered-3ECF8E.svg)](https://supabase.com/)

</div>

---

## Features

- **Executive Dashboard** — Real-time financial metrics, MRR tracking, burn rate, and runway projections with interactive charts.
- **AI Copilot** — Conversational financial advisor with streaming responses. Powered by Anthropic Claude.
- **Autonomous Agents** — Deploy AI agents for CFO analytics, FP&A, cash flow monitoring, accounts receivable/payable, and tax compliance.
- **Scenario Sandbox** — "What-if" financial simulations with adjustable parameters (growth rate, churn, burn, initial cash) and 12-month projections.
- **Audit Ledger** — Full transaction ledger with real-time sync, search, filtering, and manual entry support.
- **Report Library** — Generate, version, and export financial reports (Excel, Board Deck, Investor Update formats).
- **SIF Memory Bank** — Strategic Intelligence Framework with knowledge nodes and contextual data sourcing.
- **Integrations Hub** — Connect financial tools (QuickBooks, Stripe, Ramp, Gusto) via OAuth 2.0 flows.
- **Real-time Sync** — Powered by Supabase Realtime for live updates across all modules.
- **Dark Mode UI** — Premium dark theme built with Tailwind CSS v4.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript 5.8, Vite 6 |
| Styling | Tailwind CSS v4, Framer Motion |
| Database | Supabase (PostgreSQL + Realtime) |
| AI | Anthropic Claude |
| Charts | Recharts |
| Routing | React Router v7 |
| Markdown | react-markdown + remark-gfm |

## Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- A **Supabase** account (free tier works) — [supabase.com](https://supabase.com)
- An **Anthropic Claude API key** (get from [console.anthropic.com](https://console.anthropic.com/))

### 1. Clone and Install

```bash
git clone https://github.com/SnehanjanTC/Raven-The-AI-CFO.git
cd Raven-The-AI-CFO
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"
VITE_ANTHROPIC_API_KEY="your-claude-api-key"
```

### 3. Set Up the Database

1. Go to your Supabase project's **SQL Editor**.
2. Paste and run the contents of `supabase_schema.sql`.
3. This creates all required tables, indexes, RLS policies, and seed data.

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Running Without Supabase

Raven gracefully degrades without a Supabase connection. Most pages will show fallback/demo data, and the app remains navigable using **Guest Mode** on the login screen. The AI Copilot requires a Claude API key.

## Project Structure

```
raven/
├── public/                 # Static assets
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── AgentDetail.tsx
│   │   ├── CreateAgentForm.tsx
│   │   ├── MetricCard.tsx
│   │   ├── NotificationProvider.tsx
│   │   ├── Sidebar.tsx
│   │   └── TopNav.tsx
│   ├── hooks/
│   │   └── useMetrics.ts   # Supabase metrics fetcher
│   ├── lib/
│   │   ├── ai.ts           # Multi-provider AI streaming
│   │   ├── supabase.ts     # Supabase client singleton
│   │   └── utils.ts        # Tailwind class merging
│   ├── pages/
│   │   ├── Home.tsx         # Executive overview
│   │   ├── Dashboard.tsx    # Financial analytics
│   │   ├── Copilot.tsx      # AI chat assistant
│   │   ├── Agents.tsx       # Autonomous agent management
│   │   ├── Scenarios.tsx    # What-if simulations
│   │   ├── Reports.tsx      # Report generation
│   │   ├── Ledger.tsx       # Transaction ledger
│   │   ├── Memory.tsx       # SIF knowledge bank
│   │   ├── Integrations.tsx # Third-party connections
│   │   ├── Settings.tsx     # AI provider & system config
│   │   └── Login.tsx        # Authentication
│   ├── types.ts             # Shared TypeScript types
│   ├── index.css            # Global styles & theme
│   ├── App.tsx              # Root component & routing
│   └── main.tsx             # Entry point
├── supabase_schema.sql      # Database schema + seed data
├── .env.example             # Environment variable template
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript configuration
└── package.json
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Type-check with TypeScript |
| `npm run clean` | Remove build artifacts |

## AI Configuration

Raven uses **Anthropic Claude** for all AI features. Configure your Claude API key in `.env`:

```env
VITE_ANTHROPIC_API_KEY="your-claude-api-key"
```

API keys can be set via environment variables or through the Settings page (stored in localStorage).

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the [MIT License](LICENSE).
