# Session Handoff (`docs/HANDOFF.md`)

## 1. Now
- **Current phase:** Phase 1 (`phase/p1-map` code, tests, Review Gate `98/100`, and 3-round Design Critic `8.7/10` complete; paused at **Check-in #2b** for 2 GCP Console API toggles to run `scripts/verify-places.ts` + `scripts/build-corridor.ts`)
- **Current tag:** `p0-skeleton` on `main` (`p1-map` merges and tags immediately once `data/orr/places.json` and `data/orr/corridor.geojson` are generated)
- **Live URL & revision:** Local production server verified on `http://127.0.0.1:8080` with live Google Maps JS dark Bengaluru vector tiles; Cloud Run `asia-south1` deploy queued on `gcloud` CLI setup.

## 2. Done This Session
- Merged Phase 0 (`p0-skeleton`) to `main` after user approval at Check-in #2a.
- Built all Phase 1 (`phase/p1-map`) server, script, shared, map, and office picker modules (`<= 250` lines per file, zero `console.log`, zero em dashes, zero secrets):
  - `shared/src/http.ts` (`fetchWithRetry`), `shared/src/types.ts` (Zod schemas for verified places & GeoJSON corridor), `shared/src/config.ts` (`ORR_NEIGHBOURHOOD_ANCHORS`, `enableMapPicker: true`).
  - `server/src/places/filter.ts` (Haversine distance, `ORR_BBOX` guard, operational filter, exclusion of under-construction Namma Metro Phase 2A ORR Blue Line stations, dedupe, and Google polyline decoder) + `GET /api/places` (`server/src/routes/places.ts`).
  - `scripts/verify-places.ts` (Places API (New) Text Search Pro field mask) and `scripts/build-corridor.ts` (Routes API `computeRoutes` polyline -> GeoJSON).
  - `web/src/map/OrrMap.tsx`, `CorridorLayer.tsx` (DOM `OverlayView` SVG `#FF4FA0` spline above desaturated dark map canvas), `CameraTour.tsx` (8.8s 4-stop skippable tour), `FallbackCorridorCanvas.tsx`.
  - `web/src/picker/OfficePicker.tsx` (`@ui-sdk/react` `Combobox` + `Toolbar`, `Ctrl+K`, 6 chips, Selected Destination Card with `Switch` + `Build my first week`), `TunePopover.tsx`, `sessionStore.ts`, and `e2e/picker.spec.ts`.
- Passed independent Code Review Gate (`PASS`, `98/100`) and 3-round screenshot-only Design Critic (`4.5/10` -> `6.8/10` -> `8.7/10`, ranking ahead of `levels.fyi/atlas/bengaluru`).
- Verified `npm run build`, `npm run check` (`6/6` Vitest suites, `18/18` tests, `0` ESLint warnings, `0` TS errors), and `npm run test:smoke` (`2/2` Playwright Chromium E2E tests including keyboard-only picker flow).

## 3. Decisions Made
- Rendered `CorridorLayer` via `google.maps.OverlayView` SVG `<path>` in `overlayLayer` so CSS canvas grading (`saturate(0.14) brightness(0.66)`) quiets background map tiles without dulling the `#FF4FA0` corridor glow or `#FFD24A` ground-anchored `<AdvancedMarker>` pins.
- Excluded under-construction ORR Blue Line metro stations in `server/src/places/filter.ts` so `transit_stop` missions only reference active BMTC stops or operational metro stations.

## 4. Open External Prerequisites (Action Needed Before Merging `p1-map`)
1. **Enable 2 APIs in Google Cloud Console (`APIs & Services -> Library` & `Credentials`):**
   - Enable **Places API (New)** (`places.googleapis.com`) and **Routes API** (`routes.googleapis.com`) on the project owning `MAPS_SERVER_KEY` in `.env` (currently returning `403 PERMISSION_DENIED` / `ACCESS_DENIED`). Note: `GEMINI_API_KEY` (`200 OK`) and `MAPS_BROWSER_KEY` for Maps JavaScript API (`200 OK`) are already working.
2. **Cloud Run CLI (`gcloud`):**
   - Install/add `gcloud` to Windows `PATH`, run `gcloud auth login`, set project, and store `gemini-api-key` + `maps-browser-key` in Secret Manager so `ship-phase` can deploy to Cloud Run `asia-south1`.

## 5. Known Minor UI Carry-Forward Notes (Queued for `P2`/`P6`)
- Swap sparkle icon on `Build my first week` CTA to a right-arrow/play glyph (`OfficePicker.tsx`).
- Soften `Live` health indicator border so `Tune` clearly reads as the sole interactive button in the top-right cluster.
- Optionally bind a Cloud Map Style ID in GCP Console to hide native `poi.business` icons underneath custom pins.

## 6. File State
- All Phase 1 code, tests, and docs committed cleanly on branch `phase/p1-map`. No fake data committed (`data/orr/places.json` and `data/orr/corridor.geojson` wait for live script execution).

## 7. The Single Next Task
- As soon as `Places API (New)` and `Routes API` are enabled in Google Cloud Console: run `npx tsx scripts/verify-places.ts` and `npx tsx scripts/build-corridor.ts`, update `docs/DATA.md` counts, commit `data/orr/*.json`, merge `phase/p1-map` (`--no-ff`, tag `p1-map`), and start **Phase 2 (`phase/p2-director`: Gemini 4 Neon Week One Director)**.

## 8. Resume Checklist
1. `AGENTS.md`
2. `PROJECT_BRIEF.md`
3. `docs/HANDOFF.md`
4. `docs/TASKS.md`
5. `Design.md`
