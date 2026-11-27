---
trigger: model_decision
description: Read before writing or changing any code that calls Gemini, the Live API, the Decisions API, Lyria, Nano Banana or Maps grounding
---

# Gemini usage rules

Source: "Build with Gemini 4: hackathon builder guide" (November 2026).

## Verified model IDs (copy into `shared/config.ts`, import from there only)
```ts
export const MODEL_IDS = {
  frontierDeep: "gemini-4-carbon",
  frontierFast: "gemini-4-neon",
  fastWorkhorse: "gemini-4-hydrogen",
  textFastLite: "gemini-3.5-flash-lite",
  decisions: "gemini-decision-1",          // v1beta client
  liveVoice: "gemini-3.8-live",
  ttsStudio: "gemini-3.8-flash-tts",
  imageDefault: "gemini-nano-banana-2.1",
  musicLoop: "lyria-3-clip-preview",
  musicSong: "lyria-3.5",
} as const;
```

## Always
- Check exact SDK syntax with the `gemini-api-dev` / `gemini-live-api-dev` skills or the Gemini docs MCP before writing a call. If the skill and your memory disagree, the skill wins.
- Use the stable client for model calls and the `v1beta` client for the Decisions API and Managed Agents.
- Use native structured outputs (response schema) and native tools. Constrain enums (for example, `place_id`) in the schema itself.
- Check `confidence` on every Decisions answer. Below 0.75, escalate: ask the player a clarifying question or fall back to the safe default in config.
- Multiple-choice keys sort alphabetically; always include an explicit `other` key.
- Retry 429 and 503 once with backoff, then use the fallback model from config and log it.

## Never (from the guide's boundaries)
- Never pass custom temperature, top-p, top-k or legacy thinking-budget fields to Gemini 4 models.
- Never pass `minimal` thinking to Neon or Hydrogen. Valid levels: `low`, `medium`, `high` (default), `xhigh`.
- Never call manual context-caching endpoints on Gemini 4 models; implicit caching handles prompts over 4,096 tokens.
- Never ask a model to write raw JSON tool calls in plain text.
- Never ship mocked responses, exposed keys or unverified financial, legal or medical claims.

## Live API specifics
- Kannada (`kn`), Hindi (`hi`) and English are supported by the audio-generating Live models. Set the NPC's primary language in its system instruction and let it code-switch when the player does.
- Input audio: 16-bit PCM, 16 kHz, little-endian. Output audio: 16-bit PCM, 24 kHz.
- Enable input and output transcription for captions and scoring.
- The browser never holds `GEMINI_API_KEY`. Mint a short-lived ephemeral token on the server (`POST /api/live-token`). If ephemeral tokens are not available for this model, proxy the WebSocket through the server instead. Confirm with the `gemini-live-api-dev` skill.
- Cap sessions at 90 seconds and end cleanly with a summary tool call.
