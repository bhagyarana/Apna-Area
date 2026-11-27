# 26 · Vibe check and raise the bar

**Use when:** after each shipped phase (5 minutes), and whenever the project feels "fine" instead of great.
**Where:** a fresh conversation with the live URL open.
**Model:** Gemini 4 Neon at `high`.

## Paste this

```text
Be honest, not polite. Open the live URL [url] and play the core loop as Ananya would, then read @PROJECT_BRIEF.md and @docs/DEMO.md.

1. Score the project out of 100 on: usefulness to Ananya, wow in the first 20 seconds, reliability, craft and polish, clarity of value at first glance, how well it proves the four judge tests. Give the one weakest point for each.
2. How do you feel about the project's progress against the time left ([hours])?
3. Name the 3 cheapest changes (under 30 minutes each) that would raise the score the most. Rank by score gained per minute.
4. Name one "aha" detail a Google judge would screenshot. Is it built yet? If not, how would we build it in under 45 minutes without new risk?
5. What should we cut or hide because it weakens the demo?
```

Add accepted ideas to the "Later" list in `docs/TASKS.md` with estimates. Only pull them in when the current phase is green and shipped.
