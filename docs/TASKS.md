# Phase Board & Ticket Plan (`docs/TASKS.md`)

Every phase runs on its own short-lived branch (`phase/<step>`) off `main`, merges tickets via `--no-ff`, deploys a preview to Cloud Run, passes smoke tests, and merges to `main` with a git tag via the `ship-phase` skill. Every ticket stays under 45 minutes.

## Foundation (`phase/foundation-docs` -> tag `v0.1-docs`)
- [x] `T-SETUP`: `.gitignore` committed first (`5b8b64f`), agent rules/skills copied (`e693716`).
- [x] `T-DOCS`: All 11 living docs drafted, self-checked, and committed.
- [x] `T-REVIEW`: Adversarial review (`03-adversarial-review.md`) run on fresh Carbon agent and top 6 fixes applied.
- [x] `T-DISCOVER`: Design Discover (`04-design-discover.md`) 3 seeded HTML variations created in `design/discover/` and Section 3 of `Design.md` locked.

---

## Phase 0 · Skeleton (`phase/p0-skeleton` -> tag `p0-skeleton`)
**Goal:** A themed empty Apna Area shell running on a public Cloud Run URL with `/api/health` green and Playwright smoke test passing.

| Ticket | Mode | Tier | Est. | Allowed Files | Goal & Proof Test |
|---|---|---|---|---|---|
| `T0.1` | Lead first | Neon | 20m | `package.json`, `tsconfig.base.json`, `eslint.config.js`, `vitest.config.ts`, `web/package.json`, `server/package.json`, `shared/package.json` | [x] Monorepo npm workspaces, strict TypeScript, `dev`, `build`, `check`, `start` scripts. Proof: `npm run check` exits 0. |
| `T0.2` | Parallel A | Hydrogen | 25m | `shared/src/config.ts`, `shared/src/types.ts`, `shared/src/logger.ts`, `shared/src/__tests__/*` | [x] `MODEL_IDS`, `ORR_BBOX`, `ENABLED_LANGUAGES = ["en"]`, Zod schemas, structured JSON logger redacting transcripts/audio/secrets. Proof: `vitest run shared`. |
| `T0.3` | Parallel B | Hydrogen | 25m | `server/src/index.ts`, `server/src/routes/health.ts`, `server/src/routes/config.ts`, `server/src/__tests__/health.test.ts` | [x] Fastify server on `PORT` (`8080`) with `trustProxy: true`, per-IP rate limit (`60/min`), `GET /api/health` (`commit`, `builtAt`), `GET /api/config`, static SPA fallback. Proof: `vitest run server`. |
| `T0.4` | Parallel C | Hydrogen | 25m | `web/index.html`, `web/vite.config.ts`, `web/src/main.tsx`, `web/src/App.tsx`, `web/src/styles/tokens.css` | [x] ORR Neon Dusk CSS tokens, Anton + Hanken Grotesk fonts, wordmark, tagline, live `/api/health` teal status dot, reduced-motion support. Proof: `npm run build --workspace=web`. |
| `T0.5` | Sequential | Hydrogen | 20m | `Dockerfile`, `.dockerignore`, `playwright.live.config.ts`, `e2e/smoke.spec.ts` | [x] Multi-stage `node:22-slim` non-root image + Playwright smoke test asserting wordmark and green health dot. Proof: Playwright smoke passes against local preview. |
| `T0.6` | Lead gate | Neon | 20m | `docs/HANDOFF.md`, `docs/TASKS.md` | [x] Merged `--no-ff` to `main` and tagged `p0-skeleton` (**Check-in #2a approved**; Cloud Run `asia-south1` deploy queued on `gcloud` CLI setup). |

---

## Phase 1 · The Map & Verified World (`phase/p1-map` -> tag `p1-map`)
**Goal:** Deterministic eastern ORR vector map built strictly from Places API (New) verified records, skippable camera tour, and accessible office picker.

| Ticket | Mode | Tier | Est. | Allowed Files | Goal & Proof Test |
|---|---|---|---|---|---|
| `T1.1` | Parallel A | Hydrogen | 35m | `scripts/verify-places.ts`, `scripts/build-corridor.ts`, `data/orr/places.json`, `data/orr/corridor.geojson`, `docs/DATA.md`, `server/src/routes/places.ts`, `server/src/__tests__/places.test.ts` | [x] Verified `data/orr/places.json` (`121` operational places across 6 categories and 7 neighbourhoods) + `data/orr/corridor.geojson` (`545` points, `15,080` m), `GET /api/places`, and `19/19` unit tests passing. |
| `T1.2` | Parallel B | Hydrogen | 35m | `web/src/map/OrrMap.tsx`, `web/src/map/CorridorLayer.tsx`, `web/src/map/CameraTour.tsx`, `web/src/map/FallbackCorridorCanvas.tsx` | [x] `@vis.gl/react-google-maps` dark vector map (`internalUsageAttributionIds={["gmp_git_agentskills_v1"]}`, `mapId`, `clickableIcons={false}`), DOM `OverlayView` `#FF4FA0` corridor spline, `ORR_BBOX` restriction, 8.8s 4-stop skippable camera flight (`Esc` or click). Proof: renders cleanly with zero console warnings. |
| `T1.3` | Sequential | Hydrogen | 30m | `web/src/picker/OfficePicker.tsx`, `web/src/picker/TunePopover.tsx`, `e2e/picker.spec.ts` | [x] Single question `"WHICH OFFICE ARE YOU JOINING?"`, `@ui-sdk/react` combobox (`Cmd/Ctrl+K`), 6 chips, Selected Destination Card (`Switch` + `Build my first week`), asymmetric camera glide + ground-anchored `#FFD24A` pin, `localStorage` persistence. Proof: `e2e/picker.spec.ts` keyboard-only Playwright test passes. |
| `T1.4` | Lead + Critic | Carbon / Neon | 20m | `Design.md`, `docs/DESIGN_SCORES.md`, `docs/HANDOFF.md` | [x] Code Review Gate `PASS` (`98/100`) + 3-round screenshot Design Critic (`4.5` -> `6.8` -> `8.7/10`, ahead of `levels.fyi`) + `p1-map` tagged on `main` -> **Check-in #2b (Break)**. |

---

## Phase 2 · The Director Agent (`phase/p2-director` -> tag `p2-director`)
**Goal:** Picking any verified office generates a verified 5-mission Week One in under 12 seconds with live SSE progress chips and staggered map pins.

| Ticket | Mode | Tier | Est. | Allowed Files | Goal & Proof Test |
|---|---|---|---|---|---|
| `T2.1` | Lead first | Neon | 15m | `shared/src/types.ts` | [x] Locked `Mission`, `WeekPlan`, `WorldRequest`, `WorldProgressEvent`, and `FallbackPlansMapSchema` in `shared/src/world.ts` + `DIRECTOR_CONFIG` in `shared/src/config.ts`. |
| `T2.2` | Parallel A | Hydrogen | 25m | `server/src/world/candidates.ts`, `server/src/world/verify.ts`, `server/src/__tests__/verify.test.ts` | [x] Pure 3 km -> 5 km deterministic candidate selector and strict `verifyWeekPlan` rejecting unknown/duplicate/out-of-box IDs, duplicate roles, em dashes, and money claims. |
| `T2.3` | Parallel B | Neon | 35m | `server/src/world/schema.ts`, `server/src/world/director.ts`, `server/src/world/cache.ts`, `data/orr/fallback-plans.json`, `server/src/routes/world.ts`, `server/src/__tests__/world.test.ts` | [x] `gemini-4-neon` (`thinking_level: "medium"`, `store: false`) structured output with dynamic `placeId` enum, verifier retry -> `gemini-4-hydrogen` fallback -> real 12-office `fallback-plans.json` (`replayed: true`), 2h LRU cache, SSE + JSON route, and contract tests. |
| `T2.4` | Parallel C | Hydrogen | 30m | `web/src/hud/ProgressChips.tsx`, `web/src/hud/WeekProgressBar.tsx`, `web/src/hud/MissionCard.tsx` | [x] SSE chip stack with spinner + teal checks, 60ms staggered `1..5` mission pins, topbar-aligned 5-step `WeekProgressBar`, Fare-Meter `MissionCard` with `place_id` provenance tooltip, plus both P1 UI polish items and `e2e/director.spec.ts`. |
| `T2.5` | Lead + Critic | Carbon / Neon | 20m | `Design.md`, `docs/DESIGN_SCORES.md`, `docs/HANDOFF.md` | [x] Code Review Gate `PASS` (`96/100` + all 3 minor items fixed), 3-round Screenshot Design Critic (`7.4` -> `8.3` -> `8.7/10`, `9.3/10` Desktop), and `ship-phase` -> tag `p2-director` -> **Check-in #3 (Break)**. |

---

## Phase 3 · Voice NPCs (`p3a-english` -> `p3b-hindi` -> `p3c-kannada`)

### Phase 3a · English Voice Pipeline (`phase/p3a-english` -> tag `p3a-english`)
| Ticket | Mode | Tier | Est. | Allowed Files | Goal & Proof Test |
|---|---|---|---|---|---|
| `T3a.1` | Parallel A | Neon | 30m | `server/src/live/persona.ts`, `server/src/live/tools.ts`, `server/src/live/token.ts`, `server/src/routes/liveToken.ts`, `server/src/__tests__/persona.test.ts` | [x] Live audio proof (`632-823 ms` first-audio latency across all 5 roles) + `POST /api/live-token` (`v1alpha` `authTokens.create` locked to `gemini-3.8-live`, fictional NPC persona, `NON_BLOCKING` tools `give_hint`, `complete_objective`, and `mark_phrase_attempt` gated on `"kn"`). Proof: `persona.test.ts` + live token probe passing. |
| `T3a.2` | Parallel B | Neon | 35m | `web/src/live/pcmWorklet.ts`, `web/src/live/useLiveSession.ts`, `web/src/live/__tests__/resample.test.ts` | [x] Inline Blob AudioWorklet resampling mic input to 16 kHz 16-bit PCM, 24 kHz gapless PCM playback queue with barge-in flush on `interrupted: true`, gesture-preserved `AudioContext`, Spacebar mute toggle, 90s cap, and deferred `87.6 KB` `@google/genai` chunk. Proof: `resample.test.ts` + live round-trip passing. |
| `T3a.3` | Parallel C | Hydrogen | 30m | `scripts/generate-portraits.ts`, `web/public/art/npcs/*`, `web/src/live/MissionDialog.tsx`, `web/src/live/Captions.tsx` | [x] Build-time Nano Banana 2.1 gender-matched `256x256` WebP portraits for all 5 NPC roles (`10` variants + `5` defaults) + Smoked-Acrylic Cinema Voice Ribbon (`72px` amplitude mic orb, 3-tier captions, docked keyboard fallback, `SCENE COMPLETE` win state). Proof: `e2e/live.spec.ts` passes with zero console errors. |
| `T3a.4` | Lead + Critic | Carbon / Neon | 20m | `docs/TESTING.md`, `docs/DESIGN_SCORES.md`, `docs/HANDOFF.md` | [x] Code Review Gate `PASS` (`93/100` + all 4 minor items fixed) + 2-round Screenshot Design Critic (`7.8` -> `9.4/10` overall: `9.4` Desktop / `9.3` Mobile) + Cloud Run `p3a-eng` preview smoke tested. |

### Phase 3b · Hindi & Code-Switching (`phase/p3b-hindi` -> tag `p3b-hindi`)
| Ticket | Mode | Tier | Est. | Allowed Files | Goal & Proof Test |
|---|---|---|---|---|---|
| `T3b.1` | Lead | Neon | 25m | `shared/src/config.ts`, `server/src/live/persona.ts`, `web/src/picker/TunePopover.tsx`, `web/index.html`, `docs/TESTING.md` | [x] Set `ENABLED_LANGUAGES = ["en", "hi"]`, loaded `Noto Sans Devanagari` (`400..700`), wired `Tune · EN/HI/HI+EN` + `resolveComfortLanguage`, and verified live Hindi (`765 ms`) + Hinglish (`529 ms`) on `gemini-3.8-live` -> Cloud Run `p3b-hin` preview smoke tested. |

### Phase 3c · Kannada & Survival Phrases (`phase/p3c-kannada` -> tag `p3c-kannada`)
| Ticket | Mode | Tier | Est. | Allowed Files | Goal & Proof Test |
|---|---|---|---|---|---|
| `T3c.1` | Parallel A | Carbon / Neon | 25m | `data/phrases.json`, `server/src/live/persona.ts`, `shared/src/config.ts` | [x] Drafted & linguistically audited 30 speaker-gender-neutral, polite-plural ORR Kannada survival phrases across all 7 `PhraseSituation` keys (`honorificGender` matched to `aṇṇa` / `akka` / `neutral`), set `ENABLED_LANGUAGES = ["en", "hi", "kn"]`, and activated `mark_phrase_attempt`. Proof: `phrases.test.ts` (`35/35` total Vitest tests passing) + live `630-717 ms` Kannada/Hindi-bridge voice probes. |
| `T3c.2` | Parallel B | Hydrogen | 25m | `web/src/live/Captions.tsx`, `web/src/hud/PhraseFlyCard.tsx`, `web/index.html` | [x] `Noto Sans Kannada` (`400..700`), 2-line Kannada/transliteration/meaning target strip inside `Captions.tsx`, `--accent-teal` mastery ring + two-note WebAudio chime (`chime.ts`) + `PhraseFlyCard` flight into `Phrases · N` topbar badge -> merged `--no-ff` to `main` and tagged `p3c-kannada` (`apna-area-00010-puy` live). |

---

## Phase 4 · Adaptive Gameplay (`phase/p4-adaptive` -> tag `p4-adaptive`)
**Goal:** Score every completed mission in under 1 second via `gemini-decision-1` and visibly adapt the next mission's language share, hints, and pace.

| Ticket | Mode | Tier | Est. | Allowed Files | Goal & Proof Test |
|---|---|---|---|---|---|
| `T4.1` | Parallel A | Hydrogen | 25m | `shared/src/game/scoring.ts`, `shared/src/__tests__/scoring.test.ts` | [x] Pure `xpFor`, `starsFor`, `nextDifficulty`, `applyDifficultyOverride`, and `buildAdaptationSummary` clamped by `ENABLED_LANGUAGES` and `< 0.75` confidence / `"other"` rule (`enableAdaptiveScoring = true`). Proof: 100% branch unit tests (`scoring.test.ts`). |
| `T4.2` | Parallel B | Neon | 30m | `server/src/score/decide.ts`, `server/src/routes/score.ts`, `server/src/__tests__/score.test.ts` | [x] `POST /api/score` calling `gemini-decision-1` (`v1beta`) with `noul`, `score`, and sorted `choice` + `other` questions (`389-519 ms` live, `0` output tokens), transcript-redacted logging, `30/min` rate limit, and heuristic fallback. Proof: live recorded fixture (`decision-1-score.json`) + `score.test.ts`. |
| `T4.3` | Sequential | Hydrogen | 25m | `web/src/score/MissionResultCard.tsx`, `web/src/score/WhyChangedDisclosure.tsx`, `web/src/hud/XpCounter.tsx` | [x] Rolling `280ms` tabular XP (`XpCounter.tsx`), `200ms` spring stars, plain-English adaptation copy, 2x2 `"Why did this change?"` rubric drawer + 1-click player pace overrides (`e2e/score.spec.ts`), Code Review Gate `PASS` (`97/100`), and Design Critic `9.2/10` -> Cloud Run `p4-adap` preview deployed. |

---

## Phase 5 · Survival Kit, Control & Music (`phase/p5-kit` -> tag `p5-kit`)
**Goal:** Emotional peak screen with real Routes API commutes, phrase TTS replay, Lyria mood loops, and mandatory Confirm Sheets.

| Ticket | Mode | Tier | Est. | Allowed Files | Goal & Proof Test |
|---|---|---|---|---|---|
| `T5.1` | Parallel A | Hydrogen | 30m | `server/src/kit/pockets.ts`, `server/src/kit/commute.ts`, `server/src/kit/summary.ts`, `server/src/kit/tts.ts`, `server/src/routes/kit.ts`, `server/src/routes/tts.ts`, `server/src/__tests__/kit.test.ts` | [x] Routes API `computeRouteMatrix` Monday `09:00` & `18:30` IST (`DRIVE`, `TWO_WHEELER`, `TRANSIT` omitting `routingPreference`) pre-warmed on office pick (`305 ms` live), `gemini-3.5-flash-lite` price/em-dash-verified one-liners (`874 ms`), and `gemini-3.8-flash-tts` cached `24 kHz` WAV replay (`RIFF`). |
| `T5.2` | Parallel B | Hydrogen | 25m | `scripts/generate-music.ts`, `web/public/audio/*`, `web/src/audio/ambient.ts`, `web/src/audio/useAmbientSync.ts`, `web/src/audio/__tests__/ambient.test.ts`, `web/src/components/AmbientMuteButton.tsx` | [x] Pre-generated 4 x 30s `lyria-3-clip-preview` (`v1beta`) instrumental MP3 loops (`calm`, `morning`, `rush`, `evening`) + `credits.json`; gesture-gated crossfader (`0.18` gain, `0.04` voice-ducked) + persisted mute toggle. |
| `T5.3` | Parallel C | Hydrogen | 35m | `web/src/kit/*`, `web/src/styles/kit.css`, `web/src/styles/confirm.css`, `web/src/styles/sheet.css`, `e2e/confirm-sheet.spec.ts` | [x] `"YOU'RE READY FOR MONDAY."` bounded 3-card desktop / segmented mobile Survival Kit + `@ui-sdk/react/alert-dialog` focus-trapped Confirm Sheet on every external/export action (`6/6` Playwright E2E green). |

---

## Phase 6 · Harden, Polish & Demo (`phase/p6-demo-ready` -> tag `p6-demo-ready`, then `p7-submission`)
| Ticket | Mode | Tier | Est. | Allowed Files | Goal & Proof Test |
|---|---|---|---|---|---|
| `T6.1` | Parallel A | Neon | 30m | `server/src/**`, `web/src/**` | [x] Applied 2nd Carbon adversarial review fixes: Zombie-Mic `onClose` recovery, zero-flicker `SurvivalKit` checklist/mute state + server `SummaryCache`, `StageSuspenseBoundary`, single-sentence offline/error `Retry` paths, `"Replayed from an earlier run"` banner, `180/min` NAT-safe read rate limits, and `188.1 KB` gzipped initial JS (`< 250 KB`). |
| `T6.2` | Parallel B | Carbon / Neon | 30m | `web/src/**`, `Design.md`, `docs/DESIGN_SCORES.md`, `docs/DEMO.md` | [x] Full subtraction pass, keyboard focus/Escape sweep (`e2e/demo-loop.spec.ts`), `?demo=1` subtle presenter timer, Code Review Gate `PASS` (`99/100`), 3-round Screenshot Design Critic `PASS` (`9.4/10`: `9.4` Desktop / `9.3` Mobile), and 3 consecutive sub-3-minute live Cloud Run rehearsals (`0:41`, `0:40`, `0:48`) -> `p6-demo-ready`. |
| `T6.3` | Final | Neon + Carbon | 30m | `README.md`, `docs/ARCHITECTURE_OVERVIEW.md`, `docs/VIDEO_COVERAGE.md` | [x] Shipped `31-submission-pack` (`README.md`, `< 400`-word `docs/ARCHITECTURE_OVERVIEW.md`, 13-feature `docs/VIDEO_COVERAGE.md`), Carbon `23-self-check` audit, and clean full-history `gitleaks` scan -> tag `p7-submission` -> **Check-in #6 (Final Sign-Off)**. |

---

## Cut Line (Drop in This Exact Order if Time Tightens)
1. **Drop first:** Stretch items on the `Later` list below.
2. **Drop second:** Pre-generated Lyria ambient loops (`T5.2`); keep phrase TTS replay and completion chimes.
3. **Drop third:** Trim distinct NPC portraits/personas from 5 roles to 3 (`auto_driver`, `darshini_owner`, `pg_owner`) reused across the 5-step week.
4. **Drop fourth:** If one non-English voice language underperforms in testing, revert `ENABLED_LANGUAGES` to the passing subset (`["en", "kn"]` or `["en", "hi"]`) and document in `docs/DECISIONS.md`.

## Later List (Do Not Touch Until P6 Ships Green)
- [x] Vector 3D + `WebGLOverlayView` Neon Dusk Open-World toggle shipped as isolated preview `p8-3d` on `phase/p8-3d-dusk` (`apna-area-00021-ret`, `https://p8-3d---apna-area-qhtgwpzhpq-el.a.run.app`; replaces Photorealistic 3D Tiles `Map3DElement` per `ADR-020`).
- Build-time Nano Banana neighbourhood postcard exported inside the Survival Kit PNG.
- 6-second keyed-out looping auto-rickshaw dusk clip (`gemini-omni-1.2-flash`) behind landing headline.

---

## Phase 8 (Stretch Branch) · 3D Neon Dusk Open-World Mode (`phase/p8-3d-dusk` -> preview tag `p8-3d`)
**Goal:** Deliver an opt-in/hardware-gated nocturnal 3D open-world map layer (`RenderingType.VECTOR` at `65deg` tilt/heading + Three.js `WebGLOverlayView` beacons & ORR traffic + Sky-Drop camera + heading-locked Radar Minimap) on isolated branch `phase/p8-3d-dusk` and deploy to a `--no-traffic --tag p8-3d` Cloud Run preview URL without touching `main` (`p7-submission`, `apna-area-00019-foc`).

| Ticket | Mode | Tier | Est. | Allowed Files (`<= 250` lines each) | Goal & Proof Test |
|---|---|---|---|---|---|
| `T8.1` | Lead first | Neon | 25m | `shared/src/config.ts`, `shared/src/types.ts`, `web/package.json`, `web/vite.config.ts`, `web/src/state/sessionStore.ts`, `web/src/hud/TopbarChrome.tsx` | [x] Add `MAP_3D_CONFIG` + `enable3dDusk: true`, install `three` + `@types/three` isolated in lazy `vendor-three` chunk (initial 2D JS stays `< 200 KB` gzipped: `192.6 KB`), persist `map3dEnabled` with hardware WebGL2 check (excluding `SwiftShader`/`llvmpipe`, headless, mobile, and `prefers-reduced-motion`), and add `40px` `3D` topbar toggle pill. |
| `T8.2` | Parallel A | Neon | 35m | `web/src/map/OrrMap.tsx`, `web/src/map/CameraDirector3D.tsx`, `web/src/styles/map3d.css`, `web/src/main.tsx` | [x] Enable `RenderingType.VECTOR` when 3D mode is active, implement 3-stage parabolic Sky-Drop camera swoop (`zoom 12.6 / tilt 0` -> `zoom 15.2 / tilt 38` -> `zoom 17.4 / tilt 65`), `1.2 deg/s` voice-mission street orbit, `Q`/`E` keyboard camera rotation, and tilted twilight horizon scrim. |
| `T8.3` | Parallel B | Neon | 45m | `web/src/map/OrrWebGlLayer.ts`, `web/src/map/orrTrafficGeometry.ts` | [x] Lazy-loaded `google.maps.WebGLOverlayView` + Three.js scene rendering cylindrical additive waypoint light pillars (`#FFD24A` office, `#FF4FA0` active stop, `#3DE6D0` completed) and `InstancedMesh` bi-directional neon traffic streaks along all `545` verified `corridor.geojson` coordinates, cleanly disposing geometries/materials on unmount or `2D` switch (`orrTrafficGeometry.test.ts` green). |
| `T8.4` | Gate + Preview | Neon + Carbon | 35m | `web/src/map/RadarMinimap.tsx`, `e2e/map-3d.spec.ts`, `Design.md`, `docs/HANDOFF.md` | [x] Built `136x136px` heading-locked `RadarMinimap` (`bottom: 36px; left: 24px` above Google attribution), passed `e2e/map-3d.spec.ts` + all existing `7/7` E2E specs (`8/8` total), passed Code Review (`95/100` + all 5 polish items applied) & Screenshot Critic (`9.2/10`), and deployed `--no-traffic --tag p8-3d` preview (`apna-area-00021-ret` at `https://p8-3d---apna-area-qhtgwpzhpq-el.a.run.app`, `main` untouched at `100%` `apna-area-00019-foc`). |
