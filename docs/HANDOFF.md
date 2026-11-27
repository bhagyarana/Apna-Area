# Session Handoff (`docs/HANDOFF.md`)

## 1. Now
- **Current phase:** `phase/p2-director` (all Phase 2 code, unit/contract/E2E tests, Code Review Gate `PASS 96/100` + fixes, and 3-round Design Critic `9.3/10` desktop / `8.7/10` overall complete)
- **Current tag:** `p1-map` on `main` (`fed66a2`), with `p2-dir` no-traffic preview deployed on Cloud Run (`asia-south1`) awaiting `"merge"` for `p2-director`.
- **Live URL & revision:** Production `main` at `https://apna-area-481049877093.asia-south1.run.app` (`apna-area-00002-msn`); Phase 2 preview at `https://p2-dir---apna-area-qhtgwpzhpq-el.a.run.app`.

## 2. Done This Session
- Shipped Phase 1 (`p1-map`, `fed66a2`) with `121` verified ORR places (`data/orr/places.json`) and `545`-point corridor (`data/orr/corridor.geojson`) to Cloud Run `asia-south1`.
- Built `T2.1` (`shared/src/world.ts`, `DIRECTOR_CONFIG` in `shared/src/config.ts`), `T2.2` (`server/src/world/candidates.ts`, `server/src/world/verify.ts`, `verify.test.ts`), and `T2.3` (`server/src/world/{schema,prompt,runner,director,cache}.ts`, `POST /api/world` SSE + JSON in `server/src/routes/world.ts`, real 12-office `data/orr/fallback-plans.json`, and `world.test.ts`).
- Built `T2.4` (`ProgressChips.tsx`, `WeekProgressBar.tsx`, `MissionCard.tsx`, `useDirectorStream.ts`, `MissionMarkers.tsx`, `CameraGlideController.tsx`, `hud.css`, `mission.css`, `e2e/director.spec.ts`) plus both Phase 1 carry-forward UI polish items.
- Ran `T2.5` Code Review Gate (`PASS 96/100`, fixed all 3 minor items) and 3-round Screenshot Design Critic (`7.4` -> `8.3` -> `8.7/10`, `9.3/10` desktop), updated `Design.md`, `docs/DESIGN_SCORES.md`, `docs/DECISIONS.md`, `docs/PROMPT_LOG.md`, and `docs/TASKS.md`.

## 3. Decisions Made
- **ADR-011..013:** Isomorphic logger fingerprinting, DOM `OverlayView` SVG corridor spline, and ORR Blue Line under-construction metro exclusion.
- **ADR-014:** Set `maxPromptCandidates = 15`, `< 10 words` per text field on `gemini-4-neon` (`thinking_level: "medium"`), `TIMEOUTS_MS.worldDirector = 32_000`, and `FallbackPlansMapSchema` inside `@apna-area/shared`.

## 4. Open Questions
- **Check-in #3:** Try `Build my first week` on the `p2` Cloud Run preview URL and confirm `"merge"` to promote `p2` to 100% traffic (`tag: p2-director`) and begin **Phase 3a (`phase/p3a-english` · Gemini 3.8 Live English Voice NPCs)**.

## 5. Known Issues
- **Carry-forward UI polish (`P3a`):** When `enableVoiceNpcs` turns on in `P3a` and `Talk with <NPC>` becomes the primary `--accent-pink` CTA in `MissionCard`, step `Next stop` down to a quiet secondary control so two pink buttons never compete.

## 6. File State
- All Phase 2 code, tests (`27/27` Vitest, `3/3` Playwright E2E), and `data/orr/fallback-plans.json` committed on `phase/p2-director`.

## 7. The Single Next Task
- Promote `p2` Cloud Run preview to 100% live traffic (`merge: phase/p2-director`, tag `p2-director`) upon user confirmation, then start **Phase 3a (`phase/p3a-english`)**: `POST /api/live-token` (`v1beta` `authTokens.create` locked to `gemini-3.8-live`), 16 kHz / 24 kHz PCM AudioWorklet + `useLiveSession`, Nano Banana 2.1 NPC portraits, and `MissionDialog` + `Captions`.

## 8. Resume Checklist
1. `AGENTS.md`
2. `PROJECT_BRIEF.md`
3. `docs/HANDOFF.md`
4. `docs/TASKS.md`
5. `Design.md`
6. `.agents/rules/gemini-models.md`
