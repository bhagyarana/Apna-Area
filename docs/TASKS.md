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
| `T0.1` | Lead first | Neon | 20m | `package.json`, `tsconfig.base.json`, `eslint.config.js`, `vitest.config.ts`, `web/package.json`, `server/package.json`, `shared/package.json` | Monorepo npm workspaces, strict TypeScript, `dev`, `build`, `check`, `start` scripts. Proof: `npm run check` exits 0. |
| `T0.2` | Parallel A | Hydrogen | 25m | `shared/src/config.ts`, `shared/src/types.ts`, `shared/src/logger.ts`, `shared/src/__tests__/*` | `MODEL_IDS`, `ORR_BBOX`, `ENABLED_LANGUAGES = ["en"]`, Zod schemas, structured JSON logger redacting transcripts/audio/secrets. Proof: `vitest run shared`. |
| `T0.3` | Parallel B | Hydrogen | 25m | `server/src/index.ts`, `server/src/routes/health.ts`, `server/src/routes/config.ts`, `server/src/__tests__/health.test.ts` | Fastify server on `PORT` (`8080`) with `trustProxy: true`, per-IP rate limit (`60/min`), `GET /api/health` (`commit`, `builtAt`), `GET /api/config`, static SPA fallback. Proof: `vitest run server`. |
| `T0.4` | Parallel C | Hydrogen | 25m | `web/index.html`, `web/vite.config.ts`, `web/src/main.tsx`, `web/src/App.tsx`, `web/src/styles/tokens.css` | Vice City dusk CSS tokens, Anton + Hanken Grotesk fonts, wordmark, tagline, live `/api/health` teal status dot, reduced-motion support. Proof: `npm run build --workspace=web`. |
| `T0.5` | Sequential | Hydrogen | 20m | `Dockerfile`, `.dockerignore`, `playwright.live.config.ts`, `e2e/smoke.spec.ts` | Multi-stage `node:22-slim` non-root image + Playwright smoke test asserting wordmark and green health dot. Proof: Playwright smoke passes against local preview. |
| `T0.6` | Lead gate | Neon | 20m | `docs/HANDOFF.md`, `docs/TASKS.md` | Run `ship-phase` skill -> Cloud Run `asia-south1` live URL -> tag `p0-skeleton` -> **Check-in #2a**. |

---

## Phase 1 · The Map & Verified World (`phase/p1-map` -> tag `p1-map`)
**Goal:** Deterministic eastern ORR vector map built strictly from Places API (New) verified records, skippable camera tour, and accessible office picker.

| Ticket | Mode | Tier | Est. | Allowed Files | Goal & Proof Test |
|---|---|---|---|---|---|
| `T1.1` | Parallel A | Hydrogen | 35m | `scripts/verify-places.ts`, `scripts/build-corridor.ts`, `data/orr/places.json`, `data/orr/corridor.geojson`, `docs/DATA.md`, `server/src/routes/places.ts`, `server/src/__tests__/places.test.ts` | Verify seed tech parks + categories via Places API (New) Pro mask inside `ORR_BBOX`; build corridor GeoJSON via Routes API; expose `GET /api/places`. Proof: unit tests for bbox filter, closed-place drop, and dedupe. |
| `T1.2` | Parallel B | Hydrogen | 35m | `web/src/map/OrrMap.tsx`, `web/src/map/CorridorLayer.tsx`, `web/src/map/CameraTour.tsx`, `web/src/map/mapStyle.ts` | `@vis.gl/react-google-maps` dark styled 2D vector map (`internalUsageAttributionIds={["gmp_git_agentskills_v1"]}`, `mapId`), glowing `#FF4FA0` corridor polyline, `ORR_BBOX` restriction, 8.5s skippable camera flight (`Esc` or click). Proof: renders cleanly with zero console warnings. |
| `T1.3` | Sequential | Hydrogen | 30m | `web/src/picker/OfficePicker.tsx`, `web/src/picker/TunePopover.tsx`, `e2e/picker.spec.ts` | Single question `"WHICH OFFICE ARE YOU JOINING?"`, `@ui-sdk/react` combobox (`Cmd/Ctrl+K`), 6 verified chips, `< 1.0s` camera glide + `#FFD24A` AdvancedMarker pin, `localStorage` persistence. Proof: Playwright keyboard-only office selection test passes. |
| `T1.4` | Lead + Critic | Carbon / Neon | 20m | `Design.md`, `docs/DESIGN_SCORES.md`, `docs/HANDOFF.md` | Subtraction pass + Carbon screenshot critic (`>= 9/10`) + `ship-phase` -> tag `p1-map` -> **Check-in #2b (Break)**. |

---

## Phase 2 · The Director Agent (`phase/p2-director` -> tag `p2-director`)
**Goal:** Picking any verified office generates a verified 5-mission Week One in under 12 seconds with live SSE progress chips and staggered map pins.

| Ticket | Mode | Tier | Est. | Allowed Files | Goal & Proof Test |
|---|---|---|---|---|---|
| `T2.1` | Lead first | Neon | 15m | `shared/src/types.ts` | Lock `PhraseSituation`, `Mission`, `WeekPlan`, and `WorldProgressEvent` Zod contracts. Proof: `npm run check`. |
| `T2.2` | Parallel A | Hydrogen | 25m | `server/src/world/candidates.ts`, `server/src/world/verify.ts`, `server/src/__tests__/verify.test.ts` | Pure 3 km->5 km fallback candidate selector (deterministic distance + ID sort) and strict verifier rejecting unknown/duplicate/out-of-box IDs. Proof: unit tests with valid + malformed fixtures. |
| `T2.3` | Parallel B | Neon | 35m | `server/src/world/schema.ts`, `server/src/world/director.ts`, `server/src/world/cache.ts`, `data/orr/fallback-plans.json`, `server/src/routes/world.ts`, `server/src/__tests__/world.test.ts` | `gemini-4-neon` (`thinking_level: "medium"`) structured output with dynamic `placeId` enum + 3 recommended areas, 1 verifier retry, `gemini-4-hydrogen` fallback, committed real `fallback-plans.json` for cold-container 503 resilience (`replayed: true`), SSE stream. Proof: contract test + live `< 12s` timing log. |
| `T2.4` | Parallel C | Hydrogen | 30m | `web/src/hud/ProgressChips.tsx`, `web/src/hud/WeekProgressBar.tsx`, `web/src/hud/MissionCard.tsx` | SSE chip stack, 60ms staggered mission pin drop, 5-step week bar, verified `place_id` provenance tooltip, `whyItMatters` story line. Proof: component + smoke test. |
| `T2.5` | Lead + Critic | Carbon / Neon | 20m | `Design.md`, `docs/DESIGN_SCORES.md`, `docs/HANDOFF.md` | Subtraction pass + Carbon critic (`>= 9/10`) + `ship-phase` -> tag `p2-director` -> **Check-in #3 (Break)**. |

---

## Phase 3 · Voice NPCs (`p3a-english` -> `p3b-hindi` -> `p3c-kannada`)

### Phase 3a · English Voice Pipeline (`phase/p3a-english` -> tag `p3a-english`)
| Ticket | Mode | Tier | Est. | Allowed Files | Goal & Proof Test |
|---|---|---|---|---|---|
| `T3a.1` | Parallel A | Neon | 30m | `server/src/live/persona.ts`, `server/src/live/tools.ts`, `server/src/live/token.ts`, `server/src/routes/liveToken.ts`, `server/src/__tests__/persona.test.ts` | 20m Live audio proof + `POST /api/live-token` (`v1beta` `authTokens.create` locked to `gemini-3.8-live`, fictional NPC persona, `NON_BLOCKING` tools `give_hint`, `complete_objective`, `mark_phrase_attempt`). Proof: unit tests for persona safety rules + live token test. |
| `T3a.2` | Parallel B | Neon | 35m | `web/src/live/pcmWorklet.ts`, `web/src/live/useLiveSession.ts`, `web/src/live/__tests__/resample.test.ts` | AudioWorklet resampling mic input to 16 kHz 16-bit PCM, 24 kHz PCM playback queue with barge-in flush on `interrupted: true`, echo cancellation, push-to-talk option, 90s cap. Proof: unit test for PCM resampler + round-trip voice check. |
| `T3a.3` | Parallel C | Hydrogen | 30m | `scripts/generate-portraits.ts`, `web/public/art/npcs/*`, `web/src/live/MissionDialog.tsx`, `web/src/live/Captions.tsx` | Build-time Nano Banana 2.1 portraits for all 5 NPC roles + Mission voice UI (72px waveform mic, 3-field caption slot, hint/end buttons, text fallback on mic deny). Proof: renders all 5 portraits and states. |
| `T3a.4` | Lead + Critic | Carbon / Neon | 20m | `docs/TESTING.md`, `docs/DESIGN_SCORES.md`, `docs/HANDOFF.md` | Critic loop (`>= 9/10`) + manual voice run + `ship-phase` -> tag `p3a-english`. |

### Phase 3b · Hindi & Code-Switching (`phase/p3b-hindi` -> tag `p3b-hindi`)
| Ticket | Mode | Tier | Est. | Allowed Files | Goal & Proof Test |
|---|---|---|---|---|---|
| `T3b.1` | Lead | Neon | 25m | `shared/src/config.ts`, `server/src/live/persona.ts`, `web/src/picker/TunePopover.tsx`, `web/index.html`, `docs/TESTING.md` | Set `ENABLED_LANGUAGES = ["en", "hi"]`, load Noto Sans Devanagari fallback, enable Hindi/English code-switching in persona, verify live and run `ship-phase` -> tag `p3b-hindi`. |

### Phase 3c · Kannada & Survival Phrases (`phase/p3c-kannada` -> tag `p3c-kannada`)
| Ticket | Mode | Tier | Est. | Allowed Files | Goal & Proof Test |
|---|---|---|---|---|---|
| `T3c.1` | Parallel A | Carbon / Neon | 25m | `data/phrases.json`, `server/src/live/persona.ts`, `shared/src/config.ts` | Draft & Carbon-review 30 ORR survival phrases across 7 `PhraseSituation` keys using polite plural Kannada and gender-matched honorifics (`aṇṇa` / `akka` / neutral); set `ENABLED_LANGUAGES = ["en", "hi", "kn"]`; register `mark_phrase_attempt`. Proof: schema test validating all 30 phrases. |
| `T3c.2` | Parallel B | Hydrogen | 25m | `web/src/live/Captions.tsx`, `web/src/hud/PhraseFlyCard.tsx`, `web/index.html` | Noto Sans Kannada font fallback, 3-line Kannada/transliteration/meaning captions, teal pulse + soft chime + flying card animation on `clear` attempt. Proof: unit + visual test -> `ship-phase` -> tag `p3c-kannada` -> **Check-in #4 (Break)**. |

---

## Phase 4 · Adaptive Gameplay (`phase/p4-adaptive` -> tag `p4-adaptive`)
**Goal:** Score every completed mission in under 1 second via `gemini-decision-1` and visibly adapt the next mission's language share, hints, and pace.

| Ticket | Mode | Tier | Est. | Allowed Files | Goal & Proof Test |
|---|---|---|---|---|---|
| `T4.1` | Parallel A | Hydrogen | 25m | `shared/src/game/scoring.ts`, `shared/src/__tests__/scoring.test.ts` | Pure `xpFor`, `starsFor`, `nextDifficulty` clamped by `ENABLED_LANGUAGES` and `< 0.75` confidence rule. Proof: 100% branch unit tests. |
| `T4.2` | Parallel B | Neon | 30m | `server/src/score/decide.ts`, `server/src/routes/score.ts`, `server/src/__tests__/score.test.ts` | `POST /api/score` calling `gemini-decision-1` (`v1beta`) with `noul`, `score`, and `choice` questions; contract test with recorded fixture. Proof: `< 1s` live response + contract test. |
| `T4.3` | Sequential | Hydrogen | 25m | `web/src/score/MissionResultCard.tsx`, `web/src/score/WhyChangedDisclosure.tsx`, `web/src/hud/XpCounter.tsx` | Rolling tabular XP, 200ms spring stars, adaptation explanation line, and `"Why did this change?"` rubric drawer -> `ship-phase` -> tag `p4-adaptive`. |

---

## Phase 5 · Survival Kit, Control & Music (`phase/p5-kit` -> tag `p5-kit`)
**Goal:** Emotional peak screen with real Routes API commutes, phrase TTS replay, Lyria mood loops, and mandatory Confirm Sheets.

| Ticket | Mode | Tier | Est. | Allowed Files | Goal & Proof Test |
|---|---|---|---|---|---|
| `T5.1` | Parallel A | Hydrogen | 30m | `server/src/kit/commute.ts`, `server/src/kit/summary.ts`, `server/src/kit/tts.ts`, `server/src/routes/kit.ts`, `server/src/__tests__/kit.test.ts` | Routes API `computeRouteMatrix` Monday `09:00` & `18:30` IST (`DRIVE`, `TWO_WHEELER`, `TRANSIT`) pre-warmed on office pick, `gemini-3.5-flash-lite` factual one-liners, `gemini-3.8-flash-tts` cached WAV replay. Proof: unit tests for commute aggregation & Maps URL builder. |
| `T5.2` | Parallel B | Hydrogen | 25m | `scripts/generate-music.ts`, `web/public/audio/*`, `web/src/audio/ambient.ts` | Pre-generate 4 x 30s `lyria-3-clip-preview` instrumental MP3 loops; gesture-gated WebAudio crossfader + persisted mute toggle. Proof: audio credits file + gesture gate test. |
| `T5.3` | Parallel C | Hydrogen | 35m | `web/src/kit/ConfirmSheet.tsx`, `web/src/kit/SurvivalKit.tsx`, `web/src/kit/CommuteCard.tsx`, `web/src/kit/PhrasebookCard.tsx`, `e2e/confirm-sheet.spec.ts` | `"YOU'RE READY FOR MONDAY."` 3-card kit + `@ui-sdk/react` focus-trapped Confirm Sheet on every external/export action. Proof: Playwright test proving zero external navigation without Confirm Sheet -> Critic loop -> `ship-phase` -> tag `p5-kit` -> **Check-in #5 (Break)**. |

---

## Phase 6 · Harden, Polish & Demo (`phase/p6-demo-ready` -> tag `p6-demo-ready`, then `p7-submission`)
| Ticket | Mode | Tier | Est. | Allowed Files | Goal & Proof Test |
|---|---|---|---|---|---|
| `T6.1` | Parallel A | Neon | 30m | `server/src/**`, `web/src/**` | Apply 2nd Carbon adversarial review fixes; complete empty/loading/error/offline states, labelled real replay banner, lazy-load `live` and `kit` chunks (`< 250 KB` initial JS gzipped). |
| `T6.2` | Parallel B | Carbon / Neon | 30m | `web/src/**`, `Design.md`, `docs/DESIGN_SCORES.md`, `docs/DEMO.md` | Full subtraction pass, accessibility keyboard sweep, `?demo=1` subtle presenter timer, final critic round (`>= 9/10`), 3 clean sub-3-minute live rehearsals -> `ship-phase` -> tag `p6-demo-ready`. |
| `T6.3` | Final | Neon + Carbon | 30m | `README.md`, `docs/ARCHITECTURE_OVERVIEW.md`, `docs/VIDEO_COVERAGE.md` | `31-submission-pack` + `gitleaks` full-history check + `32-demo-video` coverage script -> tag `p7-submission` -> **Check-in #6 (Final Sign-Off)**. |

---

## Cut Line (Drop in This Exact Order if Time Tightens)
1. **Drop first:** Stretch items on the `Later` list below.
2. **Drop second:** Pre-generated Lyria ambient loops (`T5.2`); keep phrase TTS replay and completion chimes.
3. **Drop third:** Trim distinct NPC portraits/personas from 5 roles to 3 (`auto_driver`, `darshini_owner`, `pg_owner`) reused across the 5-step week.
4. **Drop fourth:** If one non-English voice language underperforms in testing, revert `ENABLED_LANGUAGES` to the passing subset (`["en", "kn"]` or `["en", "hi"]`) and document in `docs/DECISIONS.md`.

## Later List (Do Not Touch Until P6 Ships Green)
- Photorealistic 3D Tiles (`Map3DElement`) toggle for desktop WebGL2 browsers.
- Build-time Nano Banana neighbourhood postcard exported inside the Survival Kit PNG.
- 6-second keyed-out looping auto-rickshaw dusk clip (`gemini-omni-1.2-flash`) behind landing headline.
