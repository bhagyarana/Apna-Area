# Apna Area

**Apna Area turns Bengaluru's Outer Ring Road into a playable city for someone about to move there: pick the office you are joining and Gemini builds your first week as a voice-first game with verified places, characters in Kannada, Hindi or English, adaptive difficulty, and a Survival Kit you keep.**

Ananya is 24 and moving from Lucknow in two weeks to join a Bellandur tech park, knowing Hindi and English, zero Kannada, and nothing about where to live or how bad the Silk Board commute really is. Instead of reading static relocation threads, she plays her first Monday to Friday out loud in under 3 minutes and leaves with real peak-hour commute comparisons, survival phrases she has actually spoken, and a move-in plan under her control.

- **Live Cloud Run App:** https://apna-area-481049877093.asia-south1.run.app (`?demo=1` adds a subtle resettable `03:00` presenter clock without preselecting any state)
- **One-Page Judge Overview:** [`docs/ARCHITECTURE_OVERVIEW.md`](docs/ARCHITECTURE_OVERVIEW.md)
- **Full System Spec & Demo Script:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · [`docs/MODELS.md`](docs/MODELS.md) · [`docs/DEMO.md`](docs/DEMO.md) · [`docs/VIDEO_COVERAGE.md`](docs/VIDEO_COVERAGE.md)

![Apna Area Outer Ring Road Week One Hub](docs/assets/week-hub-desktop.png)
![Apna Area Survival Kit Peak Screen](docs/assets/survival-kit-desktop.png)

---

## Try It in 3 Steps (Under 3 Minutes)

1. **Pick any ORR office:** Open https://apna-area-481049877093.asia-south1.run.app, watch or press `Esc` to skip the 8.8-second dusk corridor flight, and choose any verified tech park via `Ctrl/Cmd+K` or the 6 campus quick-pick chips (`RMZ Ecoworld`, `RMZ Ecospace`, `Embassy TechVillage`, `Prestige Tech Park`, `Cessna Business Park`, `Vaishnavi Tech Park`). On hardware-accelerated desktop GPUs, the **3D Neon Dusk** layer (`3D` pill in the topbar, `Q`/`E` orbit keys, and bottom-left `RadarMinimap`) activates automatically with a Sky-Drop swoop; mobile and software/reduced-motion viewports default cleanly to crisp 2D. Click `Build my first week` to watch `gemini-4-neon` stream a verified 5-stop plan.
2. **Talk out loud in English, Hindi, or Kannada:** Click `Talk with <NPC>` on Stop 1 to open a live `gemini-3.8-live` voice scene (click the mic orb or press `Space` while it is focused to toggle mute, or click `Type instead` in a noisy hall). Speak the displayed polite Kannada survival phrase out loud to trigger the teal mastery pulse, ascending chime, and flying phrasebook card, then inspect the `Why did this change?` rubric scored by `gemini-decision-1`.
3. **Keep your Survival Kit:** Click `Survival Kit` on the score card (or `Phrases · 1` in the topbar anytime) to open `"YOU'RE READY FOR MONDAY."` and compare real Monday `09:00` and `18:30` IST Google Routes API commutes across 3 nearby residential pockets, replay `gemini-3.8-flash-tts` Kannada audio, check off move-in tasks, and test the focus-trapped Confirm Sheet before opening Google Maps or downloading your `1200x675` PNG summary card.

---

## How Apna Area Passes the Four Judge Tests

| Judge Test | How Apna Area Proves It Live |
|---|---|
| **1. Concrete problem for a named person** | Designed end-to-end around **Ananya** (24, moving from Lucknow to a Bellandur tech park in 14 days). Every screen answers one of her real first-week anxieties: auto meter negotiation, darshini counter ordering, PG backup power/water checks, BMTC feeder stops, and weekday ORR commutes. |
| **2. Needs Gemini 4 reasoning, routing, and verification** | `gemini-4-neon` plans a coherent 5-day mission graph constrained to a dynamic JSON Schema `enum` of verified `place_id`s within 3 km, backed by a deterministic server verifier (`verifyWeekPlan`). `gemini-decision-1` scores transcripts in ~450 ms (`0` output tokens) with calibrated probabilities and `< 0.75` confidence clamping. `gemini-3.8-live` runs real-time trilingual NPCs with `NON_BLOCKING` tools. |
| **3. People stay in control** | Every external link (`Google Maps` directions) and local export (`apna-area-survival-kit.png`) is gated behind a focus-trapped `@ui-sdk/react` `ConfirmSheet` with `Esc`/`Cancel` focus restoration. Players can override AI difficulty routing in one click (`Switch to gentler pace` / `Step up Kannada`). No geolocation, no bookings, no payments, and zero stored voice or transcripts. |
| **4. Live, real input, under 3 minutes** | Judges pick any of the 12 verified eastern ORR tech parks live. World generation, bidirectional voice dialogue, calibrated scoring, pre-warmed Routes API commute bars, and phrase TTS replay finish comfortably inside 2 minutes 35 seconds. |

---

## Architecture & Multi-Model Routing

```mermaid
flowchart LR
  subgraph Browser["Browser (React 19 + Vite + @vis.gl/react-google-maps + @ui-sdk/react)"]
    MapUI["2D / 3D Vector ORR Map + Lazy Three.js Beacons & Radar"]
    HUD["Office Picker, Week Bar & Mission HUD"]
    LiveClient["AudioWorklet 16kHz In / 24kHz Out + WSS"]
    KitUI["Survival Kit + Focus-Trapped ConfirmSheet"]
  end

  subgraph CloudRun["Cloud Run Service (asia-south1, Node 22 + Fastify)"]
    Static["SPA Static Bundle (< 195 KB gzip initial 2D JS)"]
    WorldAPI["POST /api/world (SSE + Verifier + Cache)"]
    TokenAPI["POST /api/live-token (v1alpha AuthToken)"]
    ScoreAPI["POST /api/score (Decisions Rubric)"]
    KitAPI["POST /api/kit & /api/tts (Routes + Summary + WAV)"]
    Data["Verified Data (121 Places, 30 Kannada Phrases)"]
  end

  subgraph GoogleAPIs["Gemini & Google Maps Platform"]
    Secrets["Secret Manager (GEMINI_API_KEY, MAPS_*_KEY)"]
    Neon["gemini-4-neon -> gemini-4-hydrogen (v1)"]
    Live["gemini-3.8-live (WSS v1alpha)"]
    Decision["gemini-decision-1 (v1beta)"]
    Flash["gemini-3.5-flash-lite (v1) & gemini-3.8-flash-tts (v1beta)"]
    Maps["Maps JS, Places API (New) & Routes API v2"]
  end

  Browser -->|"HTTPS + SSE"| CloudRun
  MapUI -->|"Referrer-Restricted Browser Key"| Maps
  LiveClient <-->|"Direct WSS (Server-Locked Token)"| Live
  CloudRun -->|"Startup Env"| Secrets
  WorldAPI -->|"Enum Schema JSON"| Neon
  WorldAPI -->|"verifyWeekPlan"| Data
  TokenAPI -->|"authTokens.create"| Live
  ScoreAPI -->|"decisions.create"| Decision
  KitAPI -->|"computeRouteMatrix"| Maps
  KitAPI -->|"Spatial Notes + WAV"| Flash
```

### Runtime & Build-Time Model Routing (`shared/src/config.ts`)

All model identifiers live exclusively in [`shared/src/config.ts`](shared/src/config.ts):

| Job | Model ID | API Surface | Why This Model Was Chosen |
|---|---|---|---|
| **Week One Director & NPC Briefs** | `gemini-4-neon` (`thinking_level: "medium"`) | `interactions.create` (`v1`) | Plans 5 spatially grounded, non-repeating missions across verified candidate `place_id`s while the player watches honest SSE steps. |
| **Director Verification / 503 Fallback** | `gemini-4-hydrogen` (`thinking_level: "low"`) | `interactions.create` (`v1`) | Fast low-thinking workhorse fallback before serving a labelled real earlier run (`Replayed from an earlier run`). |
| **Real-Time Multilingual Voice NPCs** | `gemini-3.8-live` | `authTokens.create` + `live.connect` (`v1alpha`) | Sub-second two-way spoken English, Hindi, Hinglish, and Kannada coaching with barge-in interruption and `NON_BLOCKING` tool calls. |
| **Rubric Scoring & Adaptive Routing** | `gemini-decision-1` | `decisions.create` (`v1beta`) | Evaluates 5 parallel `noul`, `score`, and `choice` questions in ~450 ms with `0` output tokens and calibrated confidence. |
| **Spatial Corridor One-Liners** | `gemini-3.5-flash-lite` (`thinking_level: "minimal"`) | `interactions.create` (`v1`) | Fast, low-cost spatial neighbourhood notes verified free of price claims and chart-number repetition. |
| **Kannada Phrasebook Audio Replay** | `gemini-3.8-flash-tts` (`Sulafat`) | `interactions.create` (`v1beta`) | Clear, learner-paced `24 kHz` WAV pronunciation cached in memory by curated `phraseId`. |
| **Ambient Mood Soundtrack (Build-Time)** | `lyria-3-clip-preview` | `interactions.create` (`v1beta`) | Generates 4 seamless 30-second instrumental MP3 loops (`calm`, `morning`, `rush`, `evening`) once at build time (`$0` per visitor). |
| **Fictional NPC Portraits (Build-Time)** | `gemini-nano-banana-2.1` | `interactions.create` (`v1`) | Generates 10 gender-matched `256x256` WebP portraits (`<role>_<gender>.webp`) once at build time (`$0` per visitor). |

---

## Sequential Language Rollout (`ENABLED_LANGUAGES`)

Voice languages shipped one at a time on dedicated branches and git tags behind `ENABLED_LANGUAGES` in [`shared/src/config.ts`](shared/src/config.ts):
1. **English (`p3a-english`):** Full `16 kHz` AudioWorklet capture, `24 kHz` gapless PCM playback, captions, and docked keyboard fallback across all 5 ORR NPC roles (`632-823 ms` first-audio latency).
2. **Hindi & Hinglish (`p3b-hindi`):** `Noto Sans Devanagari` rendering, `Tune · EN / HI / HI+EN` comfort selector, and natural mid-turn Hindi/English code-switching (`529-765 ms` turn latency).
3. **Kannada Survival Phrases (`p3c-kannada`):** `30` linguistically audited, polite-plural (`ಕೊಡಿ` *koḍi*, `ಬನ್ನಿ` *banni*, `ಹೇಳಿ` *hēḷi*), gender-honorific-matched (`ಅಣ್ಣ` *aṇṇa* / `ಅಕ್ಕ` *akka*) survival phrases in [`data/phrases.json`](data/phrases.json) with `Noto Sans Kannada` captions and mastery card flight.

---

## Truth, Safety, and Privacy Guarantees

1. **Zero hallucinated places:** Every place in [`data/orr/places.json`](data/orr/places.json) (`121` operational records inside `ORR_BBOX`, excluding under-construction ORR Blue Line metro stations) was verified via Google Places API (New). Mission `placeId`s are double-locked by JSON Schema `enum` and `verifyWeekPlan`.
2. **Zero invented money facts:** `verifyWeekPlan` and `verifyAreaSummaryLine` deterministically reject rupee symbols, `k` shorthand, rents, deposits, and auto fares.
3. **Fictional characters only:** NPCs use given names tied to place categories (`auto_driver`, `darshini_owner`, `pg_owner`, `transit_helper`, `office_buddy`), never claim to be real employees, and never disparage real businesses.
4. **Human in control:** Every action leaving the app or saving a file opens `@ui-sdk/react/alert-dialog` `ConfirmSheet`.
5. **Strict privacy & secret isolation:** Location is never requested. Voice audio is never stored; raw transcripts are redacted from structured Cloud Logging (`shared/src/logger.ts`). `GEMINI_API_KEY` and `MAPS_SERVER_KEY` stay strictly on the server via Secret Manager; live WebSockets use short-lived server-locked ephemeral tokens.

---

## Run Locally & Deploy

### Prerequisites
- Node.js `>= 22.0.0` and npm `>= 10`
- A Gemini API key (`GEMINI_API_KEY`) and Google Maps Platform keys (`MAPS_BROWSER_KEY` for Maps JS API, `MAPS_SERVER_KEY` for Places API (New) and Routes API v2)

### Local Setup
```bash
cp .env.example .env.local
# Populate GEMINI_API_KEY, MAPS_BROWSER_KEY, and MAPS_SERVER_KEY in .env.local

npm install
npm run dev          # Starts shared build + Fastify API (:8080) + Vite dev server (:5173)
```

### Verification Suite
```bash
npm run check        # Strict TypeScript across all 3 workspaces + ESLint (0 warnings) + 61 Vitest unit/contract tests
npm run build        # Production build (initial 2D JS < 195 KB gzipped; Three.js isolated in lazy vendor-three chunk)
npm run test:smoke   # Runs all 8 Playwright E2E specs against the production server
```

### Deploy to Google Cloud Run (`asia-south1`)
```bash
gcloud run deploy apna-area \
  --source . \
  --region asia-south1 \
  --set-secrets GEMINI_API_KEY=gemini-api-key:latest,MAPS_BROWSER_KEY=maps-browser-key:latest,MAPS_SERVER_KEY=maps-server-key:latest \
  --set-env-vars GIT_COMMIT=$(git rev-parse --short HEAD),BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --memory 1Gi --cpu 1 --min-instances 1 --max-instances 3 \
  --timeout 3600
```

---

## How It Was Built: Phased Branches, Tags & Agent Swarm

Every milestone shipped on an isolated `phase/<step>` branch, passed automated tests, independent code review, and Cloud Run `--no-traffic` preview smoke tests, then landed on `main` via `--no-ff` merge and git tag:

- [`v0.1-docs`](https://github.com/bhagyarana/Apna-Area/releases/tag/v0.1-docs) · Living specs, Carbon adversarial review, and seeded `ORR Neon Dusk` design discovery
- [`p0-skeleton`](https://github.com/bhagyarana/Apna-Area/releases/tag/p0-skeleton) · Monorepo workspaces, structured logger, `/api/health`, Docker image, and first Cloud Run deploy
- [`p1-map`](https://github.com/bhagyarana/Apna-Area/releases/tag/p1-map) · Verified `121`-place ORR dataset, `545`-point corridor spline, skippable tour, and `@ui-sdk/react` picker
- [`p2-director`](https://github.com/bhagyarana/Apna-Area/releases/tag/p2-director) · `gemini-4-neon` SSE Week One Director, `verifyWeekPlan`, Hydrogen/replay fallback ladder, and provenance HUD
- [`p3a-english`](https://github.com/bhagyarana/Apna-Area/releases/tag/p3a-english) · `gemini-3.8-live` `v1alpha` ephemeral voice pipeline, AudioWorklet PCM resampler, and Nano Banana portraits
- [`p3b-hindi`](https://github.com/bhagyarana/Apna-Area/releases/tag/p3b-hindi) · Hindi and Hinglish code-switching behind `ENABLED_LANGUAGES`
- [`p3c-kannada`](https://github.com/bhagyarana/Apna-Area/releases/tag/p3c-kannada) · `30` polite Kannada survival phrases, WebAudio mastery chime, and `PhraseFlyCard` animation
- [`p4-adaptive`](https://github.com/bhagyarana/Apna-Area/releases/tag/p4-adaptive) · `gemini-decision-1` `v1beta` rubric scoring, rolling XP odometer, and 1-click player pace overrides
- [`p5-kit`](https://github.com/bhagyarana/Apna-Area/releases/tag/p5-kit) · Pre-warmed Google Routes API `computeRouteMatrix`, `gemini-3.8-flash-tts` replay, Lyria 3 mood loops, and `ConfirmSheet`
- [`p6-demo-ready`](https://github.com/bhagyarana/Apna-Area/releases/tag/p6-demo-ready) · 2nd Carbon adversarial audit fixes, `< 190 KB` gzip initial JS, subtraction/a11y polish (`9.4/10` independent critic score), `?demo=1` timer, and 3 sub-3-minute live rehearsals
- [`p7-submission`](https://github.com/bhagyarana/Apna-Area/releases/tag/p7-submission) · Judge submission pack, architecture overview, video coverage checklist, and full-history secret scan
- [`p8-3d-dusk`](https://github.com/bhagyarana/Apna-Area/releases/tag/p8-3d-dusk) · Hardware-gated 3D Neon Dusk open-world mode (`RenderingType.VECTOR` `65deg` Sky-Drop + lazy Three.js `WebGLOverlayView` volumetric beacons & `545`-point bi-directional ORR traffic + heading-locked `RadarMinimap`)

**Agent orchestration:** Built in Google Antigravity combining **Gemini 4 Carbon** (architecture, linguistic phrase review, fresh-context adversarial audits, code review gates, and blind screenshot-only design critiques across 3 rounds per UI phase), **Gemini 4 Neon** (phase orchestration and multi-model integration), and **Gemini 4 Hydrogen** (focused parallel implementation tickets).

---

## Credits & Licences

- **Map & Routing Data:** Google Maps Platform (Maps JavaScript API via `@vis.gl/react-google-maps`, MIT Licence; Places API (New); and Routes API v2) plus `three` (MIT Licence) for the lazy `WebGLOverlayView` 3D dusk layer. Map data © Google.
- **Ambient Music:** 4 original 30-second instrumental loops generated at build time with Google **Lyria 3 Clip Preview** (`lyria-3-clip-preview`); metadata in [`web/public/audio/credits.json`](web/public/audio/credits.json).
- **Character Portraits:** 10 original fictional character illustrations generated at build time with **Gemini Nano Banana 2.1** (`gemini-nano-banana-2.1`) in `web/public/art/npcs/`.
- **UI Behaviour Primitives & Icons:** [`@ui-sdk/react`](https://ui-sdk.dev) (Apache-2.0 Licence) for accessible combobox, toolbar, popover, and alert-dialog focus management; [`@hugeicons/react`](https://hugeicons.com) (`@hugeicons/core-free-icons`, MIT Licence).
- **Typography:** `Anton`, `Hanken Grotesk`, `Noto Sans Kannada`, and `Noto Sans Devanagari` via Google Fonts (SIL Open Font Licence 1.1).
