# Community Trips Feature — Implementation Plan

## Overview
Users can publish trips to a public community feed. Others can browse, rate, like, comment, and "Nachfahren" (copy with real connections).

## Files to Create/Modify

### 1. Prisma Schema (prisma/schema.prisma)
**Already modified** — added CommunityTrip, CommunityRating, CommunityLike, CommunityComment, CommentLike, CommunityPhoto models.
Need to run: `npx prisma db push`

### 2. API Routes

#### `app/api/community/trips/route.ts`
- GET: List public community trips with pagination + sorting (popular/new/top)
- POST: Publish a trip to community (auth required)

#### `app/api/community/trips/[id]/route.ts`
- GET: Single trip detail with all relations, avgRating, userRating, userLiked

#### `app/api/community/trips/[id]/rate/route.ts`
- POST: Upsert rating (1-5), auth required

#### `app/api/community/trips/[id]/like/route.ts`
- POST: Toggle like, auth required

#### `app/api/community/trips/[id]/comments/route.ts`
- POST: Create comment, auth required

#### `app/api/community/trips/[id]/copy/route.ts`
- POST: "Nachfahren" — search connections, create trip copy
- If no selectedJourneyIndex: return journey options
- If selectedJourneyIndex: create new trip with legs

#### `app/api/community/trips/[id]/photos/route.ts`
- POST: Upload photo to Supabase Storage, create CommunityPhoto record

### 3. Components

#### `components/community/CommunityTripCard.tsx`
- Card with map thumbnail, title, creator avatar + name
- Stats: km, duration, legs
- Star rating badge, like count
- Click → navigate to /entdecken/[id]

#### `components/community/TrainLegsSection.tsx`
- Collapsible list of train legs
- Each row: train badge, from → to, time range, duration

#### `components/community/PhotosSection.tsx`
- Photo grid (3 columns)
- "+" button opens file picker → upload to Supabase Storage

#### `components/community/CommentsSection.tsx`
- Textarea + send button
- List of comments with avatar, name, time, text
- Like button per comment
- If not logged in: show "Anmelden um zu kommentieren"

#### `components/community/NachfahrenModal.tsx`
- 3-step modal:
  - Step 1: Date picker + time picker → "Züge suchen"
  - Step 2: Shows 2-3 journey options, radio-select one → "Reise erstellen"
  - Step 3: Success screen with checkmark → "Zur Reise →"
- Progress bar at top (33% → 66% → 100%)

#### `components/community/PublishTripModal.tsx`
- Dropdown to select from user's trips
- Description textarea
- Public/Private toggle
- "Veröffentlichen" button → POST /api/community/trips

### 4. Pages

#### `app/(app)/entdecken/page.tsx`
- Community feed with sort tabs (Beliebt / Neu / Top bewertet)
- Grid of CommunityTripCard components
- "Reise teilen" button → PublishTripModal
- Loading skeletons

#### `app/(app)/entdecken/[id]/page.tsx`
- Full detail page:
  1. Route header (Von → Nach + train badges)
  2. Map (TripMapCard with legs)
  3. Stats (km, duration, countries, CO₂)
  4. Action buttons (Nachfahren, Like, Teilen, Bewerten)
  5. Description text
  6. Photos grid
  7. Train legs list
  8. Comments section

### 5. Navigation

#### `components/shared/SidebarNav.tsx`
- Add "Entdecken" link with Compass icon
- Position: between "Suche" and "Live Abfahrten"

#### `app/(app)/trips/[id]/page.tsx`
- Add "In Community teilen" button in header actions row
- If trip already has communityTrip: show "Öffentlich" badge
- If not: show button → opens PublishTripModal

## Execution Order
1. Run `npx prisma db push` (needs real DATABASE_URL)
2. Create all API routes
3. Create all components
4. Create pages
5. Update navigation
6. Add publish button to trip detail
7. `npm run build`

## Notes
- Prisma types won't resolve until `prisma generate` is run
- All Prisma errors in API routes are expected until DB push
- The `photos` bucket needs to exist in Supabase Storage
