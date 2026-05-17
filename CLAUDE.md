# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # start dev server at http://localhost:3000
npm run build    # production build
npm run lint     # ESLint (eslint-config-next core-web-vitals + typescript)
npm run start    # serve production build
```

No test suite is configured.

## Environment Variables

Create a `.env.local` file with:

```
FINNHUB_API_KEY=...
NEWS_API_KEY=...
ANTHROPIC_API_KEY=...
```

## Architecture

**Stack:** Next.js 16.2.4, React 19.2.4, TypeScript 5, Tailwind CSS 4 (PostCSS plugin).

**Path alias:** `@/` resolves to the project root (e.g. `@/components/foo`).

### App Router layout

- `app/layout.tsx` — root layout, dark background (`#030712`), no external font imports
- `app/page.tsx` — client component; dynamically imports `MarketAnalyzer` with `ssr: false`
- `app/api/analyze/route.ts.txt` — **not active** (`.txt` extension). Contains the proxy handlers for Finnhub, NewsAPI, and Anthropic. Rename to `route.ts` to enable.

### Main component

`components/remixed-b439f33c.tsx` is the entire application UI (~1000 LOC). It is a single large client component (`"use client"`) with no sub-files. It contains:

- **Static data** — hardcoded `ASSETS` array (SPY, QQQ, AAPL, TSLA, NVDA, MSFT, TLT, IEF), mock news, earnings calendar, sector data, and market events near the top of the file
- **AI/analysis helpers** — pure functions (no hooks) for sentiment scoring, earnings detection, narrative generation, and trade signal derivation; located in the `AI SERVICE` section
- **Live news** — fetches from Finnhub (browser-safe CORS) directly and from NewsAPI via the `/api/analyze` proxy route
- **UI atoms** — small presentational components (`Spinner`, `Pill`, `Toast`, `AssetDetailModal`, etc.) defined inline before the main `MarketAnalyzer` function
- **`MarketAnalyzer`** — top-level component; owns all state and orchestrates news fetching, AI analysis calls, and rendering

`components/remixed-b439f33c.jsx` is an older JSX copy of the same component (not imported anywhere).

`components/s.tsx` — large standalone component; purpose unclear from a quick read.
