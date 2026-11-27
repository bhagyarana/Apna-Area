# 10 · Phase 0: skeleton that deploys

**Goal:** a themed empty app running on a public Cloud Run URL. Prove the pipeline before building anything fragile on top of it.
**Where:** Antigravity. Lead conversation on Neon; tickets T0.2 and T0.3 can run as parallel Hydrogen workers (see `20-orchestrator.md`).
**Time:** 60 to 75 minutes. **Tag:** `p0-skeleton`.

## Paste this into the lead conversation

```text
Phase 0. One goal: a themed, empty Apna Area shell deployed on Cloud Run with a passing smoke test. No features.

Branch: create phase/p0-skeleton from main. Parallel workers use their own worktrees (see .agents/rules/engineering.md, Git).

Read first: @AGENTS.md @PROJECT_BRIEF.md @docs/ARCHITECTURE.md @Design.md @docs/TASKS.md

Before coding: restate the goal, list assumptions, list what you will NOT touch, then show the ticket plan below adjusted to the docs. Wait for "go".

Tickets:
T0.0 First commit on main: .gitignore and the copied agent files only. Then branch phase/p0-skeleton.
T0.1 Monorepo: npm workspaces web/, server/, shared/. TypeScript strict everywhere. Root scripts: dev (web and server together), build, check (typecheck, lint, test), start. ESLint and Prettier with zero warnings.
T0.2 shared/: config.ts with MODEL_IDS exactly as in .agents/rules/gemini-models.md plus timeouts, limits, ORR bounding box and feature flags. types.ts with the core types from ARCHITECTURE.md. logger.ts (structured JSON, severity, requestId).
T0.3 server/: Fastify app, GET /api/health returns { ok, version, commit }, GET /api/config returns { mapsBrowserKey, featureFlags }. Serves web/dist with SPA fallback. Per-IP rate limit. Request logging with requestId. Reads PORT, defaults 8080.
T0.4 web/: Vite React app. Design tokens from Design.md as CSS variables. Fonts Anton and Hanken Grotesk. One screen: the dark background, the Apna Area wordmark, and the line "Play your first week before it happens." Calls /api/health and shows a tiny status dot. Respects prefers-reduced-motion.
T0.5 Dockerfile: multi-stage (deps, build, runtime on node:22-slim), non-root user, only production deps in the final image, EXPOSE 8080. .dockerignore.
T0.6 Tests: one Vitest unit test per shared module, one server route test, and a Playwright smoke test (playwright.live.config.ts) that loads BASE_URL and asserts the wordmark and a green health dot.
T0.7 Ship: run the ship-phase skill. After deploy, tell me the URL so I can add it to the Maps key referrers.

Constraints: no feature code, no Gemini calls yet, no extra libraries beyond what the tickets need. Commit after every green ticket.
Done when: the public URL shows the themed shell, /api/health returns ok, the smoke test passes against the URL, tag p0-skeleton is pushed.
```

## Raise the bar (only if all green with time left)
- Add `/api/health` build metadata (commit hash, build time) shown on hover over the status dot. Judges love seeing the live commit.

## Next
`11-phase-1-map.md`
