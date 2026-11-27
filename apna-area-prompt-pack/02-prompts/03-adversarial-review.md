# 03 · Adversarial review of the plan

**Use when:** after docs are generated, and again before P6 on the built product.
**Where:** a NEW Antigravity conversation (fresh eyes, no sunk cost).
**Model:** Gemini 4 Carbon at `high`.
**Time:** 10 minutes.

## Paste this

```text
Act as an adversarial reviewer and a Google judge at a one-day Gemini hackathon. You did not write any of this and you are looking for reasons it fails.

Read: @PROJECT_BRIEF.md @docs/PRD.md @docs/ARCHITECTURE.md @docs/MODELS.md @docs/TASKS.md @docs/DEMO.md

1. Score the project against the four judge tests (concrete user, needs Gemini 4 reasoning or verification, people in control, live in under 3 minutes). 0 to 10 each, with the single weakest point per test.
2. List 3 ways this could fail while looking like success at first (for example: voice works in English but Kannada sounds broken; the Director returns valid JSON with dull missions; the demo depends on a cold start).
3. Second-order consequences: what breaks downstream if the Live API is slow, if Places returns fewer results, if Decisions confidence is low, if the venue Wi-Fi drops.
4. Blind spots: anything about cost, quota, latency, accessibility, privacy, copyright or cultural respect for Bengaluru that we have not addressed.
5. The 80/20 cut: if we had half the time, what is the smallest version that still passes all four tests?
6. Give a prioritised list of changes to the docs. For each: file, exact edit, why.

Then assume your own review is wrong somewhere. Find the weakest point in it and correct it. End with your confidence (0 to 100) and the single assumption that would most change your verdict.
```

## After the review
Ask the docs conversation (prompt 02) to apply only the changes you agree with, then commit "docs: apply adversarial review".

## Next
`04-design-discover.md` then `05-stitch-design.md` (50 minutes together, can run in parallel with P0), or straight to `10-phase-0-skeleton.md` if time is short.
