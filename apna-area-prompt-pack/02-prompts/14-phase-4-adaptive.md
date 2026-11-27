# 14 · Phase 4: adaptive gameplay with the Decisions API

**Goal:** every conversation is scored in under a second, and the next mission changes because of it. This is the "calibrated multimodal routing" judges look for.
**Where:** Antigravity. Lead on Neon. T4.1 and T4.2 in parallel as Hydrogen workers.
**Time:** 75 minutes. **Tag:** `p4-adaptive`.

## Paste this into the lead conversation

```text
Phase 4. One goal: score each finished mission with the Decisions API and adapt the next mission's language mix, hints and pace, visibly.

Read first: @PROJECT_BRIEF.md @docs/MODELS.md @Design.md @.agents/rules/gemini-models.md
Check Decisions API request and response shapes with the gemini-api-dev skill (v1beta client).

Branch: phase/p4-adaptive from main.

Plan first, then wait for "go".

T4.1 server/score/decide.ts: POST /api/score with { missionId, transcript, objective, phrase }. One Decisions call with MODEL_IDS.decisions and these questions:
  - objective_met: yes or no.
  - phrase_attempt (only asked when the mission had an active phrase, P3c onwards): ordered rubric [no attempt, own language only, partial local phrase, clear local phrase].
  - tone: ordered rubric [rude, neutral, polite, warm].
  - next_route: choice { more_local_language, keep_level, more_support, other }. When only English is enabled, more_local_language maps to keep_level.
  Return answers with probabilities and confidence. If any confidence is below 0.75, use the safe default from config (keep_level) and flag it in the response.
T4.2 shared/game/: pure, unit-tested functions. xpFor(answers), starsFor(answers), nextDifficulty(state, answers) returning { localLanguageShare, hintLevel, paceSeconds }, clamped by ENABLED_LANGUAGES. Deterministic, no model calls.
T4.3 Wire it: when a mission ends, call /api/score, update state, pass the new difficulty into the next persona. Show a short result card: XP rolling up, stars filling, one line of feedback that explains the change ("You nailed it. The next stop will speak more Kannada." when Kannada is enabled, otherwise about hints and pace).
T4.4 HUD: objective top-left, XP and stars top-right, week progress bar, all tabular numbers, motion under 300 ms.
T4.5 Tests: unit tests for every game function with edge cases (low confidence, other, all zeros); contract test for /api/score using a recorded real response.
T4.6 Ship with the ship-phase skill.

NOT touching: kit, music, map data.
Done when: playing two missions on the live URL shows a different language mix in mission two depending on how mission one went, and the score call returns in under 1 second at p50.
```

## Raise the bar
- Add a tiny "Why did this change?" disclosure that shows the rubric result in plain words. Transparency is a judge magnet.

## Next
`15-phase-5-survival-kit.md`
