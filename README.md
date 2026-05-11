# SolveSphere AI

> All-in-one intelligent assistant combining Photomath-style math solving with a complete personal finance suite.

**Stack:** React Native (Expo) · Next.js 14 · PostgreSQL (Supabase) · Prisma · tRPC · Anthropic Claude · Mathpix OCR · Stripe · Plaid

---

## Monorepo Structure

```
solvesphere-ai/
├── apps/
│   ├── web/              # Next.js 14 App Router (web app + API routes)
│   └── mobile/           # Expo SDK 52 (iOS + Android)
├── packages/
│   ├── api/              # tRPC routers + Prisma ORM + AI/OCR services
│   └── shared/           # TypeScript types, validators, financial utils + tests
├── turbo.json
├── package.json
└── .env.example
```

---

## Prerequisites

- Node.js ≥ 20, npm ≥ 10
- [Supabase](https://supabase.com) project (free tier)
- [Anthropic API key](https://console.anthropic.com) (free credits available)
- [Mathpix API key](https://mathpix.com) (free: 1000 req/month)

---

## Quick Start

### 1. Install

```bash
npm install
```

### 2. Environment Variables

```bash
cp .env.example .env
# Fill in all values — see .env.example for descriptions
```

### 3. Database Setup

```bash
npm run db:generate   # Generate Prisma client
npm run db:push       # Push schema to Supabase
npm run db:studio     # Optional: open Prisma Studio
```

### 4. Run Dev Servers

```bash
npm run dev                    # All apps (via Turborepo)
cd apps/web && npm run dev     # Web only  → http://localhost:3000
cd apps/mobile && npx expo start  # Mobile → scan QR with Expo Go
```

### 5. Run Tests

```bash
npm run test                   # All packages
cd packages/shared && npx vitest run --coverage
```

---

## Environment Variables

| Variable | Required | Source |
|---|---|---|
| `DATABASE_URL` | ✅ | Supabase → Settings → Database (pooled) |
| `DIRECT_URL` | ✅ | Supabase → Settings → Database (direct) |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase → Settings → API |
| `ANTHROPIC_API_KEY` | ✅ | console.anthropic.com |
| `MATHPIX_APP_ID` / `MATHPIX_APP_KEY` | ✅ | mathpix.com |
| `OPENAI_API_KEY` | ✅ | platform.openai.com (vision fallback) |
| `ALPHA_VANTAGE_API_KEY` | ✅ | alphavantage.co (free: 25 req/day) |
| `FINNHUB_API_KEY` | ✅ | finnhub.io (free: 60 req/min) |
| `STRIPE_SECRET_KEY` | ✅ | dashboard.stripe.com |
| `PLAID_CLIENT_ID` / `PLAID_SECRET` | Optional | plaid.com (sandbox free) |
| `ONESIGNAL_APP_ID` | Optional | onesignal.com (free tier) |

---

## Core Feature Modules

| Module | Key Technologies |
|---|---|
| Camera Math Solver | Mathpix OCR → Claude step-by-step → KaTeX render |
| Statistics | Pure-TS implementations (t-tests, regression, chi-square) + Claude interpretation |
| Budget & Receipts | Claude Vision receipt parser + Plaid bank sync |
| Investment Portfolio | Finnhub/AlphaVantage live prices + Sharpe/drawdown/volatility |
| AI Assistant | Streaming Claude chat with full user financial context |
| Advanced Finance | Monte Carlo (10k runs), DCF valuation, options P&L, tax estimator |

---

## Deployment

### Web → Vercel

```bash
npm i -g vercel
vercel --prod
```

Set all env vars in Vercel dashboard. Project root: `apps/web`.

### Mobile → EAS (Expo Application Services)

```bash
npm i -g eas-cli && eas login
cd apps/mobile
eas build --platform ios --profile production
eas build --platform android --profile production
eas submit --platform ios
eas submit --platform android
```

Update `apps/mobile/app.json`: bundle IDs, EAS project ID, Apple Team ID.

---

## Monetization (Stripe)

| Tier | Price | Key Limits |
|---|---|---|
| Free | $0/mo | 10 math scans/day, 1 budget, 1 portfolio ≤10 holdings, 20 AI msgs/day |
| Pro | $6.99/mo or $59/yr | Unlimited scans, budgets, portfolios, AI chat, PDF export |
| Lifetime | $149 one-time | All Pro features forever |

---

## Security

- AES-256 encryption for Plaid access tokens
- Supabase Row-Level Security on all tables
- API keys server-side only (never in client bundles)
- Biometric lock (Face ID / fingerprint) on mobile app open
- GDPR + PIPEDA compliant data export and deletion
- Free-tier rate limits enforced server-side

---

## Portfolio Website

The original portfolio site is preserved at `index.html` (Kartik Joshi's finance & AI portfolio).

---

## License

MIT
