# Session Handoff (`docs/HANDOFF.md`)

## 1. Now
- **Current phase:** `phase/p6-demo-ready` (checked out cleanly from `main` after `p5-kit`)
- **Current tag:** `p5-kit` on `main` (`16ad715`, preceded by `v0.1-docs`, `p0-skeleton`, `p1-map`, `p2-director`, `p3a-english`, `p3b-hindi`, `p3c-kannada`, `p4-adaptive`)
- **Live URL & revision:** `https://apna-area-481049877093.asia-south1.run.app` (`https://apna-area-qhtgwpzhpq-el.a.run.app`, `100%` live traffic on `apna-area-00014-wav`, tag `p5-kit`)

## 2. Done This Session
- Shipped `p5-kit` (`16ad715`, `apna-area-00014-wav`):
  - `T5.1` (`54487d1`): `shared/src/kit.ts` + `POST /api/kit` (`server/src/kit/pockets.ts`, `server/src/kit/commute.ts`, `server/src/kit/summary.ts`, `server/src/routes/kit.ts`) pre-warming 4 batched Google Routes API `computeRouteMatrix` calls (`DRIVE` Monday `09:00` & `18:30` IST + `TWO_WHEELER` `09:00` IST with `TRAFFIC_AWARE`, `TRANSIT` `09:00` IST omitting `routingPreference`) in `305 ms` live, `gemini-3.5-flash-lite` spatial corridor notes (`874 ms`), and `POST /api/tts` (`server/src/kit/tts.ts`, `server/src/routes/tts.ts`, `gemini-3.8-flash-tts` `v1beta` `Sulafat` cached `24 kHz` WAV replay).
  - `T5.2` (`2831e85`): `scripts/generate-music.ts` + 4 pre-generated 30s `lyria-3-clip-preview` (`v1beta`) MP3 loops (`web/public/audio/{calm,morning,rush,evening}.mp3`, `credits.json`) + gesture-gated crossfader (`web/src/audio/ambient.ts`, `useAmbientSync.ts`, `AmbientMuteButton.tsx`).
  - `T5.3` (`bbeddc6`, `509430c`): `SurvivalKit.tsx` (`"YOU'RE READY FOR MONDAY."` bounded 3-column desktop / 3-tab mobile bento), `CommuteCard.tsx`, `PhrasebookCard.tsx`, `ChecklistCard.tsx`, `exportKitPng.ts`, `@ui-sdk/react/alert-dialog` `ConfirmSheet.tsx`, `e2e/confirm-sheet.spec.ts` (`6/6` E2E green), Code Review Gate `PASS` (`97/100`), and 3-round Design Critic `PASS` (`9.0/10`: `9.1` Desktop / `8.8` Mobile).

## 3. Decisions Made
- **ADR-014..017:** Concise `< 10` words Director budget + `32s` timeout; `v1alpha` (`uses: 3`) ephemeral Live tokens + lazy `@google/genai` chunk + WebP portraits; 30 polite-plural Kannada survival phrases; 5-question `gemini-decision-1` (`v1beta`) scoring + `< 0.75` steady-pace guard + 1-click player override.
- **ADR-018:** Pre-warmed 4-call Routes API `computeRouteMatrix` (`TRANSIT` without `routingPreference`), chart-repetition-blocking Flash-Lite spatial verifier, curated-ID-only `gemini-3.8-flash-tts` WAV cache, build-time `lyria-3-clip-preview` (`v1beta`) MP3 loops, and mandatory `ConfirmSheet` exit gating.

## 4. Open Questions
- Awaiting user approval on the Phase 6 (`phase/p6-demo-ready`, `T6.1`..`T6.3`) hardening, demo rehearsal, and submission pack plan.

## 5. Known Issues
- None; `16/16` Vitest suites (`54/54` tests) and `6/6` Playwright E2E specs pass with zero warnings and all `126/126` `.ts/.tsx/.css` files `<= 250` lines.

## 6. File State
- Clean working tree on branch `phase/p6-demo-ready` off `main`.

## 7. The Single Next Task
- Build and ship **Phase 6 (`phase/p6-demo-ready` -> `p6-demo-ready` & `p7-submission`, `T6.1`..`T6.3`)**: run 2nd Carbon adversarial review + complete empty/loading/error/offline states + bundle budget `< 250 KB` gzip initial JS (`T6.1`), full subtraction/a11y keyboard sweep + `?demo=1` presenter timer + 3 clean sub-3-minute live rehearsals (`T6.2`), and submission pack (`README.md`, `docs/ARCHITECTURE_OVERVIEW.md`, `docs/VIDEO_COVERAGE.md`, `gitleaks` full-history scan -> `p7-submission`, `T6.3`).

## 8. Resume Checklist
1. `AGENTS.md`
2. `PROJECT_BRIEF.md`
3. `docs/HANDOFF.md`
4. `docs/TASKS.md`
5. `Design.md`
6. `.agents/rules/gemini-models.md`
