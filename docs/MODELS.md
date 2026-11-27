# Runtime Models & Prompt Specifications

All model identifiers live exclusively in `shared/config.ts` (`MODEL_IDS`) and are imported by server modules. No model string may appear inline anywhere else.

## 1. Verified `MODEL_IDS` Registry (`shared/config.ts`)

```ts
export const MODEL_IDS = {
  frontierDeep: "gemini-4-carbon",
  frontierFast: "gemini-4-neon",
  fastWorkhorse: "gemini-4-hydrogen",
  textFastLite: "gemini-3.5-flash-lite",
  decisions: "gemini-decision-1",
  liveVoice: "gemini-3.8-live",
  ttsStudio: "gemini-3.8-flash-tts",
  imageDefault: "gemini-nano-banana-2.1",
  musicLoop: "lyria-3-clip-preview",
  musicSong: "lyria-3.5",
} as const;
```

## 2. Hard SDK Rules (Verified via `gemini-api-dev` & `gemini-live-api-dev`)
- **SDK package:** `@google/genai` `>= 3.6.1`.
- **API versions:** Default `new GoogleGenAI({})` (`v1`) for Interactions API (`gemini-4-neon`, `gemini-4-hydrogen`, `gemini-3.5-flash-lite`, `gemini-nano-banana-2.1`). Use `v1beta` for `decisions.create`, `gemini-3.8-flash-tts`, and `lyria-3-clip-preview`, and `v1alpha` for `authTokens.create` + `live.connect` (`ADR-015`).
- **Gemini 4 parameter boundaries:** Never pass `temperature`, `top_p`, `top_k`, `thinking_budget`, `minimal` thinking, or `cached_content` to `gemini-4-*`. Valid `thinking_level` values for Neon and Hydrogen: `"low" | "medium" | "high" | "xhigh"`.
- **Gemini 3.8 Live boundary:** Never pass `thinkingConfig` / `thinking_level` or `proactive_audio: false` to `gemini-3.8-live`. Use `responseModalities: ["AUDIO"]` with `inputAudioTranscription: {}` and `outputAudioTranscription: {}`.
- **Privacy opt-out:** Pass `store: false` on stateless server `interactions.create` calls so user inputs are not retained unnecessarily.

## 3. Runtime Jobs Matrix

| Job | Model ID | API Surface | Thinking | Latency Budget | Est. Cost / Demo Run | Fallback Path |
|---|---|---|---|---|---|---|
| **1. Director (`POST /api/world`)** | `gemini-4-neon` | `interactions.create` (`v1`) | `"medium"` | `< 12 s` (`24 s` Neon cap, `16 s` Hydrogen cap) | ~$0.018 (1 call, cached per office) | 1 verifier retry -> `gemini-4-hydrogen` (`"medium"`) -> labelled real replay (`Replayed from an earlier run`) |
| **2. Voice NPC (`POST /api/live-token` + WSS)** | `gemini-3.8-live` | `authTokens.create` + `live.connect` (`v1alpha`) | omitted (not supported on `3.8-live`) | `< 1.0 s` turn response, `90 s` cap | ~$0.035 per 60 s voice mission | `uses: 3` session resumption + `Retry`; text input fallback via `sendRealtimeInput({ text })` |
| **3. Mission Scorer (`POST /api/score`)** | `gemini-decision-1` | `decisions.create` (`v1beta`) | prefill pass (`0` output tokens) | `< 600 ms` (`p50 ~450 ms`, timeout `4 s`) | ~$0.0008 per mission | Retry once on 429/503 -> labelled deterministic fallback (`fallbackUsed: true`) |
| **4. Kit Neighbourhood Blurbs (`POST /api/kit`)** | `gemini-3.5-flash-lite` | `interactions.create` (`v1`) | `"minimal"` | `< 1.8 s` (timeout `5 s`, cached) | ~$0.0004 per kit | Deterministic corridor note verified free of price claims and repeated bar numbers |
| **5. Phrasebook Replay (`POST /api/tts`)** | `gemini-3.8-flash-tts` | `interactions.create` (`v1beta`, `stream: false`) | n/a | `< 2.0 s` first play, `0 ms` cached | ~$0.002 per phrase | Inline pronunciation line (`script · transliteration · meaning`) |
| **6. Ambient Loops (Build Script)** | `lyria-3-clip-preview` | `interactions.create` (`v1beta`) | n/a | Build-time only (`4 x 30 s` MP3s) | ~$0.16 one-time build cost (`$0` per visitor) | App runs silently if audio asset missing or muted |
| **7. NPC Portraits (Build Script)** | `gemini-nano-banana-2.1` | `interactions.create` (`v1`, `1:1`, `1K`) | n/a | Build-time only (`10` WebP portraits) | ~$0.18 one-time build cost (`$0` per visitor) | Monogrammed geometric avatar fallback in palette tokens |

**Total live API spend per complete 3-minute judge run:** approximately **$0.06 to $0.09** (well under 0.25% of the $40 hackathon budget).

---

## 4. Job Specifications, Schemas, and Prompt Skeletons

### 4.1 Director (`server/world/director.ts`)

**SDK Call Pattern:**
```ts
const interaction = await genaiV1.interactions.create({
  model: MODEL_IDS.frontierFast,
  system_instruction: DIRECTOR_SYSTEM_INSTRUCTION,
  input: buildDirectorInput(office, candidates, prefs, verifierErrors),
  generation_config: { thinking_level: "medium" },
  response_format: {
    type: "text",
    mime_type: "application/json",
    schema: buildWeekPlanJsonSchema(candidatePlaceIds),
  },
  store: false,
});
```

**Response Schema (`WeekPlan`):**
- `officePlaceId`: `enum` locked to `[office.id]`
- `weekTheme`: `string` (max 90 chars, no em dashes)
- `recommendedNeighbourhoods`: array of `3` `enum` values chosen from `NEIGHBOURHOOD_IDS` tailored to `officePlaceId` and `budgetBand`, each with `{ neighbourhoodId, fitReason }`
- `missions`: array of exactly `5` items (`minItems: 5, maxItems: 5`), each:
  - `id`: `"m1" | "m2" | "m3" | "m4" | "m5"`
  - `day`: `"Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday"`
  - `title`: `string` (max 48 chars)
  - `whyItMatters`: `string` (1 sentence grounded in a newcomer's first week, max 120 chars)
  - `whyThisPlace`: `string` (short spatial reason this verified place fits, max 80 chars)
  - `placeId`: `enum` dynamically populated with ONLY `candidatePlaceIds` near `officePlaceId`
  - `npcRole`: `"auto_driver" | "darshini_owner" | "pg_owner" | "transit_helper" | "office_buddy"`
  - `npcFirstName`: `string` (fictional given name only, never a surname or real employee claim)
  - `npcGender`: `"male" | "female"` (binds polite Kannada honorifics `aṇṇa` vs `akka` accurately)
  - `objective`: `string` (actionable 1-sentence goal for the 90-second voice scene)
  - `phraseSituation`: `"greeting" | "darshini_order" | "auto_meter" | "directions" | "renting" | "thanks" | "polite_refusal"`
  - `successCriteria`: array of 2 concrete checks (`string`)
  - `hintLadder`: array of exactly 3 escalating hints (`string`, `[subtle, direct, exact_words]`)
  - `mood`: `"calm" | "morning" | "rush" | "evening"`

**Prompt Skeleton:**
```text
SYSTEM:
You are the Game Director for Apna Area, designing Week One on Bengaluru's Outer Ring Road for Ananya, a 24-year-old newcomer from Lucknow joining {{officeName}}.
Rules:
1. Choose 5 DIFFERENT placeId values strictly from the provided candidate list, using each npcRole once across Monday to Friday.
2. Order missions as a natural first week: arrival/commute, breakfast at a darshini, room/PG visit, transit/directions, and settling in near the office.
3. Never invent place names, fares, rents, deposits, or prices. Never say anything negative about any real place.
4. Keep copy warm, specific, sentence case, and free of em dashes.

INPUT:
Office: {{officeJson}}
Player preferences: languageComfort={{languageComfort}}, budgetBand={{budgetBand}}
Verified candidate places within 3 km: {{candidatesJson}}
{{#if verifierFeedback}}Previous attempt failed verification: {{verifierFeedback}}. Fix every listed issue.{{/if}}
```

---

### 4.2 Decisions API Scorer (`server/src/score/decide.ts`, `server/src/score/questions.ts`)

**SDK Call Pattern (`v1beta`):**
```ts
const res = await client.decisions.create({
  model: MODEL_IDS.decisions,
  input: buildDecisionInputText(req), // includes native Kannada script + Roman transliteration + English
  questions: MISSION_DECISION_QUESTIONS,
});
```

**Questions Schema & Threshold Rules (5 parallel questions, `0` output tokens):**
1. `objective_met` (`type: "noul"`):
   - `instructions`: `"Did the player satisfy the scene objective in the conversation or via objectiveCompleted?"`
   - Threshold: `noul >= 0.60` (or `toolSignals.objectiveCompleted === true`) counts as objective met.
2. `objective_score`, `phrase_score`, `tone_score` (`type: "score"`, ordered `0..3` criteria):
   - Evaluates objective clarity, local Kannada phrase engagement (accounting for phonetic ASR transliteration, typed fallback input, and Live `mark_phrase_attempt` signals), and polite everyday Bengaluru rapport.
   - **Split-brain guard:** If `toolSignals.phraseQuality === "clear"`, `decide.ts` floors `phrase_score` at `>= 2.4`. If `phraseScore >= 2.0`, the phrase is persisted to `learnedPhraseIds` even if `mark_phrase_attempt` was skipped.
3. `next_route` (`type: "choice"`, keys sorted alphabetically with mandatory `other`):
   - `criteria` keys: `["ease_level", "keep_level", "other", "step_up"]`.
   - **Confidence & clamp rule:** `confidence` is floor-truncated to 3 decimals; if `confidence < 0.75` or `choice === "other"`, `resolveEffectiveRoute` clamps to `"keep_level"` and sets `lowConfidenceFallback: true`. When `fallbackUsed === true`, the UI labels the drawer `"Estimated rubric (fallback)"` instead of `"Calibrated rubric"`.

---

### 4.3 Live API NPC Persona & Tools (`server/live/persona.ts`, `server/live/token.ts`)

**NPC Persona Schema (`NpcPersonaConfig`):**
```ts
export interface NpcPersonaConfig {
  role: NpcRole;
  firstName: string;              // Fictional first name only
  placeCategoryLabel: string;     // e.g., "South Indian darshini near Bellandur"
  objective: string;
  enabledLanguages: LanguageCode[];
  primaryLanguage: LanguageCode;  // Controlled by ENABLED_LANGUAGES + difficulty
  localLanguageShare: number;     // 0.0 to 0.8
  hintLevel: 1 | 2 | 3;
  paceSeconds: 60 | 75 | 90;
  targetPhrase?: {
    id: string;
    kannada: string;
    transliteration: string;
    english: string;
    hindi: string;
  };
}
```

**Live Non-Blocking Tools (`behavior: "NON_BLOCKING"`):**
- `give_hint({ level: 1 | 2 | 3, hintText: string })`: Surfaces a visual hint chip in the HUD when the player pauses or asks for help.
- `mark_phrase_attempt({ phraseId: string, attempted: boolean, quality: "partial" | "clear" })`: Registered only when `targetPhrase` is present (`P3c`); triggers the teal pulse, chime, and flying phrasebook card on `"clear"`.
- `complete_objective({ summary: string })`: Signals the client to display the completion badge, wait for `serverContent.turnComplete === true` and PCM audio queue drain (capped at `3.5s` max) so the NPC's closing line and trailing transcription finish cleanly, close the WebSocket, and call `POST /api/score`.

**NPC System Instruction Template:**
```text
You are {{firstName}}, a fictional, warm, dignified {{roleLabel}} near {{placeCategoryLabel}} on Bengaluru's Outer Ring Road.
You are speaking with a newcomer who moves to Bengaluru in two weeks (use their name only if they introduce themselves; never assume a name).
Personality: friendly, busy street-smart Bengaluru local, mildly witty, patient, respectful. Keep each spoken turn under 2 short sentences (under 12 seconds of speech) so the player gets plenty of turns within 90 seconds.
Language rules:
- Enabled languages: {{enabledLanguages}}. Lead in {{primaryLanguage}}.
- Follow the player immediately if they switch between enabled languages.
- Always use polite plural Kannada forms (ನೀವು, ಕೊಡಿ, ಹೇಳಿ) and match any honorific to your gender ({{honorificHint}}).
{{#if targetPhrase}}
- Naturally teach and invite the player to try this one Kannada phrase once: "{{targetPhrase.kannada}}" ({{targetPhrase.transliteration}}, meaning "{{targetPhrase.english}}"). Call mark_phrase_attempt as soon as they try it.
{{/if}}
Safety rules:
- You are a fictional character, never a real employee of any named company or shop.
- Never state exact rupees, rents, deposits, or fares as facts; speak about practical local habits (such as checking Namma Yatri or meter etiquette, peak-hour commute timing, or water/power backup questions at a PG).
- Never say anything negative about any real place or business.
- When the player achieves "{{objective}}", give a warm 1-sentence sign-off and call complete_objective.
```

---

### 4.4 Kit Summary (`gemini-3.5-flash-lite`) & Phrase TTS (`gemini-3.8-flash-tts`)
- **Kit Summary (`server/kit/summary.ts`):** Uses `MODEL_IDS.textFastLite` with `thinking_level: "minimal"` and strict JSON schema `{ summaries: [{ areaName, oneLine }] }`. Prompt provides ONLY `{ areaName, morningDriveMin, eveningDriveMin, twoWheelerMin, distanceKm }` and forbids any mention of rent, cost, or unverified claims.
- **Phrase TTS (`server/kit/tts.ts`):** Uses `MODEL_IDS.ttsStudio` (`v1beta`, `stream: false`, `response_format: { type: "audio" }`, `speech_config: [{ voice: "Sulafat" }]`) with `speech_metadata` style `"clear, warm Bengaluru local pronunciation at a steady learner pace"` to return a self-contained 24 kHz `audio/wav` clip.
