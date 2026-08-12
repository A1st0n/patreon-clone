# Patronage, a tiny Patreon clone

Next.js (Vercel) · Supabase (Postgres + Auth + REST) · Stripe Checkout.

## What maps to your requirements
| You asked | What does it |
|---|---|
| React | Next.js App Router (`app/`) |
| Postgres + REST API | Supabase, PostgREST auto-generates the REST layer over Postgres |
| JWT tied to a user, with expiry | Supabase Auth JWT (`sub` = user id, 1h expiry). Verified in `api/checkout` |
| White minimalist UX + interactive 3D | `globals.css` + CSS `rotateX/Y` tilt in `page.jsx` (no 3D lib) |
| Async queue after payment | Stripe webhook (`api/webhook`), retries w/ backoff = durable queue |
| Stripe | Checkout subscription; **test mode is free**, live = 2.9%+30¢/charge |
| Vercel + Supabase | Deploy `app/api/*` as serverless fns on Vercel; DB/auth on Supabase |

## Run
```bash
npm install
cp .env.example .env.local   # fill in Supabase + Stripe keys
# paste schema.sql into Supabase SQL editor
npm run dev
# local webhooks: stripe listen --forward-to localhost:3000/api/webhook
```

Deploy: push to Vercel, add the same env vars, point a Stripe webhook at
`https://<your-app>/api/webhook` for `checkout.session.completed`.

## Deliberately skipped (add when you actually need it)
- Real job queue (Redis/BullMQ/QStash), webhook retries cover a demo.
- Creator dashboard / posts / gated content, this is the membership spine only.
- `customer.subscription.deleted` handling to flip status to `canceled`.
- Password auth / OAuth, magic link needs zero UI.
