# RailPlanner — Developer Context

> **Paste this file at the start of every Claude Code session.**
> Keep it updated as you make decisions. It is the single source of truth for "what have we already decided and why."

---

## What this project is

A full-stack web app for planning, visualising, and documenting European train journeys. Users can search connections across DB/SBB/ÖBB, build multi-leg trips, visualise routes on a map, check in to Träwelling, and document their journeys in a travel journal. Monetised via freemium subscriptions (Lemon Squeezy).

Full product spec is in `SPEC.md` at the root of this repo.

---

## Stack — non-negotiable decisions

| Layer | Choice | Do not suggest alternatives |
|---|---|---|
| Framework | Next.js 14, App Router, TypeScript | No Pages Router, no Remix |
| Database | Supabase (PostgreSQL) | No PlanetScale, no Neon |
| ORM | Prisma | No Drizzle, no raw SQL in app code |
| Auth | Supabase Auth | No NextAuth, no Clerk |
| Styling | Tailwind CSS + shadcn/ui | No MUI, no Chakra |
| Map | Maplibre GL JS + react-map-gl | No Google Maps, no Leaflet |
| Map tiles | Stadia Maps (free tier) | Key in env: NEXT_PUBLIC_STADIA_API_KEY |
| Billing | Lemon Squeezy | No Stripe — LS handles EU VAT |
| Cache / rate limit | Upstash Redis | No self-hosted Redis |
| Email (outbound) | Resend | No SendGrid, no Nodemailer |
| State management | React built-ins + Zustand for global UI state | No Redux, no Jotai |
| Data fetching | TanStack Query (React Query) v5 | No SWR |
| Forms | React Hook Form + Zod | No Formik |
| Rich text (journal) | Tiptap | No Quill, no Slate |
| Charts (stats page) | Recharts | No Chart.js in this project |
| AI | Anthropic Claude API (server-side only) | Never expose API key to client |
| Deployment | Vercel Hobby (free) | No Railway, no Fly.io |
| Background jobs | Supabase Edge Functions + pg_cron | No separate worker process |

---

## Project structure

```
railplanner/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth pages (login, signup, forgot-password)
│   ├── (app)/                    # Authenticated app shell
│   │   ├── dashboard/            # Trip list
│   │   ├── trips/[id]/           # Trip detail + map
│   │   ├── search/               # Connection search
│   │   ├── stats/                # Statistics + heatmap
│   │   ├── settings/
│   │   │   └── billing/          # Subscription management
│   │   └── layout.tsx            # App shell with nav
│   ├── api/
│   │   ├── billing/
│   │   │   ├── checkout/route.ts # POST → create LS checkout URL
│   │   │   └── webhook/route.ts  # POST → handle LS subscription events
│   │   ├── trips/route.ts
│   │   ├── trips/[id]/route.ts
│   │   ├── legs/route.ts
│   │   ├── legs/[id]/route.ts
│   │   ├── legs/[id]/checkin/route.ts
│   │   ├── search/connections/route.ts
│   │   ├── stations/search/route.ts
│   │   ├── calendar/[token].ics/route.ts
│   │   ├── v1/                   # Public API (Pro only)
│   │   └── health/route.ts
│   └── layout.tsx                # Root layout
├── components/
│   ├── ui/                       # shadcn/ui primitives (auto-generated, do not edit)
│   ├── map/                      # Map components
│   │   ├── TripMap.tsx
│   │   ├── RouteLayer.tsx
│   │   └── StationMarker.tsx
│   ├── trips/                    # Trip-related components
│   ├── billing/
│   │   └── UpgradeModal.tsx
│   └── shared/                   # Generic shared components
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Server client (cookies)
│   │   └── admin.ts              # Service role client (webhooks only)
│   ├── lemonsqueezy.ts           # LS checkout + portal helpers
│   ├── entitlements.ts           # Plan limits + feature gates
│   ├── redis.ts                  # Upstash client
│   ├── ratelimit.ts              # Rate limiting helper
│   ├── hafas.ts                  # DB Hafas connection search
│   └── email.ts                  # Resend helpers
├── hooks/
│   ├── useUser.ts                # Current user + plan
│   ├── useTrips.ts
│   └── useEntitlements.ts        # Client-side gate helpers
├── prisma/
│   └── schema.prisma
├── supabase/
│   ├── migrations/               # SQL migrations
│   └── functions/
│       └── poll-delays/          # Edge function for live delay polling
├── public/
│   └── manifest.json             # PWA manifest
├── CONTEXT.md                    # ← this file
└── SPEC.md                       # Full product spec
```

---

## Database schema summary

All tables defined in `prisma/schema.prisma`. Key relationships:

```
users (1) ──< trips (1) ──< legs
users (1) ──< subscriptions
users (1) ── usage_counters
users (1) ──< tickets
users (1) ──< journal_entries ──< journal_photos
users (1) ──< api_keys
users (1) ──< interrail_passes
users (1) ──< custom_routes
trips (1) ──< legs ──< leg_rolling_stock
legs (1) ──< route_reviews
```

Full SQL in SPEC.md §3.

---

## Auth & session pattern

```typescript
// Server component / API route — always use this
import { createClient } from '@/lib/supabase/server'
const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()
// user.app_metadata.plan → 'free' | 'plus' | 'pro'

// Client component — use the hook
import { useUser } from '@/hooks/useUser'
const { user, plan, isLoading } = useUser()
```

**Never use `getSession()` on the server — always `getUser()`.** `getSession()` reads from the cookie without re-validating with Supabase. `getUser()` calls the Supabase Auth server and is authoritative.

The user's subscription plan is stored in `user.app_metadata.plan` (set by the billing webhook). This means plan checks are a JWT decode — no database hit required.

---

## Entitlements pattern

```typescript
import { getPlan, can, getLimit } from '@/lib/entitlements'

// In server API routes
const plan = getPlan(user.app_metadata)
if (!can(plan, 'journal')) return NextResponse.json({ error: 'upgrade_required' }, { status: 403 })

// Limit checks use usage_counters table (O(1) — triggers keep it updated)
const { data: usage } = await supabase.from('usage_counters').select('trips_count').eq('user_id', user.id).single()
if ((usage?.trips_count ?? 0) >= getLimit(plan, 'maxTrips')) { ... }

// In client components
import { useEntitlements } from '@/hooks/useEntitlements'
const { can, getLimit } = useEntitlements()
if (!can('journal')) return <UpgradeModal feature="journal" />
```

**Rule: client gates are UX only. All real enforcement is server-side.**

---

## API response conventions

```typescript
// Success
return NextResponse.json({ data: result }, { status: 200 })

// Created
return NextResponse.json({ data: result }, { status: 201 })

// Auth error
return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

// Plan gate
return NextResponse.json({ error: 'upgrade_required', requiredPlan: 'plus' }, { status: 403 })

// Limit reached
return NextResponse.json({ error: 'limit_reached', limit: 3, current: 3, upgrade: true }, { status: 403 })

// Validation error
return NextResponse.json({ error: 'validation_error', details: zodError.flatten() }, { status: 422 })

// Server error (never expose internal error messages to client)
return NextResponse.json({ error: 'internal_error' }, { status: 500 })
```

---

## Environment variables

All env vars are listed in SPEC.md §11.7. The ones needed from day one:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY       ← server only, never NEXT_PUBLIC_
DATABASE_URL
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
RESEND_API_KEY
LEMONSQUEEZY_API_KEY
LEMONSQUEEZY_WEBHOOK_SECRET
LEMONSQUEEZY_STORE_ID
LS_VARIANT_PLUS_MONTHLY
LS_VARIANT_PLUS_YEARLY
LS_VARIANT_PRO_MONTHLY
LS_VARIANT_PRO_YEARLY
NEXT_PUBLIC_STADIA_API_KEY
NEXT_PUBLIC_URL                 ← e.g. https://railplanner.app
```

Optional (add when those features are being built):
```
ANTHROPIC_API_KEY               ← server only
```

---

## Key rules — always follow these

1. **No raw SQL in app code.** Use Prisma for all DB operations. Exception: Supabase Edge Functions (Deno) use the Supabase client directly.

2. **No `SUPABASE_SERVICE_ROLE_KEY` in client code ever.** Only used in `lib/supabase/admin.ts`, which is only imported in server-side code (API routes, Edge Functions).

3. **All mutations go through API routes**, not Supabase client directly from the browser. This ensures server-side entitlement checks run on every write.

4. **Validate all inputs with Zod** before touching the database. Define schemas in `lib/validators/` and share them between client (form validation) and server (API validation).

5. **Maplibre map instances are expensive.** Never unmount and remount the map on navigation. Use a single persistent map instance in a layout component and update sources/layers programmatically.

6. **The Lemon Squeezy webhook endpoint must not use Next.js body parsing.** It needs the raw body to verify the HMAC signature. Export `config = { api: { bodyParser: false } }` from the route.

7. **Supabase free tier pauses after 1 week of inactivity.** The `/api/health` endpoint + UptimeRobot ping (every 5 min) prevents this. Do not remove the health endpoint.

8. **All Overpass API calls are server-side and cached** in Upstash Redis with a 7-day TTL. Never call Overpass from the browser — rate limits are per-IP.

9. **Connection search results are cached** in Redis for 5 minutes per (origin, destination, datetime, operators) key. Cache key format: `search:{originIbnr}:{destIbnr}:{datetimeHour}:{operators}`.

10. **AI features (Claude API) are server-side only.** Never import the Anthropic SDK in any file that could end up in the browser bundle.

---

## What has been built (update this as you go)

### ✅ Done
- [ ] (nothing yet — update as you complete sessions)

### 🚧 In progress
- [ ] (update as you start sessions)

### ⏳ Not started
- Everything in SPEC.md §12 Phase 1–4

---

## Known issues & decisions log

*Add entries here whenever you make a non-obvious decision or hit a gotcha. Format: date — decision — reason.*

- 2026-03-12 — Chose Lemon Squeezy over Stripe — handles EU VAT automatically as Merchant of Record, no VAT registration needed in each country
- 2026-03-12 — Chose Upstash Redis over Vercel KV — better free tier limits (10k commands/day vs Vercel KV's 3k/day)
- 2026-03-12 — Using `db-hafas` npm package for DB connection search — community-maintained Hafas client, more reliable than scraping DB Navigator
