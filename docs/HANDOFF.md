# Session Handoff (`docs/HANDOFF.md`)

## 1. Now
- **Current phase:** Phase 0 (`phase/p0-skeleton`, `T0.1` through `T0.5` green locally; ready for `T0.6` Cloud Run deploy)
- **Current tag:** `v0.1-docs` on `main` (`p0-skeleton` tags right after Cloud Run deploy)
- **Live URL & revision:** Local production server verified on `http://127.0.0.1:8080`; Cloud Run deploy ready as soon as `gcloud` CLI is authenticated on `PATH`.

## 2. Done This Session
- Completed `04-design-discover`: created 3 CSPRNG-seeded HTML mockups in `design/discover/variation-1..3.html`, locked Variation 1 ("Smoked-Acrylic Fare-Meter & Cinema Ribbon") into `Design.md`, and merged `phase/design-discover` to `main`.
- Built `T0.1` strict TypeScript npm-workspaces monorepo (`package.json`, `tsconfig.base.json`, `eslint.config.js`, `vitest.config.ts`).
- Built `T0.2` `@apna-area/shared` (`config.ts`, `types.ts`, isomorphic Cloud Logging `logger.ts` with transcript/audio/key redaction, and 3 Vitest suites).
- Built `T0.3` `@apna-area/server` Fastify API (`GET /api/health` with commit/build metadata, `GET /api/config`, `trustProxy: true`, 60/min rate limiter with 404 bot guard, SPA static fallback, and contract tests).
- Built `T0.4` `@apna-area/web` Vite 7 + React 19 ORR Neon Dusk shell (`83.4 kB` gzipped, `HealthBadge` with hover/focus commit popover, reduced-motion support).
- Built `T0.5` multi-stage non-root `Dockerfile` (`node:22-slim`) and `e2e/smoke.spec.ts` (`1 passed` on Chromium with zero console warnings/errors).

## 3. Decisions Made
- Locked Game Layer Direction in `Design.md` Section 3 to "Smoked-Acrylic Fare-Meter & Cinema Ribbon".
- Made `shared/src/logger.ts` 100% isomorphic (dual 32-bit FNV-1a hex fingerprint, guarded `stdout` sink) so `@apna-area/shared` bundles cleanly in both Vite browser builds and Node 22+ servers.

## 4. Open Questions
- **Cloud Run Deploy (`T0.6`):** Need `gcloud` CLI installed/added to Windows `PATH`, authenticated (`gcloud auth login`), project set, and `gemini-api-key` + `maps-browser-key` created in Secret Manager (plus `.env.local` for `P1` `scripts/verify-places.ts`).

## 5. Known Issues
- `gcloud` and `docker` are not currently on Windows `PATH`. Local `npm run check` (`11/11` Vitest tests, `0` ESLint warnings, `0` TypeScript errors) and `npm run test:smoke` (`1/1` Playwright Chromium) are 100% green.

## 6. File State
- All `T0.1`..`T0.5` files committed cleanly on branch `phase/p0-skeleton`.

## 7. The Single Next Task
- Run `T0.6` (`ship-phase` first Cloud Run deploy to `asia-south1`, smoke test the live Cloud Run URL, `--no-ff` merge `phase/p0-skeleton` to `main`, tag `p0-skeleton`), or proceed to `P1` (`T1.2`/`T1.3` ORR Map & Office Picker) once `.env.local` Maps keys are set.

## 8. Resume Checklist
1. `AGENTS.md`
2. `PROJECT_BRIEF.md`
3. `docs/HANDOFF.md`
4. `docs/TASKS.md`
5. `Design.md`
