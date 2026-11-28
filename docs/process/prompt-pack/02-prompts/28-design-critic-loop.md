# 28 · Design critic loop: an outside eye until it hits studio quality

**Use when:** at the end of every phase that changes UI (P1, P2, P3, P5, P6), before `ship-phase`. Also on any screen that "works but looks AI-made".
**Who does what:**
- **Builder:** the phase's lead conversation (Neon). Cheap, fast, does the code.
- **Critic:** a FRESH conversation every round on Gemini 4 Carbon. It sees only screenshots, never code, history or earlier critiques. It spends few tokens and gives taste.
**Time:** 15 to 30 minutes per screen.

**Why:** an agent reviewing its own work defends its own decisions. A critic that sees only pixels judges the result, not the effort. (Technique 3, "How to turn your AI into a world-class designer", Lenny's Newsletter.)

## Before the first round (once)
Build a small moodboard in `design/moodboard/`: 4 screenshots of professional work at the quality bar you want (for example a Linear page, a Raycast screen, a game HUD from Mobbin, a Craft example). These are a baseline, not something to copy.

## Round step 1: builder captures (paste into the builder conversation)

```text
Capture full-window screenshots of [screen names] at 1440x900 and 390x844 using the browser, in the main states (default, loading, success). Save them to design/critic/round-[n]/. Do not change any code yet.
```

## Round step 2: critic judges (paste into a NEW conversation, Carbon, attach the images)

Attach the 4 moodboard images plus 1 screenshot of ours, in random order. Use this exact prompt every round, unchanged:

```text
You are a design critic at a top product design studio. Below are 5 screens. Four are professional references, one is a product in progress.

1. Rank all 5 by polish and taste level, best first, with one line of reasoning each.
2. For the product in progress (screen [letter]): describe the aesthetic it is going for, then imagine how a top studio would execute that exact aesthetic.
3. List the biggest gaps between the two, most important first. Think about overall structure and composition AND fine details (spacing, alignment, type rhythm, contrast, motion cues, copy).
4. Call out anything that feels overdone, excessive or obviously AI-generated (glows, gradients without purpose, random highlight colours, extra labels, decorative containers, generic layouts) and penalise it.
5. Score it out of 10 for closeness to studio quality.

Be bold and opinionated. Give tight, specific feedback, not vague prose. Do not suggest copying the references.
```

Do NOT tell the critic the target score. Keep it objective.

## Round step 3: builder fixes (paste the critique back)

```text
Here is an independent design critique: [paste]. Apply the changes that fit Design.md and the design rules. Prefer removing over adding. Keep the fixed palette and fonts. List what you changed and what you deliberately ignored, with a reason. Then capture round [n+1] screenshots.
```

## Stopping rule
- Done when the critic independently scores **9/10 or higher**.
- Run 2 rounds first and check the scores are rising. If they stall, stop and bring your own taste in (step 2 of `04-design-discover.md`), or the agent will burn tokens chasing a critic it cannot please.
- Hard cap: 3 rounds per screen per phase.
- Log scores per round in `docs/DESIGN_SCORES.md` so the trend is visible.
