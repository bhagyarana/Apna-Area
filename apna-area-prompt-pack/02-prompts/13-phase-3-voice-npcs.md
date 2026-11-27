# 13 · Phase 3: voice NPCs, one language at a time

**Goal:** tap a mission, talk to the NPC out loud, see captions, finish the objective in under 90 seconds. Languages ship in three separate steps so any step can be reverted without touching the others:

| Step | Branch | Adds | Revert by |
|---|---|---|---|
| **P3a English** | `phase/p3a-english` | The whole voice pipeline, all NPCs in English | Previous tag `p2-director` |
| **P3b Hindi** | `phase/p3b-hindi` | NPCs understand and answer Hindi, code-switch with English | `ENABLED_LANGUAGES = ["en"]` or revert the merge |
| **P3c Kannada** | `phase/p3c-kannada` | Kannada-first NPCs, phrase teaching, Kannada captions | `ENABLED_LANGUAGES = ["en", "hi"]` or revert the merge |

`ENABLED_LANGUAGES` in `shared/config.ts` is the instant off switch. Reverting the merge is the clean one. Do not start the next step until the previous one is merged to main, tagged and live.

**Where:** Antigravity. Lead on Neon (Carbon for the P3a plan, it is the riskiest step). Audio plumbing and persona builder run as parallel workers in their own worktrees.
**Time:** P3a 90 min, P3b 30 min, P3c 45 min. **Tags:** `p3a-english`, `p3b-hindi`, `p3c-kannada`.

## P3a English: paste into the lead conversation

```text
Phase 3a. One goal: a reliable, low-latency English voice conversation with one NPC per mission, with captions and tool calls that report progress. Languages other than English are out of scope for this step.

Branch: create phase/p3a-english from main. Workers branch from it in their own worktrees (see .agents/rules/engineering.md, Git).

Read first: @PROJECT_BRIEF.md @docs/MODELS.md @docs/ARCHITECTURE.md @Design.md @.agents/rules/gemini-models.md @.agents/rules/security-and-control.md
Use the gemini-live-api-dev skill for every Live API detail: model, connection, ephemeral tokens, audio formats, transcription, tools. Do not rely on memory.

Plan first (goal, assumptions, NOT touching, tickets), then wait for "go". Start with a 20-minute proof that one round trip of audio works with MODEL_IDS.liveVoice before building UI.

T3.1 server/live/token.ts: POST /api/live-token mints a short-lived ephemeral token bound to the live model and session config. If ephemeral tokens are not supported, proxy the WebSocket through the server instead and record the decision. The API key never reaches the browser.
T3.2 web/live/: mic capture with an AudioWorklet resampling to 16 kHz 16-bit PCM, playback of 24 kHz PCM with a small jitter buffer, barge-in, clean teardown. One hook: useLiveSession(personaConfig).
T3.3 server/live/persona.ts: build the NPC system instruction from the mission and the persona schema in MODELS.md. Each NPC is a fictional person tied to a place type, warm, a little funny, patient. The persona takes a `languages` list from config and a `primaryLanguage`; for this step both are English. Never mention real employees, prices as facts, or anything negative about the real business.
T3.4 Native tools: give_hint({ level }), complete_objective({ summary }), and mark_phrase_attempt({ phraseId, attempted, quality }) declared but only registered when a phrase is active (P3c). The UI reacts to each tool call.
T3.5 Mission screen: big mic button with live waveform, caption lines for NPC and player, a 90-second soft timer, hint button, end button. The caption component takes an optional script line, transliteration and meaning so P3c only adds data, not layout.
T3.5b scripts/generate-portraits.ts: one portrait per NPC role with MODEL_IDS.imageDefault (Nano Banana), original fictional characters in the art direction from Design.md, consistent style, saved to web/public/art/npcs/ and committed. Run once at build time.
T3.6 shared/config.ts: ENABLED_LANGUAGES = ["en"]. Every language decision reads from it.
T3.7 Tests: unit tests for resampling and persona building; a manual voice test script in docs/TESTING.md with results.
T3.8 Ship with the ship-phase skill (preview URL first, then merge, tag p3a-english).

Done when: on the live URL, with a laptop mic in a normal room, all five NPCs respond in English within about one second, captions appear, complete_objective ends the session, and the mission screen scores 9/10 in the design critic loop (02-prompts/28).
```

## P3b Hindi: paste into a fresh lead conversation (after P3a is live)

```text
Phase 3b. One goal: NPCs understand and answer Hindi, and switch naturally between Hindi and English when the player does. Nothing else changes.

Branch: phase/p3b-hindi from main (which now has p3a-english).
Read: @docs/HANDOFF.md @server/live/persona.ts @shared/config.ts @.agents/rules/gemini-models.md

T3b.1 Set ENABLED_LANGUAGES = ["en", "hi"]. Persona: the PG owner and transit helper may lead in Hindi; everyone follows the player's language. Add a "Language comfort" option on the start screen (English, Hindi, both).
T3b.2 Captions render Devanagari correctly with the right font fallback.
T3b.3 Test script: each NPC in Hindi only, English only, and mixed. Record results in docs/TESTING.md.
T3b.4 Ship with the ship-phase skill, tag p3b-hindi.

Done when: all five NPCs hold a natural Hindi conversation and code-switch on the live URL, and English-only play is unchanged.
If Hindi quality is poor: set ENABLED_LANGUAGES back to ["en"], note it in DECISIONS.md, and move on.
```

## P3c Kannada: paste into a fresh lead conversation (after P3b is live)

```text
Phase 3c. One goal: Kannada-first NPCs that teach one survival phrase per mission and wait for the player to try it.

Branch: phase/p3c-kannada from main (which now has p3b-hindi).
Read: @docs/HANDOFF.md @server/live/persona.ts @server/world/director.ts @shared/config.ts @Design.md @.agents/rules/gemini-models.md

T3c.1 data/phrases.json: 30 survival phrases for a newcomer on ORR, keyed by the phraseSituation values the Director already outputs (greeting, ordering at a darshini, auto meter, directions, renting a room, thanks, polite refusal). Each: id, situation, kannada script, transliteration, english meaning, hindi meaning, register. Draft with Neon, have Carbon review every line, mark the file "AI reviewed, spot-check with a local", and ask a local mentor to check 10 lines.
T3c.2 Set ENABLED_LANGUAGES = ["en", "hi", "kn"]. Persona: the auto driver and darshini owner lead in Kannada and fall back to the player's language when they are stuck. Register mark_phrase_attempt when the mission has a phrase.
T3c.3 Captions show Kannada script, transliteration and meaning. The phrase card flies into the phrasebook on a clear attempt, with a teal pulse and soft chime.
T3c.4 Test script: each Kannada-led NPC with a beginner who only knows the taught phrase. Record results.
T3c.5 Ship with the ship-phase skill, tag p3c-kannada.

Done when: on the live URL a Hindi and English speaker can complete every mission, learn and say five Kannada phrases, and the phrasebook fills.
If Kannada quality is poor: set ENABLED_LANGUAGES back to ["en", "hi"] (or revert the merge), note it in DECISIONS.md, and keep going. The demo still works.
```

## Watch for
- Venue noise: add a push-to-talk fallback toggle if voice activity detection struggles.
- Test with and without headphones. Echo cancellation must be on in getUserMedia.

## Next
`14-phase-4-adaptive.md`
