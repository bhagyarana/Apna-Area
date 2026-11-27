# Prompt Log (`docs/PROMPT_LOG.md`)

Tracks prompts that worked well or failed during build and design discovery, along with the model used.

| Date | Stage / Feature | Model | Outcome | Prompt / Notes |
|---|---|---|---|---|
| 2026-11-27 | `01-kickoff-architect` | Gemini 4 Carbon (High) | Worked | Locked SAFE-only hackathon architecture, 6-checkpoint 12-hour plan, and verified API boundaries before writing docs. |
| 2026-11-27 | `04-design-discover` | Gemini 4 Carbon (High) | Worked | Generated 3 CSPRNG-seeded HTML game-layer variations (`design/discover/variation-1..3.html`). Locked Variation 1 ("Smoked-Acrylic Fare-Meter & Cinema Ribbon"): smoked `#19132E` clusters, subtle yellow flag-drop pill, tabular Anton odometer XP, and 3-tier trilingual cinema caption ribbon. |
| 2026-11-27 | `P2 Director (first draft)` | `gemini-4-neon` (`medium`) | Slow (`>14s`) | Unconstrained prose length across 5 missions produced `1,188` output tokens + `742` thought tokens (`~15.4s`), hitting the initial `14s` timeout. |
| 2026-11-27 | `P2 Director (tuned concise)` | `gemini-4-neon` (`medium`) | Worked | Added `<= 12 words per field`, capped `maxPromptCandidates = 15` and `successCriteria` `maxItems = 2`, and set `worldDirector` timeout to `20s`, cutting output tokens in half while passing `verifyWeekPlan` cleanly on first pass. |
| 2026-11-27 | `P3a Live NPC Persona` | `gemini-3.8-live` (`v1alpha` ephemeral) | Worked | Server-locked `buildNpcSystemInstruction` (`1 to 2 short sentences under 10s audio`, fictional category-tied character, zero exact rupee claims, `NON_BLOCKING` `give_hint` + `complete_objective`) delivered `632-823 ms` first-audio latency across all 5 ORR roles. |
| 2026-11-27 | `P3a NPC Portraits` | `gemini-nano-banana-2.1` | Worked | Stylized painterly editorial bust prompt with `#0E0A1C` indigo twilight shadows and `#FF4FA0` / `#FFD24A` rim lighting produced 10 unified gender-matched `<role>_<gender>.webp` portraits with zero text or watermarks. |
| 2026-11-27 | `P3b Hindi & Hinglish Persona` | `gemini-3.8-live` (`v1alpha` ephemeral) | Worked | Splitting `languageComfort === "hi"` (pure conversational Hindi with respectful `aap`/`ji` and `"नमस्ते!"` cue) from `"en_hi"` (conversational Hinglish with `"Namaste! Hello!"` cue) delivered `765 ms` Devanagari Hindi and `529 ms` Hinglish responses with live `complete_objective` tool calls. |
