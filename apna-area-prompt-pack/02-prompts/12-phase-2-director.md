# 12 · Phase 2: the Director agent (procedural world-building)

**Goal:** after picking an office, the player gets a five-mission "Week One" built live by Gemini 4 Neon, using only verified places and verified phrases.
**Where:** Antigravity. Lead on Neon. T2.1 first (shared type), then T2.2 and T2.3 in parallel worktrees; T2.3 to T2.5 sequential.
**Time:** 90 minutes. **Tag:** `p2-director`.

## Paste this into the lead conversation

```text
Phase 2. One goal: POST /api/world turns an office choice into a verified five-mission week, and the UI shows it being built.

Read first: @PROJECT_BRIEF.md @docs/MODELS.md @docs/ARCHITECTURE.md @Design.md @.agents/rules/gemini-models.md
Check Interactions API and structured output syntax with the gemini-api-dev skill before writing any call.

Plan first (goal, assumptions, NOT touching, tickets), then wait for "go".

Branch: phase/p2-director from main.

T2.1 shared/types.ts: a PhraseSituation enum (greeting, darshini_order, auto_meter, directions, renting, thanks, polite_refusal). The Director picks a situation per mission; actual phrases arrive in P3c, so this phase ships no phrase data.
T2.2 server/world/candidates.ts: given an office place_id, select candidate places within 3 km by category (pure function, unit tested, deterministic ordering by distance then id).
T2.3 server/world/director.ts: call MODEL_IDS.frontierFast with thinking "medium" and a response schema where place_id is an ENUM of the candidate ids and phraseSituation is the PhraseSituation enum. Output: WeekPlan with 5 missions { id, day, title, placeId, npcRole (auto_driver | darshini_owner | pg_owner | transit_helper | office_buddy), objective, phraseSituation, successCriteria, hintLadder[3], mood (calm | morning | rush | evening) }. Missions must form a believable first week and use 5 different places.
T2.4 server/world/verify.ts: reject plans with unknown ids, repeated places, empty criteria or missions outside the box. On failure, regenerate once with the verifier errors appended. Then fall back to MODEL_IDS.fastWorkhorse. Log every attempt. Unit test the verifier with good and bad fixtures.
T2.5 Streaming progress: the route streams Server-Sent Events with real steps ("Found 14 places near your office", "Verified 5 of 5", "Writing your week"). The web shows them as chips, then drops mission pins one by one (60 ms stagger) and a 5-step week progress bar. Cache results per office and settings for the session.
T2.6 Ship with the ship-phase skill.

NOT touching: voice, scoring, kit.
Done when: picking any verified office on the live URL produces a valid week in under 12 seconds with visible progress, the verifier rejects a hand-made bad plan in tests, logs show model, latency and token use for each call, and the progress chips plus mission cards score 9/10 in the design critic loop (02-prompts/28).
```

## Raise the bar
- Give each mission a one-line "why this matters for Ananya" so the week reads like a story, not a list.

## Next
`13-phase-3-voice-npcs.md`
