# PROJECT_BRIEF.md

Single source of truth for Apna Area. Every agent reads this before planning. If a decision here changes, update this file first, then log it in `docs/DECISIONS.md`.

## 1. One line

Apna Area turns Bengaluru's Outer Ring Road into a playable city for someone about to move there: pick the office you are joining and Gemini builds your first week as a game, with real places, voice characters in Kannada, Hindi or English, and difficulty that adapts to you.

## 2. Hero user (name them, design for them)

**Ananya, 24, software engineer from Lucknow.** She joins a company in a Bellandur tech park in two weeks. She speaks Hindi and English, no Kannada. She does not know which area to live in, how bad the Silk Board commute really is, how to order at a darshini or how to deal with an auto driver who will not use the meter. She is anxious and short on time.

What she gets in under 3 minutes: a feel for the corridor, five survival phrases she has actually spoken out loud, a shortlist of areas with real commute times to her office, and a Survival Kit she keeps.

## 3. Judge tests and how we pass them

| Test | How Apna Area proves it live |
|---|---|
| Concrete problem for a named person | Ananya's first week on ORR. Every screen answers one of her questions. |
| Work that needs Gemini 4 reasoning, routing or verification | Neon plans a mission graph constrained to verified place IDs. Decision 1 scores each conversation and routes difficulty. Live API runs real-time multilingual NPCs. A verifier rejects any place not in the verified dataset. |
| People stay in control | Nothing leaves the app without an explicit confirm sheet (open route in Google Maps, share kit). No bookings, no payments, no stored voice. Location is never requested. |
| Live, real input, under 3 minutes | A judge picks any office on the map. World generation, a voice conversation, an adaptive switch and the Survival Kit all run live. |

## 4. Scope

**Map:** the eastern tech stretch of the Outer Ring Road, roughly Marathahalli to Silk Board, including Bellandur, Kadubeesanahalli, Devarabisanahalli, Agara, HSR Layout edge and the Sarjapur Road junction. Nothing outside this bounding box is shown or generated.

**Reference:** the levels.fyi Bengaluru atlas (levels.fyi/atlas/bengaluru) is the base inspiration for the map feel: a guided camera tour down the Outer Ring Road, free exploration, clickable places and quick search. We keep that feel and add the game on top.

**Core loop (the one workflow we demo):**
1. **Choose:** pick your office from verified tech parks on ORR, plus home budget band and language comfort.
2. **Generate:** the Director agent builds a "Week One" mission chain from verified places near that office.
3. **Play:** each mission is a short voice conversation with an NPC (auto driver, darshini owner, PG owner, BMTC/metro helper, office buddy) over the Live API. Captions on screen. Once Kannada is enabled (P3c), the NPC teaches and expects one Kannada phrase per mission.
4. **Adapt:** after each conversation, the Decisions API scores the attempt on a rubric. The next mission's language mix, hint level and pace change based on the score.
5. **Keep:** the Survival Kit: area shortlist with commute times from the Routes API, phrases learned with audio replay, and the checklist she built while playing. Exits only through confirm sheets.

**Non-goals (do not build):** login, accounts, payments, real bookings, user-generated content, multiplayer, any city area outside the box, mobile apps, admin dashboards, analytics dashboards, fine-tuning.

## 5. Phases (each one ships to Cloud Run before the next starts)

| Phase | Ships | Proves |
|---|---|---|
| P0 Skeleton | Monorepo, health endpoint, empty themed shell, deployed URL | Pipeline works end to end |
| P1 The Map | ORR corridor map, verified places dataset, office picker | Real, deterministic world |
| P2 The Director | Mission chain generation constrained to verified place IDs | Gemini 4 reasoning with verification |
| P3a English | Live API voice NPCs in English with captions and tools | Generative NPC dialogue |
| P3b Hindi | NPCs understand Hindi and code-switch | Multilingual voice |
| P3c Kannada | Kannada-first NPCs that teach a phrase per mission | The local, helpful twist |
| P4 Adaptive play | Decisions API scoring, difficulty routing, HUD and XP | Adaptive gameplay and calibrated routing |
| P5 Survival Kit | Routes API commute compare, phrasebook, confirm sheets, Lyria ambience | Helpful output and human control |
| P6 Harden and demo | Errors, retries, fallbacks, tests, a11y, perf, rehearsed 3-minute run | Reliability under judging |

**Languages ship one at a time:** English, then Hindi, then Kannada, each on its own branch and tag, controlled by `ENABLED_LANGUAGES` in `shared/config.ts`. If a language is not good enough, switch it off and the rest still works.

## 6. Stack (decided; change only through a DECISIONS.md entry)

- **Language:** TypeScript end to end, Node 22.
- **Web:** Vite + React. Google Maps JavaScript API through `@vis.gl/react-google-maps` (2D vector map with tilt and heading). Photorealistic 3D (`Map3DElement`) is a Later item, after the core loop ships.
- **Behaviour primitives:** UI SDK (github.com/vercel-labs/ui, ui-sdk.dev): "a library of behaviors for agents to build and drive the next generation of user interfaces". Used for keyboard, focus, selection and popup behaviours; install it and its agent skill as the repo README says (React import path `@ui-sdk/react`).
- **Icons:** Hugeicons.
- **Server:** Fastify, `@google/genai` (latest). Serves the built web app and the API from one container.
- **Data:** `data/orr/places.json` (verified with Places API (New) by a script, includes `place_id`), `data/orr/corridor.geojson`. No database. Player progress lives in `localStorage`.
- **Deploy:** one Cloud Run service, region `asia-south1`, secrets from Secret Manager.
- **Tests:** Vitest for units, Playwright smoke test against the deployed URL.

## 7. Runtime model routing (IDs live only in `shared/config.ts`)

| Job | Model | Why |
|---|---|---|
| Director: mission graph, NPC briefs | `gemini-4-neon` (thinking `medium`, raise to `high` if quality drops) | Complex structured planning while the user waits |
| Voice NPCs | `gemini-3.8-live` | Two-way low-latency voice with interruptions and tools |
| Scoring and difficulty routing | `gemini-decision-1` (v1beta) | Calibrated rubric scores in 150 to 250 ms, zero output tokens |
| Phrasebook, kit summaries, translations | `gemini-3.5-flash-lite` | Cheap, fast, structured |
| Ambient music loops | `lyria-3-clip-preview` | 30-second instrumental game loops |
| Optional mission art | `gemini-nano-banana-2.1` | Only if P5 is done early |
| Fallback on 503 | `gemini-4-hydrogen` | Retry path for Director |

Before writing any SDK call, check the exact syntax with the `gemini-api-dev` or `gemini-live-api-dev` skill or the Gemini docs MCP. Never guess.

## 8. Truth and safety rules (non-negotiable)

1. **No hallucinated places.** The Director may only reference `place_id`s from `data/orr/places.json`. Enforce with a structured-output enum and a server-side verifier that rejects and regenerates.
2. **No invented money facts.** Rents, fares and prices appear only as clearly labelled "estimates, verify locally" or not at all.
3. **NPCs are fictional people.** They are tied to a place type, never to a named real employee, and never say anything negative about a real business.
4. **Human in control.** Any action that leaves the app (open in Google Maps, share, download) goes through a confirm sheet that says exactly what will happen.
5. **Privacy.** Do not ask for location. Do not store audio. Transcripts stay in the browser session.
6. **Secrets.** `GEMINI_API_KEY` only on the server, from Secret Manager. The Maps browser key is referrer-restricted and served from `/api/config`. Nothing secret is ever committed.
7. **No mocks in the shipped flow.** A cached copy of a real earlier generation may be used only as a labelled fallback when a live call fails, never as the default.

## 9. Constraints

- Budget: about $40 of quota on a temporary account that is deleted the day after the event. Export everything (repo, assets, video) before you leave.
- Cost guard: cache Director output per office for the session, pre-generate Lyria loops once, cap Live sessions at 90 seconds each.
- Time: 8 to 12 focused hours. Every phase step ends merged to main, tagged and deployed.
- Git: phase branches, worktrees for parallel workers, `--no-ff` merges, revert instead of rewrite (see `.agents/rules/engineering.md`).

## 10. Submission

Live public Cloud Run URL, public GitHub repo (github.com/bhagyarana/Apna-Area) with no secrets in history, an architecture overview, and a demo video. The video has no length limit; it must cover every feature with a compelling story and an intuitive flow.
