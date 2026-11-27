# 15 · Phase 5: the Survival Kit, human control and music

**Goal:** the emotional peak. Ananya leaves with something real and useful: where to live with real commute times, the phrases she spoke, and her checklist. Every exit asks first.
**Where:** Antigravity. Lead on Neon. T5.1, T5.3 and T5.4 in parallel as Hydrogen workers.
**Time:** 90 minutes. **Tag:** `p5-kit`.

## Paste this into the lead conversation

```text
Phase 5. One goal: a Survival Kit screen built from real data, with confirm sheets for anything that leaves the app, plus an ambient soundtrack.

Branch: create phase/p5-kit from main. Parallel workers use their own worktrees (see .agents/rules/engineering.md, Git).

Read first: @PROJECT_BRIEF.md @docs/MODELS.md @docs/ARCHITECTURE.md @Design.md @.agents/rules/security-and-control.md
Use the Google Maps skills for the Routes API and the gemini-api-dev skill for Lyria and Flash-Lite.

Plan first, then wait for "go".

T5.1 server/kit/commute.ts: for 3 to 4 candidate neighbourhoods near the office (from places.json), call the Routes API for weekday 9:00 and 18:30 IST next Monday, traffic-aware, for drive and two-wheeler, plus transit where available. Return minutes and distance. Cache per office. Never estimate commute times with a model.
T5.2 server/kit/summary.ts: MODEL_IDS.textFastLite writes one honest line per neighbourhood using ONLY the numbers given (no prices, no invented facts). Validate with a schema.
T5.3 Confirm sheet component on UI SDK behaviours: title says exactly what will happen ("Open this route in Google Maps in a new tab"), primary and cancel, focus trapped, Esc closes. Use it for: open route in Google Maps (a maps URL with origin and destination), save kit as image, copy phrasebook.
T5.4 scripts/generate-music.ts: generate 4 instrumental 30-second loops with MODEL_IDS.musicLoop, one per mood (calm night, morning chai, rush hour, evening lake), run once, store in web/public/audio with a credits note. web/audio/ambient.ts: starts only after a user gesture, crossfades by mission mood, mute toggle remembered, volume low by default.
T5.5 Kit screen: headline "You're ready for Monday.", three cards (Where to live with commute bars, Phrases you spoke with replay, Your first-week checklist), entrance choreography under 600 ms total. Replay uses gemini-3.8-flash-tts audio generated on demand and cached, or the NPC's own audio clip if available.
T5.6 Tests: unit tests for commute aggregation and URL building; Playwright test that the confirm sheet appears before any external navigation.
T5.7 Ship with the ship-phase skill.

NOT touching: Director, scoring logic, map data.
Done when: finishing the week on the live URL shows the kit with real Routes API numbers, every exit goes through a confirm sheet, music plays only after the first tap, and the kit screen (the emotional peak) scores 9/10 in the design critic loop (02-prompts/28).
```

## Raise the bar
- Optional, only if green with 30 minutes spare: a Nano Banana "first-week poster" of the player's chosen neighbourhood in the app's art style, saved with the kit.

## Next
`16-phase-6-harden-demo.md`
