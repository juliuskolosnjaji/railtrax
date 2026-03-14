# Railtrax — Developer Context

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
| Framework | Next.js 16, App Router, TypeScript | No Pages Router, no Remix |
| Database | Supabase (PostgreSQL) | No PlanetScale, no Neon |
| ORM | Prisma | No Drizzle, no raw SQL in app code |
| Auth | Supabase Auth | No NextAuth, no Clerk |
| Styling | Tailwind CSS + shadcn/ui | No MUI, no Chakra |
| Map | Maplibre GL JS + react-map-gl | No Google Maps, no Leaflet |
| Map tiles | OpenFreeMap (tiles.openfreemap.org) | No API key needed — completely free |
| Billing | Lemon Squeezy | No Stripe — LS handles EU VAT |
| Cache / rate limit | Upstash Redis | No self-hosted Redis |
| Email (outbound) | Resend | No SendGrid, no Nodemailer |
| State management | React built-ins + Zustand for global UI state | No Redux, no Jotai |
| Data fetching | TanStack Query (React Query) v5 | No SWR |
| Forms | React Hook Form + Zod | No Formik |
| Rich text (journal) | Tiptap | No Quill, no Slate |
| Charts (stats page) | Recharts | No Chart.js in this project |
| AI | Anthropic Claude API (server-side only) | Never expose API key to client |
| Deployment | Render.com | No Vercel, no Railway, no Fly.io |
| Background jobs | Supabase Edge Functions + pg_cron | No separate worker process |
| PDF generation | @react-pdf/renderer (Node.js only) | No client-side PDF libraries |

---

## Project structure

```
railtrax/
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
NEXT_PUBLIC_URL                 ← e.g. https://railplanner.app
```

Optional (add when those features are being built):
```
ANTHROPIC_API_KEY               ← server only

# Formation API keys (all free tier — see .env.example for registration links)
SWISS_OTD_API_KEY               ← Bearer token, api-manager.opentransportdata.swiss
NS_API_KEY                      ← Ocp-Apim-Subscription-Key, apiportal.ns.nl → Ns-App
NAVITIA_API_KEY                 ← Basic auth (token:), navitia.io, 3000 req/day free
# RTT_USERNAME / RTT_PASSWORD   ← TODO: not yet obtained, api.rtt.io
```

---

## Key rules — always follow these

1. **No raw SQL in app code.** Use Prisma for all DB operations. Exception: Supabase Edge Functions (Deno) use the Supabase client directly.

2. **No `SUPABASE_SERVICE_ROLE_KEY` in client code ever.** Only used in `lib/supabase/admin.ts`, which is only imported in server-side code (API routes, Edge Functions).

3. **All mutations go through API routes**, not Supabase client directly from the browser. This ensures server-side entitlement checks run on every write.

4. **Validate all inputs with Zod** before touching the database. Define schemas in `lib/validators/` and share them between client (form validation) and server (API validation).

5. **Maplibre map instances are expensive.** Never unmount and remount the map on navigation. Use a single persistent map instance in a layout component and update sources/layers programmatically.

6. **The Lemon Squeezy webhook endpoint must not use Next.js body parsing.** It needs the raw body to verify the HMAC signature. Export `config = { api: { bodyParser: false } }` from the route.

7. **Supabase free tier pauses after 1 week of inactivity.** The `/api/health` endpoint exists for uptime monitoring. Do not remove it.

8. **All Overpass API calls are server-side and cached** in Upstash Redis with a 7-day TTL. Never call Overpass from the browser — rate limits are per-IP.

9. **Connection search results are cached** in Redis for 5 minutes per (origin, destination, datetime, operators) key. Cache key format: `search:{originIbnr}:{destIbnr}:{datetimeHour}:{operators}`.

10. **AI features (Claude API) are server-side only.** Never import the Anthropic SDK in any file that could end up in the browser bundle.

---

## What has been built

### ✅ Production ready
- Supabase auth (email + Google OAuth)
- Trip / leg CRUD with plan enforcement
- Connection search via db-vendo-client
- Public trip sharing with share tokens
- Rolling stock database (seeded, browseable at /rolling-stock)
- Billing + entitlements (Lemon Squeezy, free/plus/pro)
- iCal export
- Träwelling check-in integration
- Web push notification infrastructure
- Map visualisation (Maplibre GL + OpenFreeMap tiles)
- PWA manifest

### 🚧 Partially built
- Journal entries + photo upload (backend done, UI minimal)
- Statistics & heatmap page (exists, incomplete)
- Rolling stock auto-detection (`lib/formation/` — Marudor, Swiss OTD, NS, SNCF sources active; RTT pending keys)
- PDF/image trip export (`lib/export/clientExport.ts` exists)
- Polyline fetching for map routes (endpoint exists, not always triggered)

### ⏳ Schema exists, UI missing
- Achievements / badges
- API key management (Pro tier)
- Custom routes
- Interrail pass tracking
- Ticket wallet

### 📝 Referenced but unused
- `ANTHROPIC_API_KEY` in env — AI suggestions not yet implemented

---

## Known issues & decisions log

*Add entries here whenever you make a non-obvious decision or hit a gotcha. Format: date — decision — reason.*

- 2026-03-12 — Chose Lemon Squeezy over Stripe — handles EU VAT automatically as Merchant of Record, no VAT registration needed in each country
- 2026-03-12 — Chose Upstash Redis over Vercel KV — better free tier limits (10k commands/day vs Vercel KV's 3k/day)
- 2026-03-12 — Using `db-hafas` npm package for DB connection search — community-maintained Hafas client, more reliable than scraping DB Navigator
- 2026-03-13 — shadcn/ui re-initialised with style=default, zinc base — initial scaffold had picked up "base-nova" style which lacks the form component
- 2026-03-13 — New user trigger (handle_new_user) derives username from raw_user_meta_data.username at signup; falls back to email-prefix + UUID suffix for OAuth signups where no username is set
- 2026-03-13 — db-hafas is ESM-only; added to serverExternalPackages in next.config.mjs so Next.js doesn't bundle it (Node.js loads it natively via dynamic import in the API route)
- 2026-03-13 — Migrated from db-hafas to db-vendo-client — old HAFAS API was shut down by DB permanently; db-vendo-client uses the DB Navigator API (dbnav profile) with withRetrying() wrapper; p-retry installed as required peer; types/db-vendo-client.d.ts added since the package ships no TypeScript declarations
- 2026-03-13 — Polyline stored as [[lon, lat], [lon, lat], ...] (GeoJSON coordinate pairs) in the `polyline Json?` Prisma field; RouteLayer reads this directly as GeoJSON LineString coordinates
- 2026-03-13 — TripMap is dynamically imported (next/dynamic, ssr: false) in the trip detail page to avoid SSR issues with maplibre-gl; the Map component itself is never conditionally rendered inside TripMap
- 2026-03-13 — Performance audit: added loading.tsx for dashboard, trips/[id], settings/billing (Suspense streaming); added loading prop to TripMap dynamic() to prevent CLS during bundle download; added display:'swap' to Inter font; added 3 DB indexes (trips user+status+created, legs trip+departure, legs status+departure); verified no Supabase data queries run in client components
- 2026-03-13 — Added trip_id_vendo to legs table (migration 20260313000004). LegEditorSheet and AddToTripSheet now save the Vendo tripId on leg creation. polylines/route.ts uses it directly via getTripById() (fast path) instead of re-scanning the departure board (slow path). RouteLayer draws a dashed straight line between origin/dest coords when the real polyline hasn't been fetched yet — ensures something is always visible on the map.
- 2026-03-13 — Switched map tiles from Stadia Maps to OpenFreeMap (tiles.openfreemap.org). Completely free with no API key or tile limits. Works directly with existing MapLibre setup. Using positron style (clean light/grey — coloured route lines stand out clearly).
- 2026-03-14 — Formation APIs active: Marudor (DE, no key, User-Agent required), Swiss OTD (CH, Bearer auth), NS (NL, Ocp-Apim-Subscription-Key), SNCF Navitia (FR, Basic auth: token as username empty password). RTT (UK) pending — keys not yet obtained; source disabled in index.ts with TODO comment. Test script: scripts/testFormation.ts, run with: npx tsx --env-file=.env.local scripts/testFormation.ts
- 2026-03-13 — Replaced db-hafas with db-vendo-client (dbnav profile). Old DB HAFAS API shut down permanently 2025. Vendo wraps DB Navigator + bahn.de APIs. Rate limits stricter than HAFAS — Redis caching is critical. lib/vendo.ts centralises all transit lookups with Redis TTLs (stations 24h, departures 2min, trip 5min, journeys 5min). API routes under /api/search/* and /api/stations/search all enforce 30 req/user/min via Upstash Ratelimit (slidingWindow); HafasError or any vendo error → 503 { error: 'service_unavailable', retryAfter: 30 }.
- 2026-03-13 — Trip export (PDF + image) is entirely client-side: screenshots the live Maplibre WebGL canvas directly (preserveDrawingBuffer: true on the Map component), draws info strip on a 1200×630 Canvas, then triggers a download. PDF uses jsPDF with the map image + leg table. No server routes, no external APIs needed. html2canvas and jsPDF installed; exports lazy-imported on demand.
- 2026-03-14 — Formation data uses a multi-source architecture in lib/formation/. Single entrypoint: getFormation(leg) → FormationResult | null. Sources tried in order: (1) Marudor reihung v4 /formation endpoint — DB ICE/IC/EC/EN/NJ, no key needed, Baureihe mapped via BAUREIHE_NAMES to series+amenities; (2) Swiss Open Transport Data — SBB (IBNR prefix 85), key in SWISS_OTD_API_KEY; (3) NS virtual-train-api — NL (IBNR prefix 84), key in NS_API_KEY; (4) SNCF Navitia — TGV/OUIGO/TER/SNCF, key in NAVITIA_API_KEY; (5) Realtime Trains — UK (IBNR prefix 70), credentials in RTT_USERNAME/RTT_PASSWORD; (6) static lib/rollingStock.ts — guaranteed fallback for ÖBB/Trenitalia/Renfe/Eurostar/others. All results cached 6h in Redis. All sources fail silently — never break the leg card UI. GET /api/legs/[id]/rolling-stock now returns { formation: FormationResult|null, manualLink: LegRollingStock|null }. LegCard uses useFormation(legId) for server result with instant identifyRollingStock(leg) client-side fallback while query loads.
- 2026-03-14 — Renamed project from Railtripper to Railtrax. All branding, package.json name, manifest, User-Agent strings, and export filenames updated.
- 2026-03-14 — Migrated deployment from Vercel Hobby to Render.com. render.yaml at root defines the web service (Node 20, build: npm install && npm run build, start: npm start). No serverless function timeout limit — standard Node.js timeouts apply. Remove any Vercel-specific workarounds (Edge Function splits, 10s timeout hacks).
- 2026-03-14 — Upgraded to Next.js 16 / React 19. Dynamic route params and searchParams are now Promises and must be awaited: `const { id } = await params` and `const q = (await searchParams)?.q`.
- 2026-03-14 — Rebranded to Railtrax with Midnight Blue design system (#080d1a base, #4f8ef7 brand blue). Design tokens in globals.css (hex custom properties + shadcn HSL variables mapped to palette) and tailwind.config.ts (brand/surface/tx color scales). Logo component at components/ui/Logo.tsx (SVG track + station dots). Landing page at /. Auth pages use Logo size="lg" above the card. Sidebar uses Logo. OG image uses dark background. PWA manifest theme_color updated to #080d1a.
