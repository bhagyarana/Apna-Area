# Session Handoff (`docs/HANDOFF.md`)

## 1. Now
- **Current phase:** Ready to start `phase/p2-director` (Phase 1 shipped and tagged)
- **Current tag:** `p1-map` on `main`
- **Live URL & revision:** `https://apna-area-481049877093.asia-south1.run.app` (alias `https://apna-area-qhtgwpzhpq-el.a.run.app`), revision `apna-area-00002-msn` (`placesLoaded: 121`, `geminiConfigured: true`, `mapsConfigured: true`, Playwright live smoke passing).

## 2. Done This Session
- Enabled `places.googleapis.com`, `routes.googleapis.com`, `run.googleapis.com`, `secretmanager.googleapis.com`, `cloudbuild.googleapis.com`, and `artifactregistry.googleapis.com` on `geminisprints26blr-3880`.
- Generated real `data/orr/corridor.geojson` (`545` points, `15,080` m via Routes API v2) and `data/orr/places.json` (`121` verified operational ORR places across 6 categories and 7 neighbourhoods via Places API New), tightened `isNonCampusTechParkSubvenue` in `server/src/places/filter.ts`, and updated `docs/DATA.md`.
- Added `COPY --chown=node:node data ./data` to `Dockerfile`, provisioned Secret Manager keys (`gemini-api-key`, `maps-browser-key`, `maps-server-key`), deployed `apna-area-00002-msn` to Cloud Run `asia-south1`, verified live `/api/health` + Playwright smoke, and merged `phase/p1-map` (`--no-ff`, tag `p1-map`) to `main`.

## 3. Decisions Made
- **ADR-011:** Used isomorphic FNV-1a fingerprinting in `shared/src/logger.ts` for browser + server compatibility.
- **ADR-012:** Rendered `CorridorLayer` via `google.maps.OverlayView` SVG pane above the CSS-desaturated map `<canvas>`.
- **ADR-013:** Filtered out under-construction ORR Blue Line metro stations and non-campus sub-venues (`isNonCampusTechParkSubvenue`) in `server/src/places/filter.ts`.

## 4. Open Questions
- Confirm Phase 2 (`phase/p2-director`) plan before building `T2.1` through `T2.5`.

## 5. Known Issues
- **Carry-forward UI polish (included in `P2`):** Swap sparkle icon on `Build my first week` CTA (`web/src/picker/OfficePicker.tsx`) to a right-arrow/play glyph, and soften the `Live` status pill hairline (`web/src/components/HealthBadge.tsx` / `web/src/styles/shell.css`) relative to the interactive `Tune` control.

## 6. File State
- Clean working tree on `main` at tag `p1-map` (pushed to `origin` with tags).

## 7. The Single Next Task
- Execute **Phase 2 (`phase/p2-director`)**: lock `WeekPlan` / `Mission` / `WorldProgressEvent` Zod contracts (`T2.1`), build `candidates.ts` + `verify.ts` (`T2.2`), wire `gemini-4-neon` (`thinking_level: "medium"`) structured output + `POST /api/world` SSE + `fallback-plans.json` (`T2.3`), build `ProgressChips`, `WeekProgressBar`, and `MissionCard` plus the 2 UI polish items (`T2.4`), and run the Critic + `ship-phase` (`T2.5`).

## 8. Resume Checklist
1. `AGENTS.md`
2. `PROJECT_BRIEF.md`
3. `docs/HANDOFF.md`
4. `docs/TASKS.md`
5. `Design.md`
6. `.agents/rules/gemini-models.md`
