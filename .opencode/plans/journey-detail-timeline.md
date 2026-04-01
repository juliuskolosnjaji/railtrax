# Plan: Redesign JourneyDetailSheet as Continuous Timeline

## Files to modify (4 files)

### 1. `lib/vendo.ts` — Add Stop interface + stopovers to searchJourneys

**a) Add Stop interface** (insert before JourneyLeg):
```ts
export interface Stop {
  name: string
  ibnr: string
  plannedArrival: string | null
  actualArrival: string | null
  plannedDeparture: string | null
  actualDeparture: string | null
  platform: string | null
  cancelled: boolean
}
```

**b) Extend JourneyLeg** — add `stopovers: Stop[]` field

**c) In client.journeys() call** — add `stopovers: true`

**d) In the leg mapping** — extract stopovers:
```ts
const allStops = (l.stopovers as any[] ?? [])
const originId = l.origin?.id
const destId = l.destination?.id
const midStops = allStops.filter((s: any) =>
  s.stop?.id !== originId && s.stop?.id !== destId
).map((s: any): Stop => ({
  name: s.stop?.name ?? '',
  ibnr: s.stop?.id ?? '',
  plannedArrival: s.plannedArrival ?? null,
  actualArrival: s.actualArrival ?? null,
  plannedDeparture: s.plannedDeparture ?? null,
  actualDeparture: s.actualDeparture ?? null,
  platform: s.platform ?? null,
  cancelled: s.cancelled ?? false,
}))
```

Add `stopovers: midStops` to JourneyLeg map output.

---

### 2. `app/(app)/search/page.tsx` — Wire up stopovers + trip picker

**a) Update convertToDetailJourney** (lines 48-65):
Add `stopovers: (leg as any).stopovers ?? []` to mapped legs

**b) Update onAddToTrip** (lines 1115-1117):
```ts
onAddToTrip={() => {
  setDetailJourney(null)
  setPickerJourney(detailJourney)
}}
```

---

### 3. `components/trains/JourneyDetailSheet.tsx` — Full rewrite

Replace entire 369-line file with new continuous timeline design.

Key changes:
- Single vertical timeline (24px column + content)
- Row/Dot/Line primitive components
- Expandable intermediate stops
- Inline transfer badges
- Simplified props: `onAddToTrip: () => void`
- Remove: card blocks, nested TrainDetailSheet, custom trip picker

---

### 4. Type check + commit

```bash
npx tsc --noEmit
git add lib/vendo.ts app/\(app\)/search/page.tsx components/trains/JourneyDetailSheet.tsx
git commit -m "feat: redesign JourneyDetailSheet as continuous timeline with via stopovers"
git push
```
