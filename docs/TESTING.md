# Verification & Testing Strategy (`docs/TESTING.md`)

A phase step never merges to `main` until `npm run check` (`tsc -b`, `eslint`, `vitest run`) exits 0 and the deployed preview URL passes the Playwright smoke test.

## 1. Test Pyramid

| Layer | Runner | Scope & Rules | Target Speed |
|---|---|---|---|
| **1. Unit Tests** | Vitest (`npm test`) | Pure functions: `ORR_BBOX` filtering, place deduplication, 3 km Haversine candidate selection, `verifyWeekPlan`, PCM 48kHz->16kHz resampler, `xpFor`, `starsFor`, `nextDifficulty`, persona prompt safety builder, Google Maps URL builder. | `< 4 seconds` total |
| **2. Route Contract Tests** | Vitest + Fastify `app.inject()` | Every `/api/*` endpoint (`health`, `config`, `places`, `world`, `live-token`, `score`, `kit`, `tts`) validated against Zod response schemas using recorded real API payloads stored under `server/src/__tests__/fixtures/`. Fixtures are strictly test-only and never imported by runtime code. | `< 6 seconds` total |
| **3. Live E2E Smoke** | Playwright (`playwright.live.config.ts`) | Runs against `BASE_URL` (Cloud Run preview URL before traffic cutover): verifies wordmark + `/api/health` dot (`P0`), keyboard-only office selection + camera/marker state (`P1`), SSE week generation (`P2`), and Confirm Sheet interception before external navigation (`P5`). | `< 35 seconds` |
| **4. Manual Voice & Demo Matrix** | Human + Presenter Checklist | Real laptop mic + headphones + no-headphones echo test across English (`P3a`), Hindi/Hinglish (`P3b`), and Kannada beginner flow (`P3c`), plus 3 timed sub-3-minute rehearsals (`P6`). | `10 min` per voice step |

## 2. Required Evidence Per Phase Step

| Phase Tag | Automated Check Required | Live Evidence Logged in `docs/HANDOFF.md` |
|---|---|---|
| `p0-skeleton` | `npm run check` + `playwright test smoke` + `gitleaks` | Cloud Run URL, `/api/health` JSON with commit SHA, green Playwright summary |
| `p1-map` | Unit tests (`places`, `bbox`, `dedupe`) + keyboard picker E2E | Category/neighbourhood count table in `docs/DATA.md`, critic score `>= 9/10` |
| `p2-director` | Unit tests (`candidates`, `verify` rejecting bad IDs/dupes) + SSE contract test | Cloud Logging excerpt showing `gemini-4-neon` latency `< 12s` and 5 verified `placeId`s |
| `p3a-english` | Unit tests (`pcmWorklet` resampler, `persona` safety rules) | Voice test table below filled for all 5 NPCs (`< 1.2s` turn latency, `complete_objective` fired) |
| `p3b-hindi` | Persona language-routing unit tests | Voice test table filled for Hindi-only and Hindi-English code-switching |
| `p3c-kannada` | Schema validation of all 30 entries in `data/phrases.json` | Voice test table filled for beginner Kannada phrase teaching + `mark_phrase_attempt` card flight |
| `p4-adaptive` | 100% branch tests on `scoring.ts` (including `< 0.75` confidence & `other`) + `/api/score` contract test | Side-by-side log proving Mission 2 `localLanguageShare` increases after strong Mission 1 vs drops after weak Mission 1 |
| `p5-kit` | Unit tests (`commute` aggregator, `summary` schema) + Confirm Sheet E2E | Live kit screenshot with real Monday 09:00/18:30 Routes API minutes + critic score `>= 9/10` |
| `p6-demo-ready` | Full suite + bundle budget check (`< 250 KB` gzip initial JS) + keyboard-only full loop | Timestamps of 3 consecutive clean rehearsals under `3:00` (`mm:ss`) |

## 3. Manual Voice Test Matrix (Populated in P3a, P3b, P3c)

| Step | NPC Role | Language Mode | Mic Setup | Turn Latency | Captions Accurate? | Tool Fired Cleanly? | Pass / Notes |
|---|---|---|---|---|---|---|---|
| `P3a` | `auto_driver` (`Ramesh`, `Puck`) | English | Live `v1alpha` ephemeral session + headphones | `781 ms` | Yes (`Namaskara! I can definitely take you by the meter...`) | `give_hint`, `complete_objective` | PASS (`< 1.2s` target) |
| `P3a` | `darshini_owner` (`Lakshmi`, `Aoede`) | English | Live `v1alpha` ephemeral session + echo-cancel worklet | `767 ms` | Yes (`Namaskara! Just pay here and take your token...`) | `give_hint`, `complete_objective` | PASS (`< 1.2s` target) |
| `P3a` | `pg_owner` (`Suresh`, `Charon`) | English | Live `v1alpha` ephemeral session | `780 ms` | Yes (`Welcome! We have 24/7 power backup, high-speed Wi-Fi...`) | `complete_objective` | PASS (`< 1.2s` target) |
| `P3a` | `transit_helper` (`Kavitha`, `Kore`) | English | Live `v1alpha` ephemeral session | `823 ms` | Yes (`For the Silk Board bus, you need to cross over...`) | `complete_objective` | PASS (`< 1.2s` target) |
| `P3a` | `office_buddy` (`Arjun`, `Charon`) | English | Live `v1alpha` ephemeral session | `632 ms` | Yes (`The lanes around the back of Bagmane are great...`) | `complete_objective` | PASS (`< 1.2s` target) |
| `P3b` | `pg_owner` (`Suresh`, `Charon`) | Hindi (`languageComfort: "hi"`) | Live `v1alpha` ephemeral session | `765 ms` | Yes (`नमस्ते जी! यहाँ पावर बैकअप, वाई-फाई और पानी चौबीसों घंटे उपलब्ध रहता है...`) | `give_hint`, `complete_objective` | PASS (`< 1.2s` target) |
| `P3b` | `auto_driver` (`Ramesh`, `Puck`) | Hinglish switch (`languageComfort: "en_hi"`) | Live `v1alpha` ephemeral session | `529 ms` | Yes (`Namaskara ji, bilkul meter se chalenge! Bagmane IT park main gate drop kar deta hoon.`) | `complete_objective` | PASS (`< 1.2s` target) |
| `P3c` | `auto_driver` (`Ramesh`, `Puck`) | Kannada phrase coaching -> beginner speaks `auto_male_1` | Live `v1alpha` ephemeral session | `630 ms` | Yes (`Namaskara! You can say: Aṇṇa, dayaviṭṭu mīṭar hāki banni...`) | `mark_phrase_attempt` (`clear`) + `complete_objective` | PASS (`< 1.2s` target) |
| `P3c` | `darshini_owner` (`Lakshmi`, `Aoede`) | Kannada phrase coaching -> player asks in Hindi for help -> speaks `darshini_female_1` | Live `v1alpha` ephemeral session | `717 ms` | Yes (`Namaskara ji! Koi baat nahi, aap mere saath boliye, "Akka, ondu idli vada, matte filter coffee kodi."`) | `give_hint` + `mark_phrase_attempt` (`clear`) + `complete_objective` | PASS (`< 1.2s` target) |

## 4. Phase 4 Adaptive Scoring & Routing Evidence (`gemini-decision-1` `v1beta`)

| Scenario (Base `localLanguageShare: 0.25, hintLevel: 2, paceSeconds: 75`) | Live Latency | Output Tokens | Calibrated Rubric (`Obj / Phrase / Tone / Conf`) | Route & Stars / XP | Mission 2 `DifficultyState` |
|---|---|---|---|---|---|
| Strong Mission 1 (`auto_male_1` spoken clearly, `0` hints, `objectiveCompleted: true`) | `452 ms` cold / `519 ms` warm | `0` (`733` input) | `2.57 / 2.40 / 2.29` (`92%` conf, `P(met)=0.98`) | `step_up` · `3★` · `+300 XP` | `{ localLanguageShare: 0.50, hintLevel: 1, paceSeconds: 60 }` (`50%` Kannada blend) |
| Weak Mission 1 (`3` hints, confused reply, `objectiveCompleted: false`) | `389 ms` warm | `0` (`727` input) | `0.16 / 0.09 / 0.95` (`97%` conf, `P(met)=0.03`) | `ease_level` · `1★` · `+140 XP` | `{ localLanguageShare: 0.05, hintLevel: 3, paceSeconds: 90 }` (`5%` Kannada blend, early hints) |
| Low-confidence / `"other"` guard (`confidence: 0.74` or `routeChoice: "other"`) | Deterministic | `0` | Safety threshold `< 0.75` triggered | `keep_level` (safe default) | `{ localLanguageShare: 0.25, hintLevel: 2, paceSeconds: 75 }` (held steady) |

## 5. Phase 5 Survival Kit, Routes Matrix & Confirm Sheet Evidence
- **Live Google Routes API `computeRouteMatrix` (`POST /api/kit`):** `305 ms` across 4 parallel matrix calls (`DRIVE` Monday `09:00` & `18:30` IST + `TWO_WHEELER` `09:00` IST with `TRAFFIC_AWARE`, `TRANSIT` `09:00` IST without `routingPreference`), recorded in `server/src/__tests__/fixtures/kit-live.json`.
- **Live `gemini-3.5-flash-lite` spatial notes:** `874 ms`, verified price-free and em-dash-free by `verifyAreaSummaryLine`.
- **Live `gemini-3.8-flash-tts` (`v1beta`, `Sulafat`):** `24 kHz` `RIFF` `audio/wav` (`147 KB`), cached in memory by `phraseId` (`0 ms` on repeat).
- **Human-in-Control Playwright E2E (`e2e/confirm-sheet.spec.ts`):** Proves `Escape` and `Cancel` abort with `0` `window.open` calls and restore trigger focus, while explicit `ConfirmSheet` confirmation opens `https://www.google.com/maps/dir/?api=1` or downloads `apna-area-survival-kit.png`.

## 6. Phase 6 Bundle Budget, Full-Loop E2E & Live Cloud Run Rehearsals (`p6-demo-ready`)
- **Initial JS Bundle (`web/dist`):** `188.1 KB` gzipped (`152.1 KB` app + `16.8 KB` `vendor-maps` + `12.7 KB` `vendor-zod` + `6.6 KB` `vendor-icons`, safely under `< 250 KB`), with `MissionDialog`, `SurvivalKit`, `sheet-presentation`, and `@google/genai` (`87.6 KB` gzip) lazy-loaded behind `StageSuspenseBoundary`.
- **Automated Suite:** `16/16` Vitest suites (`57/57` tests) and `7/7` Playwright E2E specs (`smoke`, `picker`, `director`, `live`, `score`, `confirm-sheet`, `demo-loop`) green with zero warnings.
- **3 Consecutive Live Cloud Run Rehearsals (`apna-area-00017-dis`):** `0:41` (`RMZ Ecoworld`, `HI+EN`), `0:40` (`Embassy TechVillage`, `HI`), and `0:48` (`Prestige Tech Park`, `EN`), all under `3:00` with `0` console or Cloud Logging errors (`268 ms` `gemini-decision-1`, `188 ms` Routes matrix, `663 ms` Flash-Lite, `3 ms` cached TTS).
