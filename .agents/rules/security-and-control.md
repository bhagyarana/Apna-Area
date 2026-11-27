---
trigger: always_on
description: Secrets, privacy, human-in-control and budget rules
---

# Security, privacy and control

## Secrets
- `GEMINI_API_KEY` lives in Secret Manager and reaches Cloud Run as an env var. Locally it lives in `.env.local`, which is gitignored before the first commit.
- The Maps browser key is restricted by HTTP referrer (localhost and the Cloud Run URL) and API (Maps JavaScript, Places, Routes). It is served from `/api/config`, never committed.
- Dev-only keys the agent needs while building (for example image generation in scripts) go in a gitignored `.env.agents`, never in code or the product. Note in `AGENTS.md` that these are for development only.
- Run `npx gitleaks detect` (or `git log -p | grep -i "AIza"`) before every push. A leaked key means: delete it in AI Studio, create a new one, update the secret. A new commit does not remove it from history.

## Human in control
- Anything that leaves the app opens a confirm sheet first: what will happen, where it goes, a clear "Cancel". Applies to opening Google Maps, sharing, downloading.
- No bookings, payments, messages to real businesses or calls. Ever.

## Privacy
- Never request geolocation. The player chooses an office from a list.
- No audio is stored on the server. Transcripts stay in browser memory and disappear on reload unless the player saves the kit.
- Logs never contain audio, full transcripts or keys.

## Budget
- Rate-limit `/api/*` per IP (for example 30 requests per minute) and cap Live sessions at 90 seconds.
- Cache Director output per office and session. Pre-generate music loops with a script, never per visitor.
- Check spend at aistudio.google.com/spend after each phase.
