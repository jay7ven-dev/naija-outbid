# Naija Outbid

Pay-to-rank public leaderboard for Nigeria — outbid.lol mechanic, priced in ₦, paid via **Paystack**.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind · Neon Postgres · Drizzle · Paystack

## Environment variables

Copy `.env.example` → `.env.local` and fill in:

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | [Neon Console](https://console.neon.tech) → your project → **Connection string** (use the pooled or direct URL; SSL required) |
| `PAYSTACK_SECRET_KEY` | [Paystack Dashboard](https://dashboard.paystack.com/#/settings/developer) → **API Keys & Webhooks** → **Secret Key** (use `sk_test_…` for local) |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Same page → **Public Key** (`pk_test_…`) |
| `NEXT_PUBLIC_APP_URL` | Local: `http://localhost:3000`. Production: your Vercel URL (no trailing slash) |
| `ADMIN_PASSWORD` | Choose any strong password for `/admin` |

Never put the Paystack **secret** in a `NEXT_PUBLIC_*` variable.

### Paystack webhook (after deploy)

In Paystack → Settings → API Keys & Webhooks, set webhook URL to:

`https://YOUR_DOMAIN/api/paystack/webhook`

Local testing: use the Paystack test keys + redirect callback; webhooks need a tunnel (e.g. ngrok) pointed at `/api/paystack/webhook`.

## Local setup

```bash
npm install
cp .env.example .env.local   # then edit values
npm run db:push              # create tables on Neon
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- Submit: `/submit`
- Payment return: `/payment/callback`
- Admin: `/admin`

## Scripts

- `npm run dev` — local server
- `npm run build` / `npm start` — production
- `npm run db:push` — push schema to Neon
- `npm run db:generate` — generate SQL migrations
- `npx tsx src/lib/sanitize-url.selfcheck.ts` — URL sanitizer self-check

## Security (MVP)

- Bids applied only after server-side Paystack **verify**
- Webhook checks `x-paystack-signature`
- Bid apply uses a DB transaction + `FOR UPDATE` on the listing
- Checkout/verify rate-limited (5/min/IP, in-memory)
- URLs sanitized (no shorteners / chat invites; tracking params stripped)
- Paystack reference is the idempotency key
