# 04 · Design Discover: find a direction nobody else will have

**Use when:** after the docs, before Stitch. Once per project, plus once more for any hero screen that still feels generic.
**Where:** a fresh Antigravity conversation for steps 1 to 3; your own eyes in between.
**Model:** Gemini 4 Carbon for ideas and critique (bigger models have wider taste); Neon writes the final build prompt.
**Time:** 30 minutes.

**Why:** models default to the most predictable choice at every step, which is where "AI slop" comes from. Variety has to come from outside the model: a random seed and, above all, your own taste reacting to options. (Technique 1 and 2 from "How to turn your AI into a world-class designer", Lenny's Newsletter.)

**Fixed, not up for exploration:** the palette, type and Vice City dusk mood in `.agents/rules/design.md`. Explore composition, layout, game-layer metaphors, materials and motion inside those tokens.

## Step 1: go broad (paste)

```text
I want a bold, unique design language for the GAME LAYER of Apna Area: the HUD, mission cards, the voice-conversation screen and the Survival Kit. The palette, fonts and dusk mood in @.agents/rules/design.md are fixed. Everything else is open.

List as many directions as you can, 3 to 8 words each, intentionally light on detail. Go broad, not deep. Mix sources: video games, Bengaluru street life (auto meters, darshini menu boards, BMTC tickets, hand-painted signage), physical objects, film, print, architecture. At least 20.
```

## Step 2: react with your taste (you, 5 minutes)

Pick 2 or 3 that make you feel something. For each, write 3 to 5 honest reactions: what you imagine, what feels tacky, what to avoid, what to add. Example:

```text
Auto-meter HUD:
- I like the idea of the HUD feeling like a real auto meter: mechanical digits, a flag that drops when a mission starts.
- Avoid cartoon or retro skeuomorphism, it feels cheap.
- Keep components consistent and let small touches carry the theme.
- Flat black panels are boring. Give the surfaces texture while staying inside the palette.
Can you sharpen this one based on my tastes?
```

Iterate until a direction feels like it could only be yours.

## Step 3: seeded variations of the winner (paste)

```text
Take the direction we just sharpened and design 3 variations of the mission card and HUD.

For each variation:
1. Generate a long random alphanumeric string with a shell command (for example: head -c 48 /dev/urandom | base64).
2. Derive composition, layout, density, corner treatment, motion personality and one signature detail from the string. Look beyond the surface for subpatterns and special numbers that inspire you. Do not change the fixed palette or fonts.
3. Use your judgment to make it look great. Never reveal the string in the design.

Show the 3 as static HTML mockups in design/discover/, each one file, then describe each in 2 lines.
```

## Step 4: write the build prompt (paste, after you pick)

```text
I pick variation [n] with these tweaks: [your notes].
Write a concise design spec section for Design.md (tokens used, components, signature details, motion, what to avoid) and a short prompt an agent can use to build it. Save the spec into Design.md under "Game layer direction" and the prompt into docs/PROMPT_LOG.md.
```

## Rules of thumb
- If you think "there is no way this works", try it anyway. Throw it away if it fails.
- Log prompts that did NOT work in `docs/PROMPT_LOG.md`; retry them when a newer model ships.

## Next
`05-stitch-design.md`, now fed with the chosen direction.
