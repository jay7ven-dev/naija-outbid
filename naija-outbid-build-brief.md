# Build Brief: Nigerian Pay-to-Rank Leaderboard (outbid.lol clone)

## Context — read this first

`outbid.lol` is a viral pay-to-rank public leaderboard site that launched August 20, 2026, built by German developer Jonathan Wilke. The concept: a single public page where anyone can submit a product/link and pay real money to claim a rank position. Whoever bids the most holds #1. If someone else pays more, they take that position. No algorithm, no login required to view, no ads — the entire product is one leaderboard, one submission form, and one payment flow.

The original runs on Stripe with a $5 minimum bid, whole-dollar amounts, and ties resolved in favor of the older entry.

**This brief is for a clone adapted to the Nigerian market** — same core mechanic, but priced in naira and using a Nigerian-friendly payment processor instead of Stripe. Do not build anything beyond what’s specified below (no extra features, no unrelated pages, no scope creep) — the goal is a fast, working MVP.

-----

## Stack

- Next.js 14+ (App Router), TypeScript
- PostgreSQL via Neon (Drizzle ORM or Prisma — either is fine)
- **Paystack** for payments (NOT Stripe)
- Tailwind CSS
- Deploy target: Vercel

## Core mechanic

- Public leaderboard on a single page, ranked by total amount paid (highest first)
- Anyone can submit: product/project name, URL, optional logo/image, optional category
- To claim or improve a rank, the user pays via Paystack; their position updates based on their cumulative bid relative to everyone else’s
- A higher bid than the current #1 takes the top spot; other entries shift down accordingly
- Minimum bid: **₦2,000** (Nigerian pricing — not a straight USD-to-NGN conversion of the $5 original)
- Whole-naira amounts only
- Ties broken in favor of the older entry

## Database schema

- **listings**: `id`, `name`, `url`, `image_url`, `category`, `total_bid_amount`, `owner_email` or `owner_x_handle`, `created_at`
- **bids**: `id`, `listing_id`, `amount`, `paystack_reference`, `status`, `created_at`
- **payments**: `id`, `paystack_reference`, `amount`, `status`, `verified_at`, `raw_webhook_payload`

## Security requirements — non-negotiable

1. Never trust a client-side “payment succeeded” signal. Every bid is confirmed only after server-side verification of the Paystack transaction reference via Paystack’s verify endpoint.
1. Verify the Paystack webhook signature (`x-paystack-signature` header) before processing any webhook event.
1. Wrap bid/rank updates in a database transaction with row-level locking to prevent race conditions when two users bid on the same rank at nearly the same time.
1. Rate-limit the submission and bid endpoints (e.g. 5 requests/minute per IP).
1. Sanitize submitted URLs: strip tracking params, block known URL shorteners, block chat-app invite links (WhatsApp/Telegram group invites), reject anything that isn’t `http(s)`.
1. Keep the Paystack secret key server-side only — it must never reach the client bundle.
1. Use the Paystack reference as an idempotency key so a webhook retry or accidental double-submit can’t double-count a bid or double-charge.

## Pages needed

1. **Home** — the leaderboard: ranked list, live bid amounts, rank badges
1. **Submit/bid page** — form to add a new listing and initiate Paystack checkout
1. **Payment callback/verify page** — shown after Paystack redirect, confirms status to the user
1. **Simple protected admin view** — see raw listings/bids for moderation

## Design notes

- Clean, mobile-first (majority of Nigerian traffic is mobile)
- Naira (₦) currency formatting throughout
- Needs to stay fast under a sudden traffic spike, in case it goes viral like the original

## What to do first

Set this up as a working local dev environment first, using placeholder Paystack **test** keys, so the full flow can be tested end-to-end before going live. Explain what environment variables are needed and where to get each one.

**Do not start building until you’ve confirmed you understand this brief and the outbid.lol reference concept above.**