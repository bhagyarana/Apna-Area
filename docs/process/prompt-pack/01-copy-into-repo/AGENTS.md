# AGENTS.md

You are working on **Apna Area**, a voice-first game that turns Bengaluru's Outer Ring Road into a playable city for someone about to move there. Built for the Gemini 4 Sprints hackathon. Judges score live working software.

## Read first, every session
1. `PROJECT_BRIEF.md`: what we build, for whom, and the truth and safety rules.
2. `docs/HANDOFF.md`: where the last session stopped and the single next task.
3. `docs/TASKS.md`: the phase board. Work only on the current phase.

## How we work
- **Plan, then build.** Restate the goal, list assumptions, list what you will NOT touch, then produce a short plan. Wait for approval on anything that touches more than 3 files.
- **One goal per task.** Small, verifiable steps. Never expand scope silently. New ideas go to the "Later" list in `docs/TASKS.md`.
- **Verify every step.** Typecheck, lint, tests, and run the feature. Show the evidence (command output, screenshot, URL).
- **Ship every phase.** Use the `ship-phase` skill: tests green, commit, tag, deploy to Cloud Run, smoke test the live URL, update `docs/HANDOFF.md`.
- **Branches, not main.** Work on `phase/<step>` branches; parallel workers use their own git worktrees. main only changes through the `ship-phase` skill and always equals the live site.
- **Never break main.** If something breaks, revert the merge or switch traffic back before trying clever fixes.
- **Ask when unsure.** A short question beats a confident wrong build.

## Where things live
- `web/` React app, `server/` Fastify API, `shared/` types and `config.ts` (all model IDs and tunables), `data/orr/` verified world data, `scripts/` one-off tools, `docs/` living documentation, `Design.md` feature-level design record.

## Hard rules
- Model IDs only from `shared/config.ts`. Check SDK syntax with the Gemini skills or docs MCP before writing calls.
- Never reference a place that is not in `data/orr/places.json`.
- Never commit secrets. Never put `GEMINI_API_KEY` in the browser.
- Never ship mocked responses as the default path.
- No em dashes in UI copy or docs. Plain, specific, friendly words.
