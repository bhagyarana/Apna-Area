# Architecture Decision Log (`docs/DECISIONS.md`)

Every significant technical, product, or scope decision is recorded here. Update `PROJECT_BRIEF.md` first if a core constraint changes.

---

### ADR-001 · Single-Container TypeScript Monorepo on Cloud Run (`asia-south1`)
- **Date:** 2026-11-27
- **Decision:** Build `shared/`, `server/` (Fastify on Node 22+), and `web/` (Vite + React) in one npm workspaces monorepo served from a single Cloud Run container in `asia-south1` (`--min-instances 1`, `--timeout 3600`).
- **Why:** Eliminates CORS configuration between web and API, keeps latency low for Bengaluru demos (`asia-south1` Mumbai), supports long-lived SSE streams, and deploys atomically in one `gcloud run deploy` command.
- **Alternatives rejected:** Separate Vercel/Firebase Hosting frontend + Cloud Run backend (adds cross-origin setup and two deploy pipelines to keep in sync).
- **Revisit if:** Static asset bundle needs edge CDN caching beyond hackathon traffic.

### ADR-002 · Zero Database; Verified Static JSON + Browser `localStorage`
- **Date:** 2026-11-27
- **Decision:** Store world geography in committed `data/orr/places.json` and `data/orr/corridor.geojson`, survival phrases in `data/phrases.json`, short-lived caches in server memory, and player progress in browser `localStorage`.
- **Why:** Removes database provisioning, migrations, connection-pool failures, and privacy liability while keeping world verification deterministic and auditable in git.
- **Alternatives rejected:** Firestore or Cloud SQL (unnecessary operational surface for a single-player pre-arrival rehearsal game with no login).
- **Revisit if:** Multi-device saved accounts become a post-hackathon requirement.

### ADR-003 · Double-Locked Place Verification (Schema Enum + Server Verifier)
- **Date:** 2026-11-27
- **Decision:** Constrain `gemini-4-neon` mission `placeId` output via a dynamic JSON Schema `enum` containing only verified `places.json` IDs within 3 km of the chosen office, AND validate the parsed plan in `server/world/verify.ts` before sending `complete`.
- **Why:** Guarantees zero hallucinated places on screen and directly proves Gemini 4 structured reasoning paired with deterministic verification.
- **Alternatives rejected:** Prompt-only instructions ("please only use real places") or live uncached Maps Grounding without `places.json` verification.
- **Revisit if:** Never; truth rule #1 is non-negotiable.

### ADR-004 · Multi-Model Runtime Routing via `shared/config.ts`
- **Date:** 2026-11-27
- **Decision:** Route planning to `gemini-4-neon` (`thinking_level: "medium"`, fallback `gemini-4-hydrogen`), live NPC dialogue to `gemini-3.8-live`, post-mission rubric scoring to `gemini-decision-1` (`v1beta`), area one-liners to `gemini-3.5-flash-lite` (`thinking_level: "minimal"`), phrase audio replay to `gemini-3.8-flash-tts`, and build-time assets to `gemini-nano-banana-2.1` and `lyria-3-clip-preview`.
- **Why:** Matches each latency, cost, and capability profile: Neon plans structured multi-constraint graphs, Decision 1 delivers calibrated probabilities in ~200 ms with 0 output tokens, and Live handles sub-second bidirectional audio.
- **Alternatives rejected:** Using a single frontier text model for scoring (uncalibrated probabilities, slower, higher token cost) or generating images/music per visitor (slow and expensive).
- **Revisit if:** `gemini-4-neon` `medium` thinking produces repetitive missions (raise to `"high"` in `shared/config.ts`).

### ADR-005 · Client-to-Live WebSocket with Server-Locked Ephemeral Auth Tokens
- **Date:** 2026-11-27
- **Decision:** Mint short-lived (`uses: 3`, `15m` session expiry, `2m` new-session window) `v1alpha` ephemeral tokens on `POST /api/live-token` via `client.authTokens.create` with `liveConnectConstraints` locking `model: "gemini-3.8-live"`, `responseModalities: ["AUDIO"]`, NPC `systemInstruction`, transcriptions, `sessionResumption`, and `NON_BLOCKING` tools. Omit `thinkingConfig` and `proactive_audio: false` (unsupported on `gemini-3.8-live`).
- **Why:** Keeps `GEMINI_API_KEY` and persona instructions strictly server-controlled while streaming 16 kHz / 24 kHz PCM directly between browser and Gemini Live API without an extra server WebSocket hop, with `uses: 3` permitting seamless session resumption on brief Wi-Fi drops.
- **Alternatives rejected:** Exposing `GEMINI_API_KEY` in client bundle (forbidden) or full server audio proxy (higher latency; kept only as contingency if venue network blocks direct WSS).
- **Revisit if:** Venue firewall blocks direct browser WebSockets to Gemini Live API.

### ADR-006 · Sequential Language Rollout Behind `ENABLED_LANGUAGES`
- **Date:** 2026-11-27
- **Decision:** Ship English (`p3a-english`), Hindi (`p3b-hindi`), and Kannada (`p3c-kannada`) on separate phase branches and tags controlled by `ENABLED_LANGUAGES` in `shared/config.ts`.
- **Why:** Isolates audio/prompt regressions per language and provides an instant 1-line off-switch without losing working voice gameplay.
- **Alternatives rejected:** Building all three languages simultaneously in one unshipped branch.
- **Revisit if:** Any language fails the manual quality check in `docs/TESTING.md`.

### ADR-007 · 2D Styled Vector Map (`@vis.gl/react-google-maps`) First, 3D Later
- **Date:** 2026-11-27
- **Decision:** Build the ORR corridor map on `@vis.gl/react-google-maps` (`1.10.2`) 2D vector map with tilt, heading, `AdvancedMarkerElement`, `mapId`, and `internalUsageAttributionIds={["gmp_git_agentskills_v1"]}`. Keep `Map3DElement` on the `Later` list.
- **Why:** Safe, fast, headless-testable (avoids WebGL2 headless crashes in Playwright), and faithful to the `levels.fyi/atlas/bengaluru` camera-tour reference.
- **Alternatives rejected:** Photorealistic 3D tiles in Phase 1 (unverified ORR tile coverage and WebGL2 fragility in CI/headless).
- **Revisit if:** Phase 6 finishes early with > 45 minutes spare.

### ADR-008 · Places API (New) Pro SKU Field Mask & Routes API Mode Split
- **Date:** 2026-11-27
- **Decision:** Restrict `scripts/verify-places.ts` `X-Goog-FieldMask` strictly to Text Search Pro fields (`id`, `displayName`, `location`, `types`, `primaryType`, `formattedAddress`, `shortFormattedAddress`, `businessStatus`, `googleMapsUri`) and omit `routingPreference` when calling Routes API `TRANSIT` mode.
- **Why:** Avoids Enterprise/Atmosphere SKU charges on Places queries and prevents HTTP 400 errors on `TRANSIT` route computations.
- **Alternatives rejected:** Wildcard `*` field masks (expensive and violates Maps best practices).
- **Revisit if:** Additional place fields are explicitly needed and budgeted.

### ADR-009 · `@ui-sdk/react` for Accessible Behaviour Primitives & Confirm Sheets
- **Date:** 2026-11-27
- **Decision:** Use `@ui-sdk/react` (`0.1.0-beta.17`) behaviours for keyboard combobox navigation, roving focus on chips, and modal focus-trapped Confirm Sheets before any external link, copy, or download.
- **Why:** Enforces human-in-control rule #4 and keyboard accessibility without bloated component libraries.
- **Alternatives rejected:** Direct `<a target="_blank">` links without confirmation or unstyled ad-hoc keydown handlers.
- **Revisit if:** Any specific `@ui-sdk/react` beta primitive exhibits an API gap during `P0`/`P1` (wrap native `<dialog>` + ARIA combobox with full unit tests).

### ADR-010 · Branch-per-Phase, Worktree-per-Worker, Preview-Before-Merge
- **Date:** 2026-11-27
- **Decision:** Never commit directly to `main` after setup; isolate parallel workers in git worktrees, gate merges with `22-review-gate`, deploy `--no-traffic --tag` Cloud Run previews, smoke test, and `--no-ff` merge to `main`.
- **Why:** Ensures `main` always matches the healthy live site and makes any phase revertable via a single `git revert -m 1` or Cloud Run traffic switch.
- **Alternatives rejected:** Trunk-based direct commits by multiple agents in a shared working directory.
- **Revisit if:** Never during hackathon execution.


### ADR-011 · Isomorphic Structured Logger in `@apna-area/shared`
- **Date:** 2026-11-27
- **Decision:** Use dual 32-bit FNV-1a hex fingerprinting (`fingerprintHex16`) and guarded `process.stdout?.write` in `shared/src/logger.ts` instead of `node:crypto`.
- **Why:** Allows Vite browser bundles and Node 22+ Fastify routes to share `@apna-area/shared` without Rollup `__vite-browser-external` errors while preserving key/transcript/audio redaction.
- **Alternatives rejected:** Splitting separate browser and server shared packages.
- **Revisit if:** Server-only cryptographic SHA-256 hashing is required outside request/prompt fingerprinting.

### ADR-012 · DOM `OverlayView` SVG Corridor Spline Above Desaturated Map Canvas
- **Date:** 2026-11-27
- **Decision:** Render `CorridorLayer` via `google.maps.OverlayView` SVG `<path>` inside `overlayLayer` while applying CSS grading (`saturate(0.14) brightness(0.66) contrast(1.12)`) only to `.orr-map-canvas-grade canvas` with `clickableIcons={false}`.
- **Why:** Quiets background map tile clutter without washing out the `#FF4FA0` ORR corridor glow or ground-anchored `#FFD24A` `<AdvancedMarker>` capsules.
- **Alternatives rejected:** Native `google.maps.Polyline` drawn inside the WebGL/2D `<canvas>` (gets desaturated to grey by the canvas CSS filter).
- **Revisit if:** A dedicated Google Cloud Map Style ID is attached to suppress `poi.business` natively in vector tiles.

### ADR-013 · Exclude Under-Construction Namma Metro Phase 2A ORR Blue Line Stations
- **Date:** 2026-11-27
- **Decision:** Reject `subway_station` / `"Metro Station"` entries inside the eastern ORR corridor (`isUnderConstructionOrrMetro` in `server/src/places/filter.ts`) when curating `transit_stop` places.
- **Why:** Bellandur, Kadubeesanahalli, Devarabisanahalli, Marathahalli, and Agara Blue Line stations are still under construction; filtering them ensures missions only direct newcomers to operational BMTC stops.
- **Alternatives rejected:** Trusting `businessStatus === "OPERATIONAL"` alone (Google Maps marks several under-construction metro pillars/stations as `OPERATIONAL`).
- **Revisit if:** Namma Metro Phase 2A ORR Blue Line opens for passenger service.

### ADR-014 · Director Concise Prompt Budget, `32s` Upstream Timeout & Shared Zod Record Schema
- **Date:** 2026-11-27
- **Decision:** Cap Director candidate context at `15` balanced verified places, instruct `< 10 words` per text field on `gemini-4-neon` (`thinking_level: "medium"`), set `TIMEOUTS_MS.worldDirector = 32_000` (jumping directly to `gemini-4-hydrogen` on upstream timeout/503 without repeating Neon), and define `FallbackPlansMapSchema` inside `@apna-area/shared` so `z.record` shares one Zod prototype across workspaces.
- **Why:** Prevents premature `14s`/`20s` aborts while `gemini-4-neon` reasons (~2,200 thought tokens + ~900 output tokens over India-to-US RTT), avoids ESM dual-package Zod `instanceof` mismatches at server boot, and ensures cold-503 fallback snapshots (`data/orr/fallback-plans.json`, `replayed: true`) load deterministically.
- **Alternatives rejected:** Pre-populating the default cache with static plans (violates Truth Rule #7 against shipping cached mocks as the default path).
- **Revisit if:** Regional `asia-south1` Gemini 4 Neon endpoint lowers p95 RTT below 10 seconds.

### ADR-015 · `@google/genai@3.6.1` `v1alpha` Ephemeral Live Surface, Lazy Browser SDK Chunk & Gender-Matched WebP Portraits
- **Date:** 2026-11-27
- **Decision:** Configure `LIVE_VOICE_CONFIG.ephemeralApiVersion = "v1alpha"` on both `authTokens.create` (`server/src/live/token.ts`) and `live.connect` (`web/src/live/liveTransport.ts`), dynamically `await import("@google/genai")` only when entering a voice mission, and pre-generate 10 gender-matched `256x256` `.webp` portraits (`<role>_<gender>.webp`) via `gemini-nano-banana-2.1` in `scripts/generate-portraits.ts`.
- **Why:** `@google/genai@3.6.1` restricts `auth_tokens/*` ephemeral WebSocket handshake support to `v1alpha`; lazy-loading `@google/genai` keeps the initial landing bundle at `162.7 KB` gzipped (`< 250 KB` budget) by deferring the `87.6 KB` SDK chunk; gender-matched `256x256` WebP portraits (`~200 KB` total across all 10 variants) prevent visual/voice mismatches when `gemini-4-neon` casts either male or female fictional NPCs.
- **Alternatives rejected:** Static top-level `@google/genai` import in `App.tsx` (pushes initial bundle to `~250 KB` gzip) or shipping unresized `1024x1024` single-gender PNGs (`~3.7 MB` and gender-mismatched for female darshini/auto/transit characters).
- **Revisit if:** Upstream `@google/genai` promotes `authTokens` to `v1` stable.

### ADR-016 · Curated Speaker-Gender-Neutral & Addressee-Honorific-Matched Kannada Survival Phrases (`data/phrases.json`)
- **Date:** 2026-11-27
- **Decision:** Curate and linguistically audit 30 polite-plural spoken Bengaluru Kannada phrases in `data/phrases.json` across all 7 `PhraseSituation` keys, tagged with `honorificGender: "male" | "female" | "neutral"` (`ಅಣ್ಣ` / `aṇṇa` for male NPCs, `ಅಕ್ಕ` / `akka` for female NPCs, and speaker-gender-neutral phrasing across Kannada, English, and Hindi) and matched deterministically via `selectPhraseForMission` on `POST /api/live-token`.
- **Why:** Prevents rude singular imperatives (`koḍu`, `bā`), eliminates `aṇṇa`/`akka` addressee mismatches against `mission.npcGender`, ensures any player of any gender can speak every phrase verbatim, and unlocks deterministic TTS caching in Phase 5.
- **Alternatives rejected:** Generating unreviewed Kannada phrases on the fly inside LLM dialogue turns.
- **Revisit if:** Additional `PhraseSituation` categories are added post-hackathon.

### ADR-017 · Calibrated `gemini-decision-1` (`v1beta`) Multi-Question Scoring, `< 0.75` Steady Guard & 1-Click Player Override
- **Date:** 2026-11-28
- **Decision:** Evaluate every completed mission in one forward pass via `POST /api/score` calling `gemini-decision-1` (`v1beta` `client.decisions.create`) with 5 parallel questions (`objective_met` `noul`, `objective_score` / `phrase_score` / `tone_score` 4-level `score` rubrics, and `next_route` `choice` with alphabetically sorted keys `["ease_level", "keep_level", "other", "step_up"]`), floor-truncate `confidence` to 3 decimals before enforcing `< 0.75` -> `"keep_level"`, redact raw transcripts from `log.logGeminiCall`, and pair `WhyChangedDisclosure` with 1-click player overrides (`Keep gentler pace` / `Step up Kannada anyway`).
- **Why:** Live `gemini-decision-1` calls return calibrated probabilities in `389-519 ms` with `0` output tokens, keeping post-scene transitions sub-second while guaranteeing human-in-control rule #4 over AI difficulty routing and privacy rule #5 over spoken transcripts.
- **Alternatives rejected:** Prompting a text-generation model for free-form rubric JSON (slower, uncalibrated confidence, non-zero output token cost) or locking players into AI-chosen difficulty without an override.
- **Revisit if:** Additional rubric dimensions are introduced after the hackathon.

### ADR-018 · Survival Kit Routes Matrix Pre-Warm, Spatial-Only Flash-Lite Verifier, Cached `v1beta` TTS & Lyria Loops
- **Date:** 2026-11-28
- **Decision:** Pre-warm 4 batched Google Routes API `computeRouteMatrix` calls (`DRIVE` Monday `09:00` & `18:30` IST + `TWO_WHEELER` `09:00` IST with `TRAFFIC_AWARE`, and `TRANSIT` `09:00` IST omitting `routingPreference`) asynchronously on `POST /api/world` completion with 6h TTL + in-flight coalescing; forbid both currency/price claims AND chart-number repetition in `gemini-3.5-flash-lite` (`thinking_level: "minimal"`, `store: false`) spatial notes; restrict `POST /api/tts` (`gemini-3.8-flash-tts` `v1beta`, `Sulafat`) strictly to curated `data/phrases.json` IDs with a 30-entry WAV cache; pre-generate 4 x 30s `lyria-3-clip-preview` (`v1beta`) instrumental MP3s at build time; and gate all external links and PNG downloads behind `@ui-sdk/react/alert-dialog` `ConfirmSheet`.
- **Why:** Delivers `305 ms` real weekday ORR commutes (`0 ms` when pre-warmed), eliminates tautological LLM chart restatements, prevents quota abuse as an open TTS relay, keeps per-visitor music cost at `$0.00`, and enforces human-in-control Rule #4 with focus restoration (`lastExitRef`).
- **Alternatives rejected:** Estimating commute times with an LLM (violates Truth Rule #1/#7), passing `routingPreference` on `TRANSIT` (throws `400 INVALID_ARGUMENT`), or opening `google.com/maps` / triggering downloads directly on card button clicks.
- **Revisit if:** Live Namma Metro ORR Blue Line stations open and alter `TRANSIT` mode shares.
