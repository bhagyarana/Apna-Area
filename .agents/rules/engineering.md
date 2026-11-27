---
trigger: always_on
description: Engineering standards for every file in Apna Area
---

# Engineering standards

Upgraded from Google's recommended AI Studio coding guidelines. Follow all of them, always.

## Structure
- **One feature per folder, one concern per file.** Example: `server/director/`, `server/director/prompt.ts`, `server/director/schema.ts`, `server/director/verify.ts`. Files over about 250 lines are a signal to split.
- **Feature header.** Every file starts with a block comment: what the feature is, the use cases it serves, its inputs and outputs, and what it deliberately does not do.
- **TSDoc on every exported function**: purpose, params, return, errors thrown, one example when helpful.
- **Centralised config.** All model IDs, thinking levels, timeouts, limits, feature flags and copy-independent constants live in `shared/config.ts`. No magic strings elsewhere.
- **Shared types** in `shared/types.ts`. Server and web import the same types. Validate every external boundary (request bodies, model outputs) with zod.

## Reliability
- Typed results over thrown errors at feature boundaries: `{ ok: true, data } | { ok: false, error }`.
- Every network call has a timeout, one retry with jittered backoff for 429 and 503, and a fallback path defined in config.
- No silent catches. Every caught error is logged with context and either handled or surfaced to the user in plain words.
- Idempotent endpoints where possible. Same input, same cached output within a session.

## Logging (Cloud Logging friendly)
- Structured JSON logs to stdout with `severity`, `event`, `requestId`, `durationMs`.
- Log every API route call with its sanitised params at `INFO`.
- Log every Gemini call: model, config, a hash plus the first 500 characters of the prompt, token usage, latency, and the output (truncated to 2,000 characters). Strip inline audio, images and any secret.
- One `logger` module. No `console.log` in committed code.

## Testing
- Unit tests (Vitest) for every pure function: verifiers, scorers, reducers, schema parsers.
- One contract test per API route with a recorded real model response as a fixture (fixtures are for tests only, never for the shipped flow).
- One Playwright smoke test that runs the core loop against the deployed URL.
- A phase is not done until `npm run check` (typecheck + lint + test) passes.

## Git: branches, worktrees, merge, revert
- **`main` is always green and always equals what is live on Cloud Run.** Nobody commits to main directly.
- **One branch per phase step:** `phase/p1-map`, `phase/p3a-english`, `phase/p3b-hindi`. Created from the latest main, short-lived (hours, not days).
- **One branch per worker ticket, off the phase branch:** `ticket/p1-t1-verify-places`.
- **Parallel workers use separate git worktrees**, never the same folder. Two agents in one folder share one checkout and overwrite each other.
  `git worktree add ../apna-area-<ticket> -b ticket/<ticket> phase/<step>`; open that folder in its own Antigravity window or conversation.
- **Merge tickets into the phase branch** only after the review gate says PASS: `git merge --no-ff ticket/<ticket>`.
- **Merge the phase branch into main** only through the `ship-phase` skill: preview on Cloud Run first, then `--no-ff` merge, then tag (`p1-map`, `p3b-hindi`).
- **Why `--no-ff`:** each step lands as one merge commit, so one `git revert -m 1 <merge>` undoes the whole step while keeping every small commit for debugging.
- **Revert, do not rewrite:** never force-push main. Rewrite history only to remove a leaked secret, then rotate the key immediately.
- Conventional commits: `feat(director): constrain place ids to verified enum`. Commit after every green subtask.

## Definition of done (every task)
1. Matches the ticket's success criteria exactly, nothing more.
2. `npm run check` passes.
3. Feature exercised by hand or by test, evidence shown.
4. `Design.md` and the relevant `docs/` file updated.
5. No new warnings in the browser console or server logs.
