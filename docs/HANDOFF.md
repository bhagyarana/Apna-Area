# Session Handoff (`docs/HANDOFF.md`)

## 1. Now
- **Current phase:** `phase/p4-adaptive` (ready at Cloud Run `--no-traffic --tag p4-adap` preview checkpoint awaiting `"merge"` confirmation)
- **Current tag on `main`:** `p3c-kannada` (preceded by `v0.1-docs`, `p0-skeleton`, `p1-map`, `p2-director`, `p3a-english`, `p3b-hindi`)
- **Live URL & revision:** `https://apna-area-481049877093.asia-south1.run.app` (`100%` live traffic on `apna-area-00010-puy`, tag `p3c-kan`; preview tag `p4-adap` staged with `0%` live traffic)

## 2. Done This Session
- Built and verified **Phase 4 (`phase/p4-adaptive` · Gemini Decision 1 Adaptive Scoring & XP HUD)**:
  - **`T4.1` (`239f586`):** Enabled `DEFAULT_FEATURE_FLAGS.enableAdaptiveScoring = true` in `shared/src/config.ts`, implemented Zod contracts and pure `xpFor`, `starsFor`, `resolveEffectiveRoute`, `nextDifficulty`, `applyDifficultyOverride`, and `buildAdaptationSummary` in `shared/src/game/scoring.ts` (clamped by `ENABLED_LANGUAGES` and `< 0.75` / `"other"` -> `"keep_level"`), with 100% branch tests in `shared/src/__tests__/scoring.test.ts`.
  - **`T4.2` (`7f91717`):** Shipped `POST /api/score` (`server/src/score/questions.ts`, `server/src/score/decide.ts`, `server/src/routes/score.ts`) calling `gemini-decision-1` (`v1beta` `client.decisions.create`) across `noul`, 3 `score` rubrics, and sorted `choice` + `other` (`389-519 ms` live latency, `0` output tokens), with `4s` timeout, 1 retry on `429`/`503`, heuristic fallback, `30/min` IP rate limit, transcript-redacted `log.logGeminiCall`, and recorded live fixture `server/src/__tests__/fixtures/decision-1-score.json`.
  - **`T4.3`:** Shipped `XpCounter.tsx` (`Anton` zero-padded tabular odometer with dimmed leading zeros + cumulative `★ N`), `MissionResultCard.tsx` (`280ms` rolling XP, `200ms` spring stars, plain-English adaptation copy), `WhyChangedDisclosure.tsx` (2x2 calibrated rubric bars + 1-click player overrides `Keep gentler pace` / `Step up Kannada anyway`), `useAdaptiveProgress.ts`, `appendDraftTurns` voice-completion flush, and `e2e/score.spec.ts`.
  - Passed Code Review Gate (`97/100`, 0 blocking issues) and independent Screenshot Design Critic (`9.2/10` overall: `9.5/10` Desktop, `9.0/10` Mobile).

## 3. Decisions Made
- **ADR-014:** Director `< 10 words` field budget, `32s` upstream timeout, and shared `FallbackPlansMapSchema`.
- **ADR-015:** `v1alpha` (`uses: 3`) ephemeral tokens for `@google/genai@3.6.1`, lazy `@google/genai` chunk, and `256x256` WebP portraits.
- **ADR-016:** 30 speaker-gender-neutral, polite-plural Kannada phrases matched by `PhraseSituation` and `honorificGender`.
- **ADR-017:** 5-question `gemini-decision-1` (`v1beta`) scoring pass (`389-519 ms`, `0` output tokens), 3-decimal floor truncation before `< 0.75` steady-pace guard, transcript-redacted logging, and 1-click player pace override.

## 4. Open Questions
- Waiting for user `"merge"` confirmation after smoke-testing the `p4-adap` Cloud Run preview URL.

## 5. Known Issues
- None; `13/13` Vitest suites (`45/45` tests) and `5/5` Playwright E2E specs pass with zero warnings and all `94/94` `.ts/.tsx/.css` files `<= 250` lines.

## 6. File State
- Clean commits on `phase/p4-adaptive`, pushed to `origin/phase/p4-adaptive` and deployed to Cloud Run preview tag `p4-adap` (`--no-traffic`).

## 7. The Single Next Task
- Upon user `"merge"` confirmation: merge `phase/p4-adaptive` `--no-ff` into `main`, tag `p4-adaptive`, shift `100%` Cloud Run traffic to `p4-adap`, record revision in `docs/HANDOFF.md`, and branch `phase/p5-kit` for Phase 5 (Survival Kit, Routes API commutes, TTS phrase replay, Lyria music, and Confirm Sheets).

## 8. Resume Checklist
1. `AGENTS.md`
2. `PROJECT_BRIEF.md`
3. `docs/HANDOFF.md`
4. `docs/TASKS.md`
5. `Design.md`
6. `.agents/rules/gemini-models.md`
