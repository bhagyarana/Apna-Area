# Session Handoff (`docs/HANDOFF.md`)

## 1. Now
- **Current phase:** `phase/p1-map` (all Phase 1 code, unit/E2E tests, Review Gate `98/100`, and 3-round Design Critic `8.7/10` complete)
- **Current tag:** `p0-skeleton` on `main` (`ba35719`)
- **Live URL & revision:** Local production build verified at `http://127.0.0.1:8080`; Cloud Run `asia-south1` deploy pending `gcloud` CLI on Windows `PATH`.

## 2. Done This Session
- Merged Phase 0 (`ba35719`, tag `p0-skeleton`) to `main`.
- `98cc376`: Added `shared/src/http.ts`, Zod world schemas in `shared/src/types.ts`, `server/src/places/filter.ts`, `server/src/routes/places.ts` (`GET /api/places`), `scripts/verify-places.ts`, `scripts/build-corridor.ts`, and `server/src/__tests__/places.test.ts`.
- `f4f896b`: Built `web/src/map/OrrMap.tsx`, `web/src/map/CorridorLayer.tsx`, `web/src/map/CameraTour.tsx`, `web/src/map/FallbackCorridorCanvas.tsx`, and `web/src/styles/map.css`.
- `06554cb`: Built `web/src/picker/OfficePicker.tsx` (`@ui-sdk/react` combobox, `Ctrl+K`, Selected Destination Card), `web/src/picker/TunePopover.tsx`, `web/src/state/sessionStore.ts`, and `web/src/styles/{picker,tune,shell}.css`.
- `613b0e8`: Added keyboard-only `e2e/picker.spec.ts` and logged 3-round Design Critic scores (`4.5` -> `6.8` -> `8.7/10`) in `docs/DESIGN_SCORES.md`.

## 3. Decisions Made
- **ADR-011:** Used isomorphic FNV-1a fingerprinting in `shared/src/logger.ts` for browser + server compatibility.
- **ADR-012:** Rendered `CorridorLayer` via `google.maps.OverlayView` SVG pane above the CSS-desaturated map `<canvas>`.
- **ADR-013:** Filtered out under-construction ORR Blue Line metro stations in `server/src/places/filter.ts`.

## 4. Open Questions
- Enable **Places API (New)** (`places.googleapis.com`) and **Routes API** (`routes.googleapis.com`) in Google Cloud Console (`APIs & Services -> Library` & `Credentials`) for `MAPS_SERVER_KEY` in `.env`.
- Install `gcloud` CLI on Windows `PATH` (`gcloud auth login`, set project, store `gemini-api-key` and `maps-browser-key` in Secret Manager) when ready to run `ship-phase` to Cloud Run.

## 5. Known Issues
- **403 on Places/Routes scripts:** Running `npx tsx scripts/verify-places.ts` or `npx tsx scripts/build-corridor.ts` currently returns `HTTP 403 PERMISSION_DENIED` (`reason: "ACCESS_DENIED"`) until both APIs are enabled in GCP Console (`GEMINI_API_KEY` and `MAPS_BROWSER_KEY` Maps JS tiles already return `200 OK`).
- **Carry-forward UI polish (`P2`/`P6`):** Swap sparkle icon on `Build my first week` CTA (`web/src/picker/OfficePicker.tsx`), soften `Live` pill border (`web/src/components/HealthBadge.tsx`), and optionally attach a Cloud Map Style ID to hide `poi.business`.

## 6. File State
- Working tree clean on `phase/p1-map` (`.env` gitignored locally; `data/orr/places.json` and `data/orr/corridor.geojson` uncommitted until live scripts run).

## 7. The Single Next Task
- Once Places API (New) and Routes API are enabled, run `npx tsx scripts/verify-places.ts` and `npx tsx scripts/build-corridor.ts` so real `data/orr/places.json` and `data/orr/corridor.geojson` pass `npm run check`, update `docs/DATA.md`, merge `phase/p1-map` (`--no-ff`, tag `p1-map`), and begin Phase 2 (`phase/p2-director`).

## 8. Resume Checklist
1. `AGENTS.md`
2. `PROJECT_BRIEF.md`
3. `docs/HANDOFF.md`
4. `docs/TASKS.md`
5. `Design.md`
6. `.agents/rules/gemini-models.md`
