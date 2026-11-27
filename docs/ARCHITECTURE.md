# System Architecture

## 1. High-Level System Diagram

```mermaid
flowchart LR
  subgraph Browser["Browser (React 19 + Vite + @ui-sdk/react)"]
    MapUI["ORR 2D Vector Map (@vis.gl/react-google-maps)"]
    Picker["Office Picker & Week HUD"]
    LiveClient["AudioWorklet 16kHz In / 24kHz Out + Live WS"]
    KitUI["Survival Kit + Confirm Sheets"]
    Store["Session & localStorage State"]
  end

  subgraph CloudRun["Cloud Run Service (asia-south1, Node 22 + Fastify)"]
    Static["SPA Static Server (web/dist)"]
    ConfigAPI["GET /api/health & /api/config"]
    PlacesAPI["GET /api/places & /api/corridor"]
    WorldAPI["POST /api/world (SSE + Verifier + Cache)"]
    TokenAPI["POST /api/live-token (v1alpha AuthToken)"]
    ScoreAPI["POST /api/score (Decisions Rubric)"]
    KitAPI["POST /api/kit & /api/tts (Routes + Summary + TTS)"]
    DataFiles["Verified Static Data (data/orr/*.json, data/phrases.json)"]
  end

  subgraph GoogleAPIs["Google Cloud & Gemini APIs"]
    SecretMgr["Secret Manager (GEMINI_API_KEY, MAPS_BROWSER_KEY)"]
    Neon["Gemini 4 Neon / Hydrogen (Interactions API v1)"]
    Live["Gemini 3.8 Live (WebSocket v1alpha)"]
    Decision["Gemini Decision 1 (Decisions API v1beta)"]
    FlashLite["Gemini 3.5 Flash-Lite (v1) & 3.8 Flash TTS (v1beta)"]
    MapsPlatform["Google Maps JS, Places (New) & Routes v2"]
  end

  Browser -->|"HTTPS + SSE"| CloudRun
  MapUI -->|"Maps JS SDK (Referrer-Restricted Key)"| MapsPlatform
  LiveClient <-->|"WSS v1alpha (Ephemeral Token)"| Live
  CloudRun -->|"Reads at Startup"| SecretMgr
  WorldAPI -->|"Structured JSON"| Neon
  WorldAPI -->|"Validates IDs"| DataFiles
  TokenAPI -->|"authTokens.create"| Live
  ScoreAPI -->|"decisions.create"| Decision
  KitAPI -->|"computeRouteMatrix"| MapsPlatform
  KitAPI -->|"Summary + WAV TTS"| FlashLite
```

## 2. Monorepo Folder Structure

```text
Apna-Area/
├── AGENTS.md
├── PROJECT_BRIEF.md
├── Design.md
├── Dockerfile
├── package.json                  # npm workspaces: shared, server, web
├── playwright.live.config.ts
├── vitest.config.ts
├── .agents/
│   ├── rules/                    # engineering, design, gemini-models, security-and-control, context-hygiene
│   └── skills/                   # ship-phase, handoff
├── shared/src/
│   ├── config.ts                 # MODEL_IDS, ORR_BBOX, ENABLED_LANGUAGES, timeouts, rate limits
│   ├── types.ts                  # Zod schemas + inferred TypeScript types shared by server & web
│   ├── world.ts / live.ts / kit.ts
│   ├── http.ts                   # fetchWithRetry + toUserErrorMessage normaliser
│   ├── logger.ts                 # Cloud Logging structured JSON logger
│   └── game/scoring.ts           # Pure functions: xpFor, starsFor, nextDifficulty
├── data/
│   ├── phrases.json              # 30 Kannada survival phrases keyed by PhraseSituation (P3c)
│   └── orr/
│       ├── places.json           # Verified Places API (New) dataset with place_id & verifiedAt
│       ├── corridor.geojson      # Decoded ORR route LineString (Marathahalli to Silk Board)
│       └── fallback-plans.json   # Recorded verified real Gemini 4 Neon fallback runs
├── scripts/
│   ├── verify-places.ts          # Build-time Places API (New) Text Search + bbox filter
│   ├── build-corridor.ts         # Build-time Routes API corridor GeoJSON builder
│   ├── generate-portraits.ts     # Build-time Nano Banana 2.1 NPC portraits -> web/public/art/npcs/
│   └── generate-music.ts         # Build-time Lyria 30s mood loops -> web/public/audio/
├── server/src/
│   ├── main.ts                   # Process entrypoint, Secret Manager env wiring, graceful shutdown
│   ├── app.ts                    # Fastify factory, rate-limit, requestId logging, SPA static serve
│   ├── routes/                   # health.ts, config.ts, places.ts, world.ts, liveToken.ts, score.ts, kit.ts, tts.ts
│   ├── world/                    # candidates.ts, director.ts, prompt.ts, runner.ts, schema.ts, verify.ts, cache.ts
│   ├── live/                     # persona.ts, phrases.ts, token.ts, tools.ts
│   ├── score/                    # decide.ts, questions.ts
│   └── kit/                      # pockets.ts, commute.ts, summary.ts, tts.ts
├── web/
│   ├── package.json
│   ├── index.html
│   ├── public/
│   │   ├── art/npcs/             # Pre-generated fictional NPC portraits
│   │   └── audio/                # Pre-generated 30s Lyria instrumental loops + credits.json
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── styles/tokens.css     # Design.md CSS custom properties
│       ├── map/                  # OrrMap.tsx, CorridorLayer.tsx, CameraTour.tsx, mapStyle.ts
│       ├── picker/               # OfficePicker.tsx, TunePopover.tsx
│       ├── hud/                  # WeekProgressBar.tsx, MissionCard.tsx, XpCounter.tsx, ProgressChips.tsx
│       ├── live/                 # useLiveSession.ts, pcmWorklet.ts, MissionDialog.tsx, Captions.tsx
│       ├── score/                # MissionResultCard.tsx, WhyChangedDisclosure.tsx
│       ├── kit/                  # SurvivalKit.tsx, CommuteCard.tsx, PhrasebookCard.tsx, ConfirmSheet.tsx
│       └── audio/                # ambient.ts
└── docs/                         # PRD, ARCHITECTURE, MODELS, DATA, TASKS, TESTING, DEMO, RISKS, DECISIONS, HANDOFF
```

## 3. HTTP & SSE API Contracts

All API endpoints return JSON matching `ApiResult<T> = { ok: true; data: T; requestId: string } | { ok: false; error: { code: string; message: string; retryable: boolean }; requestId: string }`, except `POST /api/world` when `Accept: text/event-stream` is sent (with standard JSON fallback if `Accept: application/json` is requested after a transient SSE drop). Fastify boots with `trustProxy: true` so Cloud Run load-balancer headers resolve each visitor IP accurately. Rate limit: 180 requests per minute per IP across `/api/*` reads (`POST /api/world`, `/api/live-token`, `/api/score`, `/api/kit`, and `/api/tts` capped at 30 per minute per IP to protect budget while accommodating shared conference NAT Wi-Fi).

| Method & Path | Request Schema (Zod) | Response Payload (`data`) | Timeout & Cache |
|---|---|---|---|
| `GET /api/health` | none | `{ status: "ok", version: string, commit: string, builtAt: string, upstreams: { placesLoaded: number, geminiConfigured: boolean, mapsConfigured: boolean, mapsServerConfigured?: boolean, phrasesLoaded?: number, fallbackPlansLoaded?: number } }` | 2 s, pre-validated at boot |
| `GET /api/config` | none | `{ mapsBrowserKey: string, mapId: string, enabledLanguages: LanguageCode[], orrBbox: BoundingBox, featureFlags: FeatureFlags }` | 2 s, 60 s memory |
| `GET /api/places` | `?category=` optional | `{ places: VerifiedPlace[], corridor: GeoJSONLineString, verifiedAt: string }` | 2 s, immutable in-process |
| `POST /api/world` | `{ officePlaceId: string, languageComfort: "en" \| "hi" \| "en_hi", budgetBand: "15_20k" \| "20_30k" \| "30k_plus" }` | SSE events: `progress` (`{ step, detail, count? }`), `complete` (`{ plan: WeekPlan, replayed: boolean, modelUsed: string, durationMs: number }`), `error` (`{ code, message, retryable }`) | 24 s Neon / 16 s Hydrogen, cached in LRU + pre-warms `/api/kit` commutes |
| `POST /api/live-token` | `{ mission: Mission, officeName: string, placeName: string, placeCategory: PlaceCategory, difficulty: DifficultyState, activeLanguage: LanguageCode, languageComfort?: LanguageComfort }` | `{ token: string, expireTime: string, model: string, apiVersion: "v1alpha", maxDurationSeconds: number, voiceName: string, includePhraseTool: boolean, phrase?: SurvivalPhrase }` | 6 s, never cached (`uses: 3` for reconnect safety, 2 min new-session window) |
| `POST /api/score` | `{ mission: Mission, difficulty: DifficultyState, activeLanguage: LanguageCode, transcript: TranscriptTurn[], toolSignals: LiveToolSignals, targetPhrase?: SurvivalPhrase, usedTextFallback: boolean }` | `{ missionId: MissionId, xpEarned: number, stars: 1 \| 2 \| 3, objectiveMet: boolean, effectiveRoute: RouteChoice, lowConfidenceFallback: boolean, rubric: RubricScores, nextDifficulty: DifficultyState, adaptationSummary: string, modelUsed: string, fallbackUsed: boolean, durationMs: number }` | 4 s, stateless (`Cache-Control: no-store`, transcripts redacted from logs) |
| `POST /api/kit` | `{ officePlaceId: string, budgetBand: BudgetBand, recommendedNeighbourhoods?: RecommendedNeighbourhood[], completedMissionIds: MissionId[], learnedPhraseIds: string[] }` | `{ office: VerifiedPlace, mondayMorningIso: string, mondayEveningIso: string, neighbourhoods: NeighbourhoodCommute[], phrases: SurvivalPhrase[], starterPhraseIds: string[], checklist: ChecklistItem[], summaryFallbackUsed: boolean }` | 7 s Routes + 5 s Flash-Lite, both cached in memory + pre-warmed |
| `POST /api/tts` | `{ phraseId: string }` | `{ phraseId: string, audioWavBase64: string, mimeType: "audio/wav", cached: boolean }` | 8 s, cached in-memory by `phraseId` |

## 4. Core Sequence Diagrams

### 4.1 World Generation (`POST /api/world`)
```mermaid
sequenceDiagram
  participant Web as Browser
  participant Srv as Fastify (/api/world)
  participant Cand as candidates.ts
  participant Neon as Gemini 4 Neon (v1)
  participant Ver as verify.ts

  Web->>Srv: POST /api/world (SSE) { officePlaceId, languageComfort }
  Srv-->>Web: event: progress ("Scanning verified ORR places within 3 km")
  Srv->>Cand: selectCandidates(officePlaceId, placesJson)
  Cand-->>Srv: 12 to 20 VerifiedPlace items (deterministic sort)
  Srv-->>Web: event: progress ("Found 16 verified places near your office")
  Srv->>Neon: interactions.create (thinking_level="medium", enum of candidate IDs)
  Neon-->>Srv: WeekPlan JSON string
  Srv->>Ver: verifyWeekPlan(plan, candidates, orrBbox)
  alt Plan passes all checks
    Srv-->>Web: event: progress ("Verified 5 of 5 mission locations")
    Srv-->>Web: event: complete { plan, replayed: false }
  else Verifier rejects or 503
    Srv->>Neon: Retry once with verifier errors (or fallback to gemini-4-hydrogen)
    Neon-->>Srv: Corrected WeekPlan
    Srv-->>Web: event: complete { plan, replayed: false }
  end
```

### 4.2 Voice Mission (`POST /api/live-token` + `gemini-3.8-live`)
```mermaid
sequenceDiagram
  participant Web as Browser (useLiveSession)
  participant Srv as Fastify (/api/live-token)
  participant Auth as Gemini AuthTokens (v1beta)
  participant Live as Gemini 3.8 Live (WSS)

  Web->>Srv: POST /api/live-token { mission, difficulty }
  Srv->>Srv: Build fictional NPC systemInstruction + NON_BLOCKING tools
  Srv->>Auth: authTokens.create (uses=3, liveConnectConstraints locked to model + config)
  Auth-->>Srv: token.name (ephemeral v1beta token)
  Srv-->>Web: { token, maxDurationSeconds: 90, phrase }
  Web->>Live: new GoogleGenAI({ apiKey: token, httpOptions: { apiVersion: "v1beta" } }).live.connect(...)
  Web->>Live: sendRealtimeInput({ audio: 16kHz PCM })
  Live-->>Web: serverContent (24kHz PCM chunks + input/output transcriptions)
  Live-->>Web: toolCall (mark_phrase_attempt / give_hint / complete_objective)
  Web->>Live: sendToolResponse({ functionResponses })
  Web->>Live: Wait for turnComplete + PCM buffer drain (max 3.5s), then session.close()
```

### 4.3 Scoring & Adaptation (`POST /api/score`)
```mermaid
sequenceDiagram
  participant Web as Browser
  participant Srv as Fastify (/api/score)
  participant Dec as Gemini Decision 1 (v1beta)
  participant Game as shared/game

  Web->>Srv: POST /api/score { missionId, transcript, objective, activePhrase }
  Srv->>Dec: decisions.create(model="gemini-decision-1", questions={objective_met, phrase_attempt, tone, next_route})
  Dec-->>Srv: Calibrated answers + probabilities + confidence (150-250 ms, 0 output tokens)
  Srv->>Game: Clamp confidence < 0.75 to keep_level; compute xpFor, starsFor, nextDifficulty
  Game-->>Srv: { xpEarned, stars, nextDifficulty }
  Srv-->>Web: 200 OK { answers, xpEarned, stars, nextDifficulty, summaryLine }
```

### 4.4 Survival Kit & Human-in-Control Export
```mermaid
sequenceDiagram
  participant Web as Browser (SurvivalKit)
  participant Srv as Fastify (/api/kit)
  participant Routes as Google Routes API v2
  participant Lite as Gemini 3.5 Flash-Lite

  Web->>Srv: POST /api/kit { officePlaceId, completedMissionIds, learnedPhraseIds }
  Srv->>Routes: computeRoutes (Monday 09:00 & 18:30 IST, DRIVE / TWO_WHEELER / TRANSIT)
  Routes-->>Srv: Real durations + distances
  Srv->>Lite: interactions.create (1 factual summary line per area, zero price claims)
  Lite-->>Srv: Validated area blurbs
  Srv-->>Web: SurvivalKit payload
  Web->>Web: User clicks "Open route in Google Maps"
  Web->>Web: ConfirmSheet traps focus ("Open Google Maps in a new tab?" + Cancel)
  Web->>Web: Only after explicit Confirm click -> window.open(mapsUri, "_blank", "noopener")
```

## 5. Error Handling, Retries, and Caching
- **Retry policy:** Every Gemini and Maps server call has an AbortSignal timeout, 1 retry with jittered backoff (`250 ms + random(0..200 ms)`) on HTTP `429` or `503`, and structured JSON error logging (`severity`, `event`, `requestId`, `durationMs`).
- **Director fallback ladder:** `gemini-4-neon` -> 1 verifier-guided retry -> `gemini-4-hydrogen` -> committed real snapshot in `data/orr/fallback-plans.json` (generated from real `gemini-4-neon` runs at build time so even a fresh cold Cloud Run revision has a non-empty fallback) marked `replayed: true` (renders banner: `Replayed from an earlier run`).
- **Privacy in structured logs:** `shared/logger.ts` hashes prompts and strictly redacts `transcript` arrays, inline audio, and secrets before writing structured JSON to stdout.
- **Caching & Pre-warming:**
  - `places.json`, `corridor.geojson`, and `fallback-plans.json`: loaded once into memory on Fastify boot; frozen.
  - `WeekPlan`: LRU cache (max 50 entries, TTL 2 hours) keyed by `${officePlaceId}:${languageComfort}:${budgetBand}`.
  - Routes API commutes (`computeRouteMatrix` v2): pre-warmed asynchronously in the background the moment `POST /api/world` starts for `officePlaceId`, cached by `${officePlaceId}:${nextMondayDate}` (TTL 6 hours) so Survival Kit opens instantaneously even on a cold office pick.
  - Phrase TTS WAV clips: pre-warmed for Mission 1's active phrase on `/api/live-token` and cached in memory by `phraseId` (max 30 clips).
